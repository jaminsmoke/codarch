/**
 * Riesgo compuesto compartido por el render y los consumidores headless.
 *
 * ADR 0008: complejidad 50%, churn 32%, tamaño 18%, normalizado por p95 y
 * elevado a gamma 1.7. Si una señal no existe, los pesos se renormalizan.
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

export const RISK_WEIGHTS = {
  complexity: 0.5,
  churn: 0.32,
  size: 0.18
} as const;

export const RISK_GAMMA = 1.7;

export interface RiskSignals {
  complexity: number;
  churn: number;
  /** Valor de la métrica de tamaño elegida (normalmente `rloc`). */
  size: number;
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
  };
}

export function riskScores(files: readonly RiskSignals[]): number[] {
  return riskBreakdown(files).map((entry) => entry.risk);
}

/**
 * El riesgo de cada fichero con sus tres señales desglosadas.
 *
 * Es la misma cuenta que `riskScores`, pero devuelve también los valores
 * normalizados y los pesos, que es lo que la ficha del fichero enseña.
 */
export function riskBreakdown(
  files: readonly RiskSignals[]
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

  const complexityWeight =
    complexityP95 > 0 ? RISK_WEIGHTS.complexity : 0;
  const churnWeight = churnP95 > 0 ? RISK_WEIGHTS.churn : 0;
  const sizeWeight = sizeP95 > 0 ? RISK_WEIGHTS.size : 0;
  const totalWeight = complexityWeight + churnWeight + sizeWeight;

  const weights =
    totalWeight > 0
      ? {
          complexity: complexityWeight / totalWeight,
          churn: churnWeight / totalWeight,
          size: sizeWeight / totalWeight
        }
      : { complexity: 0, churn: 0, size: 0 };

  return files.map((file) => {
    const complexity = part(
      file.complexity,
      complexityP95,
      weights.complexity
    );
    const churn = part(file.churn, churnP95, weights.churn);
    const size = part(file.size, sizeP95, weights.size);
    const raw = complexity.share + churn.share + size.share;
    return {
      risk: Math.pow(clamp01(raw), RISK_GAMMA),
      parts: { complexity, churn, size }
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
