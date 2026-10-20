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

export function riskScores(files: readonly RiskSignals[]): number[] {
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

  if (totalWeight === 0) return files.map(() => 0);

  return files.map((file) => {
    const raw =
      (complexityWeight * norm(file.complexity, complexityP95) +
        churnWeight * norm(file.churn, churnP95) +
        sizeWeight * norm(file.size, sizeP95)) /
      totalWeight;
    return Math.pow(clamp01(raw), RISK_GAMMA);
  });
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
