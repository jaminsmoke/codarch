import {
  MINIMAL_LINT,
  describeLintSystems,
  detectLintSystems,
  type DetectedLintSystem,
  type LintProcessRunner,
  type LintSystem,
  type LintTool
} from "@codarch/lint";
import { loadProjectLintTools } from "./config";

/**
 * Qué lint se lanza en un repo (ADR 0096).
 *
 * El bloque `lint:` de `.codarch.yml` es un **override**: si está, manda y se
 * ejecuta tal cual. Si no, se detecta el lint del proyecto —su config y su
 * binario— y se lanza ese. Nunca se completa una herramienta que el repo no
 * tenga: si falta, se dice.
 */
export interface LintPlan {
  source: "config" | "detect";
  tools: LintTool[];
  detected: DetectedLintSystem[];
}

export interface LintPlanOptions {
  /** El `.codarch.yml` explícito. */
  config?: string;
  /** Ignora el `.codarch.yml` y va a la detección. */
  noConfig?: boolean;
  /** No detecta nada: con `noConfig`, no hay herramientas. */
  noDetect?: boolean;
}

export function planProjectLint(
  root: string,
  options: LintPlanOptions = {}
): LintPlan {
  const tools = loadProjectLintTools(root, options);
  if (tools.length > 0) {
    return { source: "config", tools, detected: [] };
  }

  const detected = options.noDetect ? [] : detectLintSystems(root);
  const runnable = detected.filter(
    (system): system is DetectedLintSystem & { format: NonNullable<DetectedLintSystem["format"]>; command: string } =>
      system.format !== null && system.command !== null
  );
  return {
    source: "detect",
    tools: runnable.map((system) => ({
      name: system.name,
      command: system.command,
      format: system.format,
      ...(system.listCommand ? { listCommand: system.listCommand } : {}),
      ...(system.exhaustive ? { exhaustive: true } : {})
    })),
    detected
  };
}

/** Los sistemas del artefacto: el override tal cual, o la detección resuelta. */
export async function planSystems(
  root: string,
  plan: LintPlan,
  options: { run?: LintProcessRunner } = {}
): Promise<LintSystem[]> {
  if (plan.source === "config") {
    return plan.tools.map((tool) => ({ name: tool.name, config: null }));
  }
  return describeLintSystems(root, plan.detected, options);
}

/** Lo que se dice cuando no hay nada que medir, con el mínimo recomendable. */
export function noLintLines(plan: LintPlan): string[] {
  if (plan.detected.length > 0) {
    return [
      "el proyecto declara lint, pero CodArch todavía no sabe leerlo:",
      ...plan.detected.map(
        (system) =>
          `  ${system.name}${system.config ? ` · ${system.config}` : ""}${
            system.note ? ` · ${system.note}` : ""
          }`
      ),
      "  no se escribe artefacto: no hay medida que contar."
    ];
  }

  return [
    "no se encontró lint en el proyecto: no se inventa ni se ejecuta uno.",
    "  el mínimo recomendable, por lenguaje:",
    ...MINIMAL_LINT.map(
      (advice) =>
        `    ${advice.language.padEnd(24)} ${advice.tool} · ${advice.config}`
    ),
    "  cuando el repo lo tenga, `codarch lint` lo leerá sin configuración."
  ];
}
