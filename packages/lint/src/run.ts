import { exec } from "node:child_process";
import type { LintTool } from "./config";
import {
  LintError,
  createLintArtifact,
  type LintArtifact,
  type LintFileResult
} from "./format";
import { normalizeEslintJson, normalizeOxlintJson } from "./normalize";

/**
 * Lanzar las herramientas del lint (ADR 0094).
 *
 * Cada herramienta es un proceso: se lanzan en paralelo y se espera a todas.
 * Falla de forma blanda —una herramienta que revienta no impide medir las
 * demás— porque el artefacto es lo que se busca, no el código de salida del
 * linter. El artefacto sale solo con lo que sí se midió.
 */

/** Lo que devolvió un proceso. */
export interface LintProcessOutput {
  stdout: string;
  stderr: string;
  code: number;
}

/** Cómo se lanza un comando. Se puede cambiar en tests y en otras plataformas. */
export type LintProcessRunner = (
  command: string,
  root: string,
  timeoutMs: number
) => Promise<LintProcessOutput>;

/** La pasada de una herramienta, tal y como se cuenta en la consola. */
export interface LintToolRun {
  name: string;
  ok: boolean;
  /** Código de salida, si el proceso llegó a terminar. */
  code?: number;
  /** Ficheros con mensajes que aportó. */
  files: number;
  /** Mensajes que aportó. */
  messages: number;
  /** Por qué no midió, cuando no midió. */
  error?: string;
}

export interface LintRunResult {
  /**
   * El artefacto con lo medido, o `null` si ninguna herramienta respondió.
   * Un artefacto vacío significaría «medido y limpio», que es otra cosa.
   */
  artifact: LintArtifact | null;
  runs: LintToolRun[];
}

export interface LintRunOptions {
  /** La raíz del repo: los comandos corren ahí y las rutas se relativizan a ella. */
  root: string;
  tools: readonly LintTool[];
  /** Por defecto, un proceso por herramienta. */
  run?: LintProcessRunner;
  /** Tope por herramienta; por defecto, dos minutos. */
  timeoutMs?: number;
}

export async function runLint(options: LintRunOptions): Promise<LintRunResult> {
  const run = options.run ?? execCommand;
  const timeoutMs = options.timeoutMs ?? 120_000;

  const results = await Promise.all(
    options.tools.map((tool) => runTool(tool, options.root, run, timeoutMs))
  );

  const measured = results.filter((result) => result.run.ok);
  const artifact =
    measured.length === 0
      ? null
      : createLintArtifact({
          tools: measured.map((result) => result.run.name),
          files: measured.flatMap((result) => result.files)
        });

  return {
    artifact,
    runs: results.map((result) => result.run)
  };
}

interface ToolResult {
  run: LintToolRun;
  files: LintFileResult[];
}

async function runTool(
  tool: LintTool,
  root: string,
  run: LintProcessRunner,
  timeoutMs: number
): Promise<ToolResult> {
  const failed = (error: string, code?: number): ToolResult => ({
    run: { name: tool.name, ok: false, ...(code !== undefined ? { code } : {}), files: 0, messages: 0, error },
    files: []
  });

  let output: LintProcessOutput;
  try {
    output = await run(tool.command, root, timeoutMs);
  } catch (error) {
    return failed((error as Error).message);
  }

  // Un linter con hallazgos sale con código distinto de cero: eso no es un
  // fallo si dejó su JSON. Solo importa si no hay JSON que leer.
  let files: LintFileResult[];
  try {
    files = normalizeOutput(tool, output.stdout, root);
  } catch (error) {
    const reason = error instanceof LintError ? error.message : String(error);
    const hint = firstLine(output.stderr);
    return failed(hint ? `${reason} (${hint})` : reason, output.code);
  }

  return {
    run: {
      name: tool.name,
      ok: true,
      code: output.code,
      files: files.filter((file) => file.messages.length > 0).length,
      messages: files.reduce((total, file) => total + file.messages.length, 0)
    },
    files
  };
}

/** El dialecto que declaró la herramienta, aplicado a lo que escribió. */
function normalizeOutput(
  tool: LintTool,
  stdout: string,
  root: string
): LintFileResult[] {
  const text = stdout.replace(/^\uFEFF/, "").trim();
  if (!text) throw new LintError("no escribió JSON en la salida");

  const raw = parseJsonOutput(text);

  // Las rutas de ESLint suelen ser absolutas: sin la raíz no entran.
  return tool.format === "eslint-json"
    ? normalizeEslintJson(raw, { root })
    : normalizeOxlintJson(raw, { root });
}

/** El comando por defecto: un proceso, con la raíz del repo como cwd. */
function execCommand(
  command: string,
  root: string,
  timeoutMs: number
): Promise<LintProcessOutput> {
  return new Promise((resolve, reject) => {
    exec(
      command,
      {
        cwd: root,
        timeout: timeoutMs,
        maxBuffer: 64 * 1024 * 1024,
        windowsHide: true,
        // La salida tiene que ser JSON: ningún color ni adorno de terminal.
        env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" }
      },
      (error, stdout, stderr) => {
        if (!error) {
          resolve({ stdout, stderr, code: 0 });
          return;
        }
        const code = (error as { code?: unknown }).code;
        if (typeof code === "number") {
          resolve({ stdout, stderr, code });
          return;
        }
        reject(
          new Error(
            (error as { killed?: boolean }).killed
              ? `se agotó el tiempo (${timeoutMs} ms)`
              : firstLine(error.message) || "no se pudo lanzar el comando"
          )
        );
      }
    );
  });
}

/**
 * El JSON de la salida.
 *
 * `npx` escribe sus propios avisos en stdout antes del JSON —y un linter
 * lanzado con `npx` los arrastra—, así que si el texto entero no es JSON se
 * prueba con lo que va del primer corchete al último. El JSON de las dos
 * herramientas es un valor y nada más: lo que haya alrededor es ruido.
 */
function parseJsonOutput(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.search(/[[{]/);
    const end = Math.max(text.lastIndexOf("]"), text.lastIndexOf("}"));
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        // Cae al error de abajo: no hay JSON que leer.
      }
    }
    throw new LintError("la salida no es JSON");
  }
}

function firstLine(text: string): string {
  const line = text.trim().split(/\r?\n/)[0] ?? "";
  return line.length > 200 ? `${line.slice(0, 197)}...` : line;
}
