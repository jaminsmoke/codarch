import type { DiffReport } from "@codarch/metrics/browser";
import { formatCompact, type RenderModel } from "@codarch/render/browser";
import { CollapsibleSection } from "../CollapsibleSection";
import { orderedMetrics } from "../metrics";

/**
 * Los totales del cambio, de base a head (ADR 0071, M52).
 *
 * Una fila por métrica del modelo, con su valor en cada lado y el delta. Es la
 * tabla del cambio, no la del fichero: aquí no hay p95 ni riesgo, sino lo que
 * se movió. El color del delta sigue la dirección de la métrica: bajar una
 * métrica de dirección `-1` es mejorar, subirla empeorar; sin dirección, el
 * delta no se pinta.
 *
 * Un reporte sin `totals` no pinta la sección: no se midió, que no es lo mismo
 * que no haberse movido.
 */
export function TotalsSection({
  report,
  model
}: {
  report: DiffReport;
  /** El snapshot del head, para el título y la dirección de cada métrica. */
  model?: RenderModel | null;
}) {
  const totals = report.totals;
  if (!totals) return null;

  const rows = orderedMetrics(Object.keys(totals.metrics)).flatMap((key) => {
    const metric = model?.metrics.find((entry) => entry.key === key);
    const total = totals.metrics[key];
    if (!total) return [];
    return [
      {
        key,
        title: metric?.title ?? key,
        direction: metric?.direction ?? 0,
        base: total.base,
        head: total.head,
        delta: total.delta
      }
    ];
  });
  if (rows.length === 0) return null;

  return (
    <CollapsibleSection
      id="change-totals"
      title="Totales"
      className="section-totals"
      count={rows.length}
      summary={`${rows.length} métricas`}
    >
      <div className="totals-table">
        <div className="totals-cols" aria-hidden="true">
          <span>Métrica</span>
          <span>Base</span>
          <span>Head</span>
          <span>Delta</span>
        </div>
        <div role="group" aria-label="Totales del cambio, de base a head">
          {rows.map((row) => (
            <div key={row.key} className="totals-row">
              <span className="totals-name" title={row.key}>
                {row.title}
              </span>
              <span className="mono">
                {row.base === null ? "—" : formatCompact(row.base)}
              </span>
              <span className="mono">
                {row.head === null ? "—" : formatCompact(row.head)}
              </span>
              <span className={`mono change-delta${deltaTone(row)}`}>
                {row.delta === null
                  ? "—"
                  : row.delta > 0
                    ? `+${formatCompact(row.delta)}`
                    : formatCompact(row.delta)}
              </span>
            </div>
          ))}
        </div>
      </div>
      <p className="muted tiny">
        Base y head, con el delta según la dirección de cada métrica.
      </p>
    </CollapsibleSection>
  );
}

/** El color del delta: subir una métrica de dirección `-1` empeora. */
function deltaTone({
  delta,
  direction
}: {
  delta: number | null;
  direction: number;
}): string {
  if (delta === null || delta === 0 || direction === 0) return "";
  return delta * direction > 0 ? " is-better" : " is-worse";
}
