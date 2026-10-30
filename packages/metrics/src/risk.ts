/**
 * Riesgo compuesto compartido por el render y los consumidores headless.
 *
 * ADR 0008: complejidad 50%, churn 32%, tamaño 18%, normalizado por p95 y
 * elevado a gamma 1.7. Si una señal no existe, los pesos se renormalizan.
 *
 * ADR 0094: cuando hay lint, entra una cuarta señal —deuda ponderada por
 * fichero— y los pesos pasan a 40 · 25,6 · 14,4 · 20. Sin artefacto de lint, la
 * cuenta es exactamente la de antes.
 */

export const COMPLEXITY_METRIC_CANDIDATES = [
  "maxComplexity",
  "max_complexity_per_function",
  "complexity",
  "logic_complexity",
  "sonar_cognitive_complexity"
] as const;

export const CHURN_METRIC_CANDIDATES = [
  "number_of_commits",
  "number_of_authors",
  "number_of_renames"
] as const;

/** Los pesos sin lint (ADR 0008), los de siempre. */
export const RISK_WEIGHTS = {
  complexity: 0.5,
  churn: 0.32,
  size: 0.18
} as const;

/** Los pesos con lint (ADR 0094); suman 1. */
export const RISK_WEIGHTS_WITH_LINT = {
  complexity: 0.4,
  churn: 0.256,
  size: 0.144,
  lint: 0.2
} as const;

/** Cuánto pesa un aviso frente a un error: un error vale cuatro avisos. */
export const LINT_WARNING_WEIGHT = 0.25;

export const RISK_GAMMA = 1.7;

export interface RiskSignals {
  complexity: number;
  churn: number;
  /** Valor de la métrica de tamaño elegida (normalmente `rloc`). */
  size: number;
  /**
   * Deuda del lint del fichero, ya ponderada (`lintScore`).
   *
   * `undefined` o 0 en un proyecto sin lint (ADR 0094).
   */
  lint?: number;
}

/**
 * Una señal del riesgo, ya explicada: de dónde sale y cuánto pesa.
 *
 * Existe para que la app pueda contar **por qué** un fichero tiene el riesgo
 * que tiene sin repetir la fórmula en la UI (ADR 0057).
 */
export interface RiskPart {
  /** El valor de la señal en este fichero. */
  value: number;
  /** El p95 del proyecto con el que se normaliza. */
  p95: number;
  /** `value / p95`, entre 0 y 1. */
  norm: number;
  /** Peso ya renormalizado: las señales presentes suman 1. */
  weight: number;
  /** Lo que aporta al riesgo antes de gamma: `norm × weight`. */
  share: number;
}

export interface RiskBreakdown {
  /** El riesgo final, 0..1, con gamma aplicada. */
  risk: number;
  parts: {
    complexity: RiskPart;
    churn: RiskPart;
    size: RiskPart;
    /** Cero si el proyecto no tiene lint (ADR 0094). */
    lint: RiskPart;
  };
}

/** La deuda de un fichero según el lint: errores + ¼ de avisos. */
export function lintScore(errors: number, warnings: number): number {
  const errorCount = Number.isFinite(errors) ? Math.max(0, errors) : 0;
  const warningCount = Number.isFinite(warnings) ? Math.max(0, warnings) : 0;
  return errorCount + LINT_WARNING_WEIGHT * warningCount;
}

/**
 * La deuda por ruta, a partir de los ficheros de un `lint.json`.
 *
 * Es la forma estructural del artefacto, no su tipo: `@codarch/metrics` no
 * necesita depender de `@codarch/lint` para multiplicar por 0,25.
 */
export function lintScores(
  files: Readonly<Record<string, { errors: number; warnings: number }>>
): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const [path, file] of Object.entries(files)) {
    scores[path] = lintScore(file.errors, file.warnings);
  }
  return scores;
}

export interface RiskOptions {
  /**
   * El proyecto tiene artefacto de lint (ADR 0094).
   *
   * Con `true`, la cuarta señal entra con su peso aunque su deuda sea cero: es
   * el hecho de haber medido lo que cambia la cuenta, no la deuda que tenga.
   */
  lint?: boolean;
}

export function riskScores(
  files: readonly RiskSignals[],
  options: RiskOptions = {}
): number[] {
  return riskBreakdown(files, options).map((entry) => entry.risk);
}

/**
 * El riesgo de cada fichero con sus señales desglosadas.
 *
 * Es la misma cuenta que `riskScores`, pero devuelve también los valores
 * normalizados y los pesos, que es lo que la ficha del fichero enseña. La señal
 * de lint pesa si el proyecto lo midió; sin artefacto, no hay cuarta señal y
 * los pesos son los de siempre.
 */
export function riskBreakdown(
  files: readonly RiskSignals[],
  options: RiskOptions = {}
): RiskBreakdown[] {
  const complexityP95 = percentile(
    files.map((file) => file.complexity).filter((value) => value > 0),
    0.95
  );
  const churnP95 = percentile(
    files.map((file) => file.churn).filter((value) => value > 0),
    0.95
  );
  const sizeP95 = percentile(
    files.map((file) => file.size).filter((value) => value > 0),
    0.95
  );
  const lintP95 = percentile(
    files.map((file) => file.lint ?? 0).filter((value) => value > 0),
    0.95
  );

  const hasLint = options.lint === true;
  const base = hasLint ? RISK_WEIGHTS_WITH_LINT : RISK_WEIGHTS;
  const complexityWeight = complexityP95 > 0 ? base.complexity : 0;
  const churnWeight = churnP95 > 0 ? base.churn : 0;
  const sizeWeight = sizeP95 > 0 ? base.size : 0;
  const lintWeight = hasLint ? RISK_WEIGHTS_WITH_LINT.lint : 0;
  const totalWeight = complexityWeight + churnWeight + sizeWeight + lintWeight;

  const weights =
    totalWeight > 0
      ? {
          complexity: complexityWeight / totalWeight,
          churn: churnWeight / totalWeight,
          size: sizeWeight / totalWeight,
          lint: lintWeight / totalWeight
        }
      : { complexity: 0, churn: 0, size: 0, lint: 0 };

  return files.map((file) => {
    const complexity = part(
      file.complexity,
      complexityP95,
      weights.complexity
    );
    const churn = part(file.churn, churnP95, weights.churn);
    const size = part(file.size, sizeP95, weights.size);
    const lint = part(file.lint ?? 0, lintP95, weights.lint);
    const raw = complexity.share + churn.share + size.share + lint.share;
    return {
      risk: Math.pow(clamp01(raw), RISK_GAMMA),
      parts: { complexity, churn, size, lint }
    };
  });
}

function part(value: number, p95: number, weight: number): RiskPart {
  const normalized = norm(value, p95);
  return {
    value,
    p95,
    norm: normalized,
    weight,
    share: normalized * weight
  };
}

export function firstMetric(
  available: Iterable<string>,
  candidates: readonly string[]
): string | null {
  const set = available instanceof Set ? available : new Set(available);
  for (const candidate of candidates) {
    if (set.has(candidate)) return candidate;
  }
  return null;
}

function norm(value: number, p95: number): number {
  return p95 > 0 ? clamp01(value / p95) : 0;
}

function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor((sorted.length - 1) * p))
  );
  return sorted[index] ?? 0;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}
