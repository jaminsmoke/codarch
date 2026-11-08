/**
 * Riesgo compuesto compartido por el render y los consumidores headless.
 *
 * La base B es la de siempre (ADR 0008): complejidad 50 %, churn 32 % y
 * tamaño 18 %, normalizados por su p95. Si una señal no existe, esos pesos
 * se renormalizan. Gamma sigue en 1,7. Las carpetas agregan por máximo.
 *
 * El lint no entra en esa base. Con deuda fresca y válida se suma un término
 * antes de gamma, y nunca resta:
 *
 *   D = errores + 0,25·avisos   (info no cuenta)
 *   nL = clamp(D / Dsat, 0, 1)
 *   raw = min(B + α·nL, 1)
 *   risk = raw^γ          0..1, el mismo número de siempre si no hay término
 *   score = 100·raw^γ     0..100, lo que suman las contribuciones en puntos
 *
 * α y Dsat son provisionales: no están calibrados. Sin observación de lint,
 * o con lint que no se puede aplicar, nL es null —no 0— y el riesgo es B^γ.
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

/** Los pesos de la base (ADR 0008). Son metadato: la parte real es la renormalizada. */
export const RISK_WEIGHTS = {
  complexity: 0.5,
  churn: 0.32,
  size: 0.18
} as const;

/**
 * Pesos nominales del modelo que reescalaba la base para dejar un 20 % al lint.
 *
 * El término aditivo no los usa: B no se reescala. Siguen exportados porque
 * la ficha todavía los lee; el índice no.
 */
export const RISK_WEIGHTS_WITH_LINT = {
  complexity: 0.4,
  churn: 0.256,
  size: 0.144,
  lint: 0.2
} as const;

/** Cuánto pesa un aviso frente a un error: un error vale cuatro avisos. */
export const LINT_WARNING_WEIGHT = 0.25;

export const RISK_GAMMA = 1.7;

/**
 * Cuánto puede sumar el lint a la base, antes de gamma y del tope.
 *
 * Provisional y experimental: no está calibrado. No es un peso de la base.
 */
export const RISK_LINT_ALPHA = 0.2;

/**
 * Deuda ponderada (errores + 0,25·avisos) que satura el término de lint.
 *
 * Provisional y experimental: no está calibrado. Desde aquí, más hallazgos
 * no suben nL.
 */
export const RISK_LINT_DSAT = 10;

export type RiskLintCoverage = "unmeasured" | "unknown" | "partial" | "complete";

export type RiskLintApplicability = "applicable" | "na" | "not-found";

export type RiskConfidence = "complete" | "observedMinimum" | "unknown";

export type RiskStatus = "measured" | "partial" | "unmeasured";

/**
 * Cuentas de un ámbito. La misma forma que `ScopeHealth.counts`:
 * metrics no importa ese paquete, el integrador copia estos campos.
 *
 * D usa `errors` y `warnings`. `info` no entra en D y sí impide declarar
 * el ámbito limpio. `findings` y `filesWithFindings` no cambian D.
 */
export interface RiskLintCounts {
  errors: number;
  warnings: number;
  info: number;
  findings?: number;
  filesWithFindings?: number;
}

/**
 * Un motivo del contrato de lint (`ScopeHealth.coverage.reasons`).
 *
 * El código es texto a propósito: metrics no copia el union del otro
 * paquete. Para el índice importan `not-found`, `not-eligible` y
 * `no-eligible`. El resto no convierte el ámbito en no aplicable.
 */
export interface RiskLintReason {
  code: string;
  text?: string;
}

/**
 * Cobertura del ámbito, con los nombres de `ScopeHealth.coverage`.
 *
 * `measured` no entra en la fórmula. `eligible` null es universo
 * desconocido, no cero.
 */
export interface RiskLintCoverageInput {
  state: RiskLintCoverage;
  eligible: number | null;
  measured: number | null;
  reasons?: readonly RiskLintReason[];
}

/**
 * Observación de lint de un fichero, copiada de `ScopeHealth`.
 *
 * La deuda entra solo con `fresh === true` y cuentas válidas, aunque la
 * cobertura sea `unknown`, `unmeasured` o `partial`: es un mínimo observado.
 * `fresh` false o null no penaliza. No aplicable solo con `eligible === 0`
 * o un motivo `not-eligible` / `no-eligible` (o `applicability: "na"` más
 * un motivo explícito). `not-found` —el código o `applicability`— es otro
 * estado: no es no aplicable ni cero.
 */
