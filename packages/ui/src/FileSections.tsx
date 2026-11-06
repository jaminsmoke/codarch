import {
  RISK_LINT_ALPHA,
  RISK_LINT_DSAT,
  type RiskBreakdown as IndexBreakdown,
  type RiskContribution,
  type RiskLintApplicability,
  type RiskLintAssessment,
  type RiskLintCoverage
} from "@codarch/metrics/browser";

/**
 * El desglose del índice, dentro de Métricas.
 *
 * Lee `breakdown.lint` y `breakdown.contributions`. No usa `parts.lint.weight`
 * ni vuelve a calcular el índice.
 */

type Signal = "complexity" | "churn" | "size" | "lint";

const SIGNAL_LABEL: Record<Signal, string> = {
  complexity: "Complejidad",
  churn: "Churn",
  size: "Tamaño",
  lint: "Lint"
};

const SIGNALS = Object.keys(SIGNAL_LABEL) as Signal[];

const pointsFormat = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 1
});

function formatPoints(value: number): string {
  return pointsFormat.format(value);
}

function coverageLabel(coverage: RiskLintCoverage): string {
  switch (coverage) {
    case "unmeasured":
      return "sin medir";
    case "unknown":
      return "desconocida";
    case "partial":
      return "parcial";
    case "complete":
      return "completa";
    default: {
      const unexpected: never = coverage;
      return unexpected;
    }
  }
}

function freshLabel(fresh: boolean | null): string {
  if (fresh === true) return "Frescura: al día.";
  if (fresh === false) return "Frescura: de otro árbol; no penaliza.";
  return "Frescura: no verificada; no penaliza.";
}

/** La penalización observada, la frescura y, si aplica, la saturación. */
export function lintExplanation(lint: RiskLintAssessment): string {
  const sentences: string[] = [];
  if (lint.applicability === "na") {
    sentences.push("No aplicable: no entra en el índice y no es un cero.");
  } else if (lint.applicability === "not-found") {
    sentences.push("No está en el árbol: no es no aplicable ni un cero.");
  } else if (lint.normalized === null) {
    sentences.push("Sin penalización en el índice.");
  } else {
    sentences.push(
      `Penalización observada: deuda ${lint.debt === null ? "—" : formatPoints(lint.debt)}, nL ${formatPoints(lint.normalized)}.`
    );
    if (lint.applied !== null) {
      sentences.push(`Aplicada: ${formatPoints(lint.applied)}.`);
    }
    if (lint.clipped !== null && lint.clipped > 0) {
      sentences.push(
        `Saturación: el tope deja fuera ${formatPoints(lint.clipped)}. α ${formatPoints(RISK_LINT_ALPHA)} y el tope de deuda ${formatPoints(RISK_LINT_DSAT)} son provisionales.`
      );
    }
  }
  sentences.push(`Cobertura ${coverageLabel(lint.coverage)}.`);
  sentences.push(freshLabel(lint.fresh));
  if (lint.clean) sentences.push("Ámbito limpio según el índice.");
  if (lint.reason) sentences.push(lint.reason);
  return sentences.join(" ");
}

function cell(value: number | null): string {
  return value === null ? "—" : formatPoints(value);
}

function ContributionRow({
  signal,
  contribution
}: {
  signal: Signal;
  contribution: RiskContribution;
}) {
  const absent = contribution.points === null;
  return (
    <div className={absent ? "risk-bar-row is-absent" : "risk-bar-row"}>
      <span>{SIGNAL_LABEL[signal]}</span>
      {contribution.percent === null ? (
        <span className="risk-bar is-absent" aria-label="sin porcentaje" />
      ) : (
        <span className="risk-bar" aria-hidden="true">
          <i style={{ width: `${Math.max(0, Math.min(100, contribution.percent))}%` }} />
        </span>
      )}
      <span className="mono">{cell(contribution.points)}</span>
      <span className="mono">{cell(contribution.percent)}</span>
      <span className="mono">{cell(contribution.weight)}</span>
    </div>
  );
}

/**
 * Puntos, porcentaje y peso nominal de cada señal.
 *
 * Un null se enseña como raya. Una barra vacía no significa limpio.
 */
export function RiskBreakdown({
  breakdown
}: {
  breakdown: IndexBreakdown | null;
}) {
  if (!breakdown) {
    return (
      <div className="risk-breakdown">
        <div className="risk-head">Índice</div>
        <p className="muted tiny">
          Esta ficha no trae el desglose del índice. No se recalcula aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="risk-breakdown">
      <div className="risk-head">Índice</div>
      <p className="risk-score">
        <span className="mono">{formatPoints(breakdown.score)}</span> puntos del
        índice
      </p>
      <p className="muted tiny">
        Riesgo histórico {formatPoints(breakdown.risk)} (0–1). Los puntos suman
        el índice. El porcentaje es aparte del peso nominal.
      </p>
      <div className="risk-bars">
        <div className="risk-bar-row risk-bar-head" aria-hidden="true">
          <span>Señal</span>
          <span />
          <span>Puntos</span>
          <span>%</span>
          <span>Nominal</span>
        </div>
        {SIGNALS.map((signal) => (
          <ContributionRow
            key={signal}
            signal={signal}
            contribution={breakdown.contributions[signal]}
          />
        ))}
      </div>
      <p className="muted tiny risk-note">{lintExplanation(breakdown.lint)}</p>
    </div>
  );
}

/** Para no dejar un `na` sin frase si alguien lee solo la aplicabilidad. */
export function applicabilityLabel(
  applicability: RiskLintApplicability | null
): string {
  switch (applicability) {
    case "applicable":
      return "aplicable";
    case "na":
      return "no aplicable";
    case "not-found":
      return "no está en el árbol";
    case null:
      return "sin clasificar";
    default: {
      const unexpected: never = applicability;
      return unexpected;
    }
  }
}
