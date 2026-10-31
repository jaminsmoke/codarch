import fs from "node:fs";
import path from "node:path";
import {
  LintError,
  lintTotals,
  runLint,
  type LintArtifact,
  type LintProcessRunner,
  type LintRunResult
} from "@codarch/lint";
import { noLintLines, planProjectLint, planSystems } from "../lint-plan";
import { directoryProblem, formatBytes } from "../io";
import { writeLintArtifact } from "../lint-store";

export type LintFailOn = "never" | "errors" | "warnings";

export interface LintCommandOptions {
  root?: string;
  out?: string;
  /** Fichero de configuración; si falta, se busca `.codarch.yml` en la raíz. */
  config?: string;
  noConfig?: boolean;
  /** No detecta el lint del proyecto: solo corre el override del YAML. */
  noDetect?: boolean;
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

/** La cuenta con su palabra: «1 error», «3 errores». */
function tally(value: number, one: string, many: string): string {
  return `${num(value)} ${value === 1 ? one : many}`;
}

/** «1 fichero con hallazgos», «3 ficheros con hallazgos». */
function filesWithFindings(value: number): string {
  return tally(value, "fichero con hallazgos", "ficheros con hallazgos");
}

/**
 * `codarch lint`: corre las herramientas que declara el repo y escribe
 * `.codarch/lint.cc.json` (ADR 0094).
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
  let plan: ReturnType<typeof planProjectLint>;
  try {
    plan = planProjectLint(rootPath, options);
  } catch (error) {
    if (error instanceof LintError) {
      console.error(`configuración inválida: ${error.message}`);
      return 1;
    }
    throw error;
  }

  if (plan.tools.length === 0) {
    console.error(noLintLines(plan).join("\n"));
    return 1;
  }

  const systems = await planSystems(
    rootPath,
    plan,
    options.run ? { run: options.run } : {}
  );
  const result = await runLint({
    root: rootPath,
    tools: plan.tools,
    systems,
    ...(options.run ? { run: options.run } : {})
  });

  const outDirectory = path.resolve(
    options.out ?? path.join(rootPath, ".codarch")
  );
  const artifactPath = result.artifact
    ? writeLintArtifact(rootPath, result.artifact, outDirectory)
    : null;
  if (result.artifact && artifactPath === null) return 1;

  console.log(
    reportLines(rootPath, artifactPath, result, plan.source).join("\n")
  );
  return failOnCode(result, options.failOn ?? "never");
}

/** La salida del comando: la raíz, el artefacto y lo que hizo cada herramienta. */
function reportLines(
  rootPath: string,
  artifactPath: string | null,
  result: LintRunResult,
  source: "config" | "detect"
): string[] {
  const lines = [
    "",
    "  CodArch · lint",
    "",
    field("raíz", rootPath),
    field(
      "origen",
      source === "config" ? "override de .codarch.yml" : "lint del proyecto"
    )
  ];

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
            `ok · ${filesWithFindings(run.files)} · ${tally(
              run.messages,
              "mensaje",
              "mensajes"
            )}`
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
  // La misma cuenta que la app: sale de los mensajes, e incluye los `info`
  // cuando los hay, para no decir «0 errores · 0 avisos» de un lint que sí
  // encontró algo (ADR 0096). Y dice cuántos ficheros se miraron (ADR 0098):
  // «0 con hallazgos» sin la cobertura no distingue limpio de no medido.
  const totals = lintTotals(artifact) ?? {
    errors: 0,
    warnings: 0,
    info: 0,
    findings: 0,
    files: 0
  };
  const measured = artifact.summary.measured;
  const counts = [
    measured === undefined
      ? filesWithFindings(totals.files)
      : `${filesWithFindings(totals.files)} de ${num(measured)} medidos`,
    tally(totals.errors, "error", "errores"),
    tally(totals.warnings, "aviso", "avisos"),
    ...(totals.info > 0 ? [tally(totals.info, "info", "info")] : [])
  ].join(" · ");
  lines.push(field("artefacto", `${file} (${formatBytes(bytes)}) · ${counts}`));
  lines.push(
    field("herramientas", artifact.meta.tools.join(" · ") || "ninguna")
  );
  for (const system of artifact.meta.systems) {
    const rules = system.rules ? ` · ${num(system.rules.length)} reglas` : "";
    lines.push(
      field(
        system.name,
        `${system.config ?? "sin config"}${rules}${
          artifact.meta.tools.includes(system.name) ? "" : " · sin medir"
        }${system.note ? ` · ${system.note}` : ""}`
      )
    );
  }
}


/** El código de salida: sin artefacto no hay medida, y luego lo que pida `--fail-on`. */
function failOnCode(result: LintRunResult, failOn: LintFailOn): number {
  // Sin artefacto el comando no ha medido nada, y eso es un fallo aunque no se
  // haya pedido bloquear.
  const totals = result.artifact ? lintTotals(result.artifact) : null;
  if (!totals) return 1;
  if (failOn === "never") return 0;

  // La cuenta es la misma que la que se imprime: los totales del artefacto son
  // un resumen que puede no cuadrar con sus mensajes (ADR 0097).
  if (failOn === "errors" && totals.errors > 0) {
    console.error(
      `lint: ${tally(totals.errors, "error", "errores")} (--fail-on errors)`
    );
    return 1;
  }
  if (failOn === "warnings" && totals.errors + totals.warnings > 0) {
    console.error(
      `lint: ${tally(totals.errors, "error", "errores")} y ${tally(
        totals.warnings,
        "aviso",
        "avisos"
      )} (--fail-on warnings)`
    );
    return 1;
  }
  return 0;
}
