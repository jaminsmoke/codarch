import { exec } from "node:child_process";
import type { LintTool } from "./config";
import {
  LintError,
  canonicalLintPath,
  createLintArtifact,
  type LintArtifact,
  type LintFileResult,
  type LintSystem
} from "./format";
import {
  adoptEnumeration,
  coverageFromEnumeration,
  type Reason,
  type ToolCoverage
} from "./health";
import {
  normalizeBiomeJson,
  normalizeCheckstyleXml,
  normalizeDotnetText,
  normalizeEslintJson,
  normalizeGoVetText,
  normalizeOxlintJson,
  normalizeRuffJson
} from "./normalize";

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
  /** Los sistemas que declara el proyecto, para el artefacto (ADR 0096). */
  systems?: readonly LintSystem[];
  /**
   * El checksum del snapshot que se acaba de analizar (ADR 0098).
   *
   * Lo pone quien analiza —`serve` y el live—, que es el único que sabe de qué
   * árbol habla el lint. El comando suelto no lo pasa: no analiza.
   */
  tree?: string;
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
          ...(options.systems ? { systems: options.systems } : {}),
          ...(options.tree ? { tree: options.tree } : {}),
          files: measured.flatMap((result) => result.files),
          // También las que fallaron: si no, un éxito y un fallo parecerían
          // una medida completa. `meta.tools` sigue siendo solo las que midieron.
          coverage: {
            tools: Object.fromEntries(
              results.map((result) => [result.run.name, result.coverage])
            )
          }
        });

  return {
    artifact,
    runs: results.map((result) => result.run)
  };
}

interface ToolResult {
  run: LintToolRun;
  files: LintFileResult[];
  coverage: ToolCoverage;
}

async function runTool(
  tool: LintTool,
  root: string,
  run: LintProcessRunner,
  timeoutMs: number
): Promise<ToolResult> {
  const failed = (error: string, code?: number): ToolResult => ({
    run: { name: tool.name, ok: false, ...(code !== undefined ? { code } : {}), files: 0, messages: 0, error },
    files: [],
    coverage: coverageFromEnumeration({ ok: false, reason: failureReason(error) })
  });

  let output: LintProcessOutput;
  try {
    output = await run(tool.command, root, timeoutMs);
  } catch (error) {
    return failed((error as Error).message);
  }

  // El universo, si la herramienta sabe listarlo. Se pide antes de contar los
  // hallazgos para que un fallo del listado no invente una cobertura completa
  // (ADR 0110).
  let listed: string[] | null = null;
  let listFailure: string | null = null;
  if (tool.listCommand) {
    try {
      const listing = await run(tool.listCommand, root, timeoutMs);
      listed = parsePathList(listing.stdout);
    } catch (error) {
      listFailure = firstLine((error as Error).message) || "no se pudo lanzar el listado";
    }
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

  const enumerates = tool.format === "eslint-json" || tool.format === "checkstyle-xml";
  const enumeration = adoptEnumeration(enumerates ? tool.format : tool.name, {
    ok: true,
    paths: files.map((file) => file.path)
  });

  let coverage: ToolCoverage;
  if (listed !== null) {
    // La lista es el universo y lo medido: el diagnóstico corre sobre ella.
    coverage = {
      outcome: "enumerated",
      measuredPaths: listed,
      eligiblePaths: listed
    };
  } else if (tool.exhaustive) {
    // Su salida ya trae los limpios: en una pasada a la raíz, lo devuelto es
    // el universo (ADR 0110).
    coverage = coverageFromEnumeration(
      enumeration,
      files.map((file) => file.path)
    );
  } else if (listFailure !== null) {
    coverage = {
      outcome: "unknown",
      eligiblePaths: null,
      reasons: [
        {
          code: "unknown-eligibility",
          text: `no se pudo listar los ficheros: ${listFailure}`
        }
      ]
    };
  } else {
    coverage = coverageFromEnumeration(enumeration, null);
  }

  return {
    run: {
      name: tool.name,
      ok: true,
      code: output.code,
      files: files.filter((file) => file.messages.length > 0).length,
      messages: files.reduce((total, file) => total + file.messages.length, 0)
    },
    files,
    coverage
  };
}

/** Una ruta por línea, canónica. Lo que no sea una ruta se ignora. */
function parsePathList(stdout: string): string[] {
  const paths: string[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    if (line.trim() === "") continue;
    try {
      paths.push(canonicalLintPath(line));
    } catch {
      // Un aviso de la herramienta en la lista no es una ruta.
    }
  }
  return paths;
}

function failureReason(error: string): Reason {
  const missing = /enoent|not found|no se encontró|no se encontro/i.test(error);
  return { code: missing ? "tool-missing" : "tool-failed", text: error };
}

/** El dialecto que declaró la herramienta, aplicado a lo que escribió. */
function normalizeOutput(
  tool: LintTool,
  stdout: string,
  root: string
): LintFileResult[] {
  const text = stdout.replace(/^\uFEFF/, "").trim();
  if (!text) throw new LintError("no escribió nada en la salida");

  // Checkstyle habla XML y go vet y dotnet, texto; el resto, JSON.
  if (tool.format === "checkstyle-xml") {
    return normalizeCheckstyleXml(text, { root });
  }
  if (tool.format === "govet-text") {
    return normalizeGoVetText(text, { root });
  }
  if (tool.format === "dotnet-text") {
    return normalizeDotnetText(text, { root });
  }

  const raw = parseJsonOutput(text);

  // Las rutas de ESLint y de Ruff suelen ser absolutas: sin la raíz no entran.
  if (tool.format === "eslint-json") return normalizeEslintJson(raw, { root });
  if (tool.format === "oxlint-json") return normalizeOxlintJson(raw, { root });
  if (tool.format === "biome-json") return normalizeBiomeJson(raw, { root });
  return normalizeRuffJson(raw, { root });
}

/** El comando por defecto: un proceso, con la raíz del repo como cwd. */
export const defaultLintRunner: LintProcessRunner = execCommand;

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
