import { RISK_WEIGHTS_WITH_LINT } from "@codarch/metrics/browser";
import { formatCompact } from "@codarch/render/browser";
import type { RenderFile } from "@codarch/render/browser";

/**
 * El desglose del riesgo del fichero, dentro de Métricas.
 *
 * Las reglas y la deuda de migración ya no viven aquí: la vista de código no
 * tiene sección **Reglas** (ADR 0104), y los cruces FFI se leen en
 * Dependencias.
 */

type Signal = "complexity" | "churn" | "size" | "lint";

const SIGNAL_LABEL: Record<Signal, string> = {
  complexity: "Complejidad",
  churn: "Churn",
  size: "Tamaño",
  lint: "Lint"
};

const SIGNALS = Object.keys(SIGNAL_LABEL) as Signal[];

const weightFormat = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 1
});

/** Un peso de la composición, con su decimal cuando lo tiene (25,6 %). */
function formatWeight(weight: number): string {
  return `${weightFormat.format(weight * 100)} %`;
}

/**
 * El porqué del riesgo, en palabras.
 *
 * Los pesos se leen del propio modelo: con lint son otros, y no conviene
 * repetirlos aquí. Sin artefacto, se dice que el lint no se midió y lo que
 * pesará cuando lo haya, para que el 20 % no aparezca de la nada. Si falta
 * alguna de las otras señales, se dice cuál: su peso se reparte entre las
 * demás, y un snapshot sin ninguna no trae riesgo que explicar.
 */
export function riskNote(
  parts: RenderFile["riskParts"],
  measured: boolean,
  missing: readonly Signal[]
): string {
  const names = missing
    .map((signal) => SIGNAL_LABEL[signal].toLowerCase())
    .join(" ni ");

  if (missing.length === 3) {
    return measured
      ? "Este snapshot no trae complejidad, churn ni tamaño: el riesgo es solo el lint."
      : "Este snapshot no trae las señales del riesgo, y el lint no se midió.";
  }

  if (!measured) {
    const three =
      missing.length === 0
        ? `${SIGNAL_LABEL.complexity} ${formatWeight(parts.complexity.weight)} · churn ${formatWeight(
            parts.churn.weight
          )} · tamaño ${formatWeight(parts.size.weight)}`
        : `Sin ${names}, el peso se reparte entre las demás señales`;
    const lint = RISK_WEIGHTS_WITH_LINT;
    return `${three}. El lint no se midió: con artefacto pesa ${formatWeight(
      lint.lint
    )} y los demás bajan a ${formatWeight(lint.complexity)} · ${formatWeight(
      lint.churn
    )} · ${formatWeight(lint.size)}.`;
  }
  if (missing.length > 0) {
    return `Sin ${names}: su peso se reparte entre las demás señales.`;
  }
  const weights = SIGNALS.map(
    (signal) => `${SIGNAL_LABEL[signal].toLowerCase()} ${formatWeight(parts[signal].weight)}`
  ).join(" · ");
  return `${weights}, normalizado por el p95 de cada señal.`;
}

/**
 * De dónde sale el riesgo, dentro de Métricas.
 *
 * El valor y la barra ya están en la primera fila de la tabla; esto solo
 * separa las señales que lo componen, con su peso y el p95 del proyecto. El
 * lint es siempre la cuarta: si el proyecto no lo midió, la fila lo dice —sin
 * medir— en vez de desaparecer (ADR 0094).
 */
export function RiskBreakdown({ file }: { file: RenderFile }) {
  const parts = file.riskParts;
  const measured = parts.lint.weight > 0;
  const missing = SIGNALS.filter(
    (signal) => signal !== "lint" && parts[signal].weight === 0
  );

  return (
    <div className="risk-breakdown">
      <div className="risk-head">De dónde sale el riesgo</div>
      <div className="risk-bars">
        {SIGNALS.map((signal) => {
          const part = parts[signal];
          const unmeasured = signal === "lint" && !measured;
          return (
            <div
              key={signal}
              className={unmeasured ? "risk-bar-row unmeasured" : "risk-bar-row"}
              title={
                unmeasured
                  ? "El lint no se midió: ejecuta `codarch lint` y el riesgo le dará un 20 %"
                  : `${formatCompact(part.value)} de p95 ${formatCompact(
                      part.p95
                    )} · peso ${formatWeight(part.weight)}`
              }
            >
              <span>{SIGNAL_LABEL[signal]}</span>
              <span className="risk-bar">
                <i style={{ width: `${Math.round(part.norm * 100)}%` }} />
              </span>
              <span className="mono">
                {unmeasured ? "—" : formatCompact(part.value)}
              </span>
              <span className="risk-weight">
                {unmeasured ? "sin medir" : `${Math.round(part.weight * 100)} %`}
              </span>
            </div>
          );
        })}
      </div>
      <p className="muted tiny risk-note">
        {riskNote(parts, measured, missing)}
      </p>
      <p className="muted tiny mono risk-p95">
        p95 del proyecto · complejidad {formatCompact(parts.complexity.p95)} ·
        churn {formatCompact(parts.churn.p95)} · tamaño{" "}
        {formatCompact(parts.size.p95)}
        {measured ? ` · lint ${formatCompact(parts.lint.p95)}` : ""}
      </p>
    </div>
  );
}
