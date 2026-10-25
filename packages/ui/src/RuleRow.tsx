import type { RuleViolation } from "@codarch/metrics/browser";
import { formatCompact } from "@codarch/render/browser";
import { sourceLabel, violationPath, type RuleStatus } from "./rules";

/**
 * Una violación, con todo lo que el reporte sabe de ella.
 *
 * La comparten la lista del cambio y la del fichero (ADR 0058 y ADR 0059): la
 * regla, su origen, la severidad, el mensaje y, solo cuando el mensaje no lo
 * cuenta ya, la arista, la métrica con sus límites o el ciclo.
 */
export function RuleRow({
  violation,
  status,
  onSelectPath,
  otherThan,
  showStatus = false
}: {
  violation: RuleViolation;
  status: RuleStatus;
  onSelectPath: (path: string) => void;
  /** Al leer un fichero, salta al otro extremo de la violación. */
  otherThan?: string;
  /** Marca las nuevas cuando la lista no las agrupa por estado. */
  showStatus?: boolean;
}) {
  const path = otherThan
    ? (violation.files.find((file) => file !== otherThan) ??
      violationPath(violation))
    : violationPath(violation);
  const title =
    violation.files.join(", ") ||
    (violation.cycle
      ? violation.cycle.nodes.map((node) => node.path).join(" → ")
      : "Sin ruta");
  // El mensaje por defecto ya cuenta la arista, la métrica o el ciclo; solo
  // se añade el detalle cuando el mensaje es propio y no lo repite.
  const edge =
    violation.edge &&
    !(
      violation.message.includes(violation.edge.from) &&
      violation.message.includes(violation.edge.to)
    )
      ? violation.edge
      : null;
  const metric =
    violation.metric && !violation.message.includes(violation.metric.name)
      ? violation.metric
      : null;
  const cycle =
    violation.cycle &&
    !violation.message.includes(violation.cycle.nodes[0]?.path ?? "")
      ? violation.cycle
      : null;
  // En la ficha del fichero el prefijo con su propia ruta sobra: el mensaje
  // empieza por «ruta: » y el lector ya sabe en qué fichero está. El texto
  // completo sigue en el tooltip de la fila.
  const message =
    otherThan && violation.message.startsWith(`${otherThan}: `)
      ? violation.message.slice(otherThan.length + 2)
      : violation.message;

  return (
    <button
      type="button"
      className={`violation violation-${violation.severity} rules-rule rules-rule-${status}`}
      onClick={() => path && onSelectPath(path)}
      title={title}
    >
      <i />
      <span>
        <b>
          <span className="violation-name" title={violation.rule}>
            {violation.rule}
          </span>
          <em className="violation-source" title="De dónde sale la regla">
            {sourceLabel(violation.source)}
          </em>
          {showStatus && status === "introduced" ? (
            <em className="violation-source lens-new" title="No estaba en base">
              nueva
            </em>
          ) : null}
        </b>
        <small className="violation-message">{message}</small>
        {edge ? (
          <small className="rules-detail">
            {edge.from} → {edge.to}
          </small>
        ) : null}
        {metric ? (
          <small className="rules-detail">
            {metric.name} = {formatCompact(metric.value)}
            {metric.max !== undefined
              ? ` · máx. ${formatCompact(metric.max)}`
              : ""}
            {metric.min !== undefined
              ? ` · mín. ${formatCompact(metric.min)}`
              : ""}
          </small>
        ) : null}
        {cycle ? (
          <small className="rules-detail">
            ciclo de {cycle.size}:{" "}
            {cycle.nodes.map((node) => node.path).join(" → ")}
          </small>
        ) : null}
        {status === "resolved" ? (
          <small className="rules-detail">ya no está en el head</small>
        ) : null}
      </span>
    </button>
  );
}
