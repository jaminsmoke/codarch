import fs from "node:fs";
import path from "node:path";
import {
  LintError,
  runLint,
  type LintArtifact,
  type LintProcessRunner,
  type LintRunResult,
  type LintTool
} from "@codarch/lint";
import { loadProjectLintTools } from "../config";
import { directoryProblem, formatBytes } from "../io";
import { writeLintArtifact } from "../lint-store";

export type LintFailOn = "never" | "errors" | "warnings";

export interface LintCommandOptions {
  root?: string;
  out?: string;
  /** Fichero de configuración; si falta, se busca `.codarch.yml` en la raíz. */
  config?: string;
  noConfig?: boolean;
  /** Qué cuenta como fallo; por defecto nada: el comando no bloquea. */
  failOn?: LintFailOn;
  /** Cómo se lanzan las herramientas; por defecto, un proceso por herramienta. */
  run?: LintProcessRunner;
  help: boolean;
}

const numberFormat = new Intl.NumberFormat("es-ES");

function num(value: number): string {
  return numberFormat.format(value);
}

function field(label: string, value: string): string {
  return `  ${label.padEnd(12)} ${value}`;
}

/**
 * `codarch lint`: corre las herramientas que declara el repo y escribe
 * `.codarch/lint.json` (ADR 0094).
 *
 * Falla blando: una herramienta que no está o revienta se avisa y las demás
 * miden. El artefacto se escribe con lo que sí midió; si no midió ninguna, no
 * se escribe, porque un artefacto vacío diría «limpio» cuando quiere decir
 * «sin medir».
 */
export async function runLintCommand(
  options: LintCommandOptions
): Promise<number> {
  const root = options.root ?? ".";
  const problem = directoryProblem(root);
  if (problem) {
    console.error(`no se puede lintar ${problem}`);
    return 1;
  }

  const rootPath = path.resolve(root);
  let tools: LintTool[];
  try {
    tools = loadProjectLintTools(rootPath, options);
  } catch (error) {
    if (error instanceof LintError) {
      console.error(`configuración inválida: ${error.message}`);
      return 1;
    }
    throw error;
  }

  if (tools.length === 0) {
    console.error(
      "no hay herramientas de lint: declara un bloque `lint:` en .codarch.yml"
    );
    console.error("  con name, command y format (eslint-json u oxlint-json).");
    return 1;
  }

  const result = await runLint({
    root: rootPath,
    tools,
    ...(options.run ? { run: options.run } : {})
  });

  const outDirectory = path.resolve(
    options.out ?? path.join(rootPath, ".codarch")
  );
  const artifactPath = result.artifact
    ? writeLintArtifact(rootPath, result.artifact, outDirectory)
    : null;
  if (result.artifact && artifactPath === null) return 1;

  console.log(reportLines(rootPath, artifactPath, result).join("\n"));
  return failOnCode(result, options.failOn ?? "never");
}

/** La salida del comando: la raíz, el artefacto y lo que hizo cada herramienta. */
function reportLines(
  rootPath: string,
  artifactPath: string | null,
  result: LintRunResult
): string[] {
  const lines = ["", "  CodArch · lint", "", field("raíz", rootPath)];

  const artifact = result.artifact;
  if (artifact && artifactPath) {
    const bytes = Buffer.byteLength(fs.readFileSync(artifactPath), "utf8");
    lineOfArtifact(lines, artifactPath, bytes, artifact);
  } else {
    lines.push(field("artefacto", "sin medir: ninguna herramienta respondió"));
  }

  for (const run of result.runs) {
    lines.push(
      run.ok
        ? field(
            run.name,
            `ok · ${num(run.files)} ficheros · ${num(run.messages)} mensajes`
          )
        : field(run.name, `sin medir: ${run.error ?? "falló"}`)
    );
  }

  lines.push("");
  return lines;
}

function lineOfArtifact(
  lines: string[],
  file: string,
  bytes: number,
  artifact: LintArtifact
): void {
  const { summary } = artifact;
  lines.push(
    field(
      "artefacto",
      `${file} (${formatBytes(bytes)}) · ${num(
        summary.files
      )} ficheros · ${num(summary.errors)} errores · ${num(
        summary.warnings
      )} avisos`
    )
  );
  lines.push(
    field("herramientas", artifact.meta.tools.join(" · ") || "ninguna")
  );
}

/** El código de salida: sin artefacto no hay medida, y luego lo que pida `--fail-on`. */
function failOnCode(result: LintRunResult, failOn: LintFailOn): number {
  // Sin artefacto el comando no ha medido nada, y eso es un fallo aunque no se
  // haya pedido bloquear.
  const summary = result.artifact?.summary;
  if (!summary) return 1;
  if (failOn === "never") return 0;

  if (failOn === "errors" && summary.errors > 0) {
    console.error(`lint: ${num(summary.errors)} errores (--fail-on errors)`);
    return 1;
  }
  if (failOn === "warnings" && summary.errors + summary.warnings > 0) {
    console.error(
      `lint: ${num(summary.errors)} errores y ${num(
        summary.warnings
      )} avisos (--fail-on warnings)`
    );
    return 1;
  }
  return 0;
}