export interface RiskLintInput {
  fresh?: boolean | null;
  coverage?: Partial<RiskLintCoverageInput>;
  /** `ScopeHealth.counts`. Si faltan errores o avisos válidos, no hay deuda. */
  counts?: Partial<RiskLintCounts>;
  /**
   * Atajo si el integrador ya clasificó el ámbito. Si no viene, se deduce
   * de `coverage.reasons` y de `coverage.eligible`.
   */
  applicability?: RiskLintApplicability;
  /** Motivo explícito. Junto a `applicability: "na"`, acredita no aplicable. */
  reason?: string | null;
}

/** Qué se hizo con el lint de un fichero. `normalized` null no es cero. */
export interface RiskLintAssessment {
  /** nL. null si la deuda no entra en el índice. */
  normalized: number | null;
  /** D. null si no entra. 0 es cero conocido, no ausencia. */
  debt: number | null;
  /** α·nL antes del tope. null si nL es null. */
  nominal: number | null;
  /** `raw − B`. null si nL es null. Nunca negativo: el lint no resta. */
  applied: number | null;
  /** `nominal − applied`: lo que el tope deja fuera. null si nominal es null. */
  clipped: number | null;
  /** null si no está clasificado (`na` y `not-found` no se colapsan). */
  applicability: RiskLintApplicability | null;
  coverage: RiskLintCoverage;
  fresh: boolean | null;
  confidence: RiskConfidence;
  status: RiskStatus;
  /**
   * Solo con cobertura `complete`, elegibles demostrados (> 0), `fresh`,
   * deuda cero e info cero. Si `counts.findings` viene, también tiene que
   * ser 0. Nunca con cobertura desconocida.
   */
  clean: boolean;
  reason: string | null;
}

/**
 * Puntos de una señal. Sumados a precisión completa dan `score`.
 * El porcentaje es otro campo: no es el peso nominal ni la parte 0..1.
 */
export interface RiskContribution {
  /** null si la señal no entra (ausente, o lint sin nL). */
  points: number | null;
  /** Porcentaje del índice, 0..100. null si el índice es 0 o la señal no entra. */
  percent: number | null;
  /** Peso nominal. Metadato: no es la parte renormalizada ni el porcentaje. */
  weight: number | null;
}

export interface RiskContributions {
  /** `raw^γ / raw`. null si raw es 0, para no dividir por cero. */
  k: number | null;
  complexity: RiskContribution;
  churn: RiskContribution;
  size: RiskContribution;
  lint: RiskContribution;
}

export interface RiskSignals {
  complexity: number;
  churn: number;
  /** Valor de la métrica de tamaño elegida (normalmente `rloc`). */
  size: number;
  /**
   * Puente con los llamadores que ya pasan la deuda ponderada (`lintScore`).
   *
   * Solo cuenta si `options.lint` es true, el número es finito y ≥ 0, y este
   * fichero no trae `lintView`. Se lee como deuda fresca de cobertura
   * desconocida: sube el índice y no lo baja, y un 0 es cero conocido, no
   * ausencia. Omitir el campo es ausencia (nL null) aunque `options.lint`
   * sea true. La entrada de verdad es `lintView`.
   */
  lint?: number;
  /**
   * Observación de lint. Si el campo está —aunque sea null—, manda sobre
   * el número legado y sobre `options.lint`.
   */
  lintView?: RiskLintInput | null;
}

/**
 * Una señal de la base, ya explicada: de dónde sale y cuánto pesa.
 *
 * `weight` es el peso ya renormalizado y `share` es `norm × weight`.
 * Esas tres partes suman B.
 */
export interface RiskPart {
  /** El valor de la señal en este fichero. */
  value: number;
  /** El p95 del proyecto con el que se normaliza. */
  p95: number;
  /** `value / p95`, entre 0 y 1. */
  norm: number;
  /** Peso ya renormalizado: las señales presentes de la base suman 1. */
  weight: number;
  /** Lo que aporta a B: `norm × weight`. */
  share: number;
}

export interface RiskBreakdown {
  /** 0..1. `raw^γ`. Sin término de lint, idéntico al riesgo histórico. */
  risk: number;
  /** 0..100. `100·raw^γ`. Las contribuciones en puntos suman este índice. */
  score: number;
  /** Base B, 0..1, sin lint. */
  base: number;
  /** `min(B + α·nL, 1)`. nL null suma 0 y no se presenta como cero aplicado. */
  raw: number;
  parts: {
    complexity: RiskPart;
    churn: RiskPart;
    size: RiskPart;
    /**
     * No es una señal de la base. `weight` queda en 0, `norm` es nL (0 si
     * es null), `value` es D (0 si es null) y `share` es lo aplicado a raw.
     */
    lint: RiskPart;
  };
  lint: RiskLintAssessment;
  contributions: RiskContributions;
}

/** La deuda de un fichero según el lint: errores + ¼ de avisos. Info no entra. */
export function lintScore(errors: number, warnings: number): number {
  const errorCount = Number.isFinite(errors) ? Math.max(0, errors) : 0;
  const warningCount = Number.isFinite(warnings) ? Math.max(0, warnings) : 0;
  return errorCount + LINT_WARNING_WEIGHT * warningCount;
}

/**
 * La deuda por ruta, a partir de los ficheros de un `lint.repmod.json`.
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
   * Puente legado: el proyecto tiene artefacto y cada `lint` numérico es
   * deuda fresca observada, con cobertura desconocida.
   *
   * No reescala la base. Un fichero sin número no queda en cero: queda sin
   * término. `lintView` no necesita este flag.
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
 * El riesgo de cada fichero, con la base desglosada y el término de lint.
 *
 * Sin observación aplicable el resultado de `risk` es el de la base sola,
 * el mismo de antes de este término.
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

  const complexityWeight = complexityP95 > 0 ? RISK_WEIGHTS.complexity : 0;
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
    const complexity = part(file.complexity, complexityP95, weights.complexity);
    const churn = part(file.churn, churnP95, weights.churn);
    const size = part(file.size, sizeP95, weights.size);
    const base = complexity.share + churn.share + size.share;
    const combined = withLintTerm(base, assessLint(lintInputOf(file, options)));
    const k = combined.raw > 0 ? combined.risk / combined.raw : null;
    const lintKnown = combined.lint.normalized !== null;

    return {
      risk: combined.risk,
      score: combined.score,
      base,
      raw: combined.raw,
      parts: {
        complexity,
        churn,
        size,
        lint: {
          value: combined.lint.debt ?? 0,
          p95: 0,
          norm: combined.lint.normalized ?? 0,
          weight: 0,
          share: combined.lint.applied ?? 0
        }
      },
      lint: combined.lint,
      contributions: {
        k,
        complexity: contribution(
          complexity.share,
          complexityP95 > 0,
          RISK_WEIGHTS.complexity,
          k,
          combined.score
        ),
        churn: contribution(
          churn.share,
          churnP95 > 0,
          RISK_WEIGHTS.churn,
          k,
          combined.score
        ),
        size: contribution(
          size.share,
          sizeP95 > 0,
          RISK_WEIGHTS.size,
          k,
          combined.score
        ),
        lint: contribution(
          combined.lint.applied,
          lintKnown,
          lintKnown ? RISK_LINT_ALPHA : null,
          k,
          combined.score
        )
      }
    };
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

type LintClass =
  | { kind: "absent" }
  | {
      kind: "not-found";
      reason: string | null;
      fresh: boolean | null;
      coverage: RiskLintCoverage;
    }
  | {
      kind: "na";
      reason: string | null;
      fresh: boolean | null;
    }
  | {
      kind: "unapplied";
      fresh: boolean | null;
      coverage: RiskLintCoverage;
      reason: string | null;
    }
  | {
      kind: "observed";
      debt: number;
      info: number | null;
      findings: number | null;
      coverage: RiskLintCoverage;
      eligible: number | null;
    };

function lintInputOf(file: RiskSignals, options: RiskOptions): RiskLintInput | null {
  if (file.lintView !== undefined) return file.lintView;
  if (options.lint !== true || file.lint === undefined) return null;
  if (!Number.isFinite(file.lint) || file.lint < 0) return null;
  // El número ya es D (errores + 0,25·avisos). Cabe entero en `errors`.
  return {
    fresh: true,
    applicability: "applicable",
    coverage: {
      state: "unknown",
      eligible: null,
      measured: null,
      reasons: []
    },
    counts: {
      errors: file.lint,
      warnings: 0,
      info: 0,
      findings: 0,
      filesWithFindings: 0
    }
  };
}

function assessLint(input: RiskLintInput | null): RiskLintAssessment {
  const classified = classifyLint(input);
  switch (classified.kind) {
    case "absent":
      return blankLint({
        applicability: null,
        coverage: "unknown",
        fresh: null,
        confidence: "unknown",
        status: "unmeasured",
        reason: null
      });
    case "not-found":
      return blankLint({
        applicability: "not-found",
        coverage: classified.coverage,
        fresh: classified.fresh,
        confidence: "unknown",
        status: "unmeasured",
        reason: classified.reason
      });
    case "na":
      return blankLint({
        applicability: "na",
        coverage: "unmeasured",
        fresh: classified.fresh,
        confidence: "unknown",
        status: "unmeasured",
        reason: classified.reason
      });
    case "unapplied":
      return blankLint({
        applicability: null,
        coverage: classified.coverage,
        fresh: classified.fresh,
        confidence: "unknown",
        status: "partial",
        reason: classified.reason
      });
    case "observed":
      return observedLint(classified);
    default: {
      const unexpected: never = classified;
      throw new Error(`Caso de lint no cubierto: ${String(unexpected)}`);
    }
  }
}

function classifyLint(input: RiskLintInput | null): LintClass {
  if (input === null) return { kind: "absent" };

  const coverage = readCoverage(input);
  const reason = readReason(input.reason) ?? coverage.reason;
  const fresh = input.fresh === true ? true : input.fresh === false ? false : null;
  const applicability = isApplicability(input.applicability)
    ? input.applicability
    : undefined;
  const health = readHealth(input.counts);
  const seen =
    health.valid &&
    (health.errors > 0 ||
      health.warnings > 0 ||
      (health.info ?? 0) > 0 ||
      (health.findings ?? 0) > 0);
  const notApplicableCode = coverage.codes.some((code) =>
    code === "not-eligible" || code === "no-eligible"
  );

  if (applicability === "not-found" || coverage.codes.includes("not-found")) {
    return {
      kind: "not-found",
      reason,
      fresh,
      coverage: coverage.state === "complete" ? "unknown" : coverage.state
    };
  }

  if (fresh === true && health.valid && seen) {
    return {
      kind: "observed",
      debt: health.errors + LINT_WARNING_WEIGHT * health.warnings,
      info: health.info,
      findings: health.findings,
      coverage: downgradeComplete(coverage.state, coverage.eligible),
      eligible: coverage.eligible
    };
  }

  if (
    applicability !== "applicable" &&
    (coverage.eligible === 0 || notApplicableCode)
  ) {
    return { kind: "na", reason, fresh };
  }
  if (applicability === "na" && reason !== null) {
    return { kind: "na", reason, fresh };
  }
  if (applicability === "na") {
    return {
      kind: "unapplied",
      fresh,
      coverage: "unknown",
      reason: "sin evidencia de no aplicabilidad"
    };
  }

  if (fresh !== true || !health.valid) {
    return {
      kind: "unapplied",
      fresh,
      coverage: downgradeComplete(coverage.state, coverage.eligible),
      reason:
        fresh === false ? "histórico" : fresh === true ? "mensajes no válidos" : null
    };
  }

  return {
    kind: "observed",
    debt: health.errors + LINT_WARNING_WEIGHT * health.warnings,
    info: health.info,
    findings: health.findings,
    coverage: downgradeComplete(coverage.state, coverage.eligible),
    eligible: coverage.eligible
  };
}

function observedLint(classified: Extract<LintClass, { kind: "observed" }>): RiskLintAssessment {
  const full =
    classified.coverage === "complete" &&
    classified.eligible !== null &&
    classified.eligible > 0 &&
    classified.info !== null;
  return {
    normalized: clamp01(classified.debt / RISK_LINT_DSAT),
    debt: classified.debt,
    nominal: null,
    applied: null,
    clipped: null,
    applicability: "applicable",
    coverage: classified.coverage,
    fresh: true,
    confidence: full ? "complete" : "observedMinimum",
    status: full ? "measured" : "partial",
    clean:
      full &&
      classified.debt === 0 &&
      classified.info === 0 &&
      (classified.findings ?? 0) === 0,
    reason: null
  };
}

function withLintTerm(
  base: number,
  lint: RiskLintAssessment
): { raw: number; risk: number; score: number; lint: RiskLintAssessment } {
  const addition = lint.normalized === null ? 0 : RISK_LINT_ALPHA * lint.normalized;
  const raw = clamp01(base + addition);
  const risk = Math.pow(raw, RISK_GAMMA);
  const score = 100 * risk;
  if (lint.normalized === null) return { raw, risk, score, lint };

  const nominal = RISK_LINT_ALPHA * lint.normalized;
  const applied = Math.max(0, raw - base);
  const clipped = Math.max(0, nominal - applied);
  return { raw, risk, score, lint: { ...lint, nominal, applied, clipped } };
}

function contribution(
  share: number | null,
  present: boolean,
  weight: number | null,
  k: number | null,
  score: number
): RiskContribution {
  if (!present || share === null) return { points: null, percent: null, weight };
  if (k === null) return { points: 0, percent: null, weight };
  const points = 100 * k * share;
  const percent = score > 0 ? (points / score) * 100 : null;
  return { points, percent, weight };
}

function blankLint(
  fields: Pick<
    RiskLintAssessment,
    "applicability" | "coverage" | "fresh" | "confidence" | "status" | "reason"
  >
): RiskLintAssessment {
  return {
    normalized: null,
    debt: null,
    nominal: null,
    applied: null,
    clipped: null,
    clean: false,
    ...fields
  };
}

interface ReadCoverage {
  state: RiskLintCoverage;
  eligible: number | null;
  measured: number | null;
  codes: string[];
  reason: string | null;
}

function readCoverage(input: RiskLintInput): ReadCoverage {
  const coverage = input.coverage;
  const state = isCoverage(coverage?.state) ? coverage.state : "unknown";
  const reasons = Array.isArray(coverage?.reasons) ? coverage.reasons : [];
  const codes: string[] = [];
  let reason: string | null = null;
  for (const item of reasons) {
    if (!item || typeof item.code !== "string" || item.code.trim() === "") continue;
    codes.push(item.code);
    if (reason === null) reason = readReason(item.text);
  }
  return {
    state,
    eligible: readCount(coverage?.eligible),
    measured: readCount(coverage?.measured),
    codes,
    reason
  };
}

function readHealth(health: Partial<RiskLintCounts> | undefined): {
  valid: boolean;
  errors: number;
  warnings: number;
  info: number | null;
  findings: number | null;
} {
  const empty = { valid: false, errors: 0, warnings: 0, info: null, findings: null };
  if (!health || !isCount(health.errors) || !isCount(health.warnings)) return empty;
  if (health.info !== undefined && !isCount(health.info)) return empty;
  if (health.findings !== undefined && !isCount(health.findings)) return empty;
  if (health.filesWithFindings !== undefined && !isCount(health.filesWithFindings)) {
    return empty;
  }
  return {
    valid: true,
    errors: health.errors,
    warnings: health.warnings,
    info: health.info === undefined ? null : health.info,
    findings: health.findings === undefined ? null : health.findings
  };
}

/** `complete` sin elegibles demostrados no se honra: si no, parecería cerrado. */
function downgradeComplete(
  state: RiskLintCoverage,
  eligible: number | null
): RiskLintCoverage {
  if (state === "complete" && !(eligible !== null && eligible > 0)) return "unknown";
  return state;
}

function isCoverage(value: unknown): value is RiskLintCoverage {
  return (
    value === "unmeasured" ||
    value === "unknown" ||
    value === "partial" ||
    value === "complete"
  );
}

function isApplicability(value: unknown): value is RiskLintApplicability {
  return value === "applicable" || value === "na" || value === "not-found";
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function readCount(value: unknown): number | null {
  return isCount(value) ? value : null;
}

function readReason(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  return value;
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
