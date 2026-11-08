import type { RiskBreakdown as IndexBreakdown } from "@codarch/metrics/browser";
import { formatCompact, type RenderFile, type RenderModel } from "@codarch/render/browser";
import { CollapsibleSection } from "../CollapsibleSection";
import { RiskBreakdown } from "../FileSections";
import { fileMetricRows } from "../metrics";

/**
 * Las métricas del fichero, con su barra y el riesgo desglosado.
 *
 * En el mapa del resto no hay riesgo que enseñar: un documento no tiene
 * complejidad ni churn, y el que saldría es su tamaño con otro nombre (ADR
 * 0093). Ahí solo queda la métrica.
 */
export function MetricsSection({
  model,
  file,
  areaMetric,
  colorMode,
  metricTitle,
  showRisk = true,
  breakdown = null,
  onColorMode
}: {
  model: RenderModel | null;
  file: RenderFile;
  areaMetric: string | null;
  colorMode: string;
  metricTitle: (key: string) => string;
  /** `false` en el mapa del resto: no hay riesgo ni desglose. */
  showRisk?: boolean;
  /**
   * El desglose que ya trae el motor. `null` si el render no lo entrega:
   * la ficha no lo recalcula.
   */
  breakdown?: IndexBreakdown | null;
  onColorMode: (mode: string) => void;
}) {
  const rows = fileMetricRows(
    model,
    file,
    areaMetric,
    metricTitle,
    breakdown
  ).filter((row) => showRisk || !row.risk);

  return (
    <CollapsibleSection
      id="file-metrics"
      title="Métricas"
      className="section-metrics"
      count={rows.length}
      summary={
        !showRisk || rows[0]?.value === null || rows[0]?.value === undefined
          ? undefined
          : `Riesgo ${rows[0].value}/100`
      }
    >
      <div className="metrics-table">
        <div className="metrics-head" aria-hidden="true">
          <span>Métrica</span>
          <span>Escala</span>
          <span>Valor</span>
        </div>
        <div
          className="metrics-rows"
          role="group"
          aria-label="Métricas del fichero"
        >
          {rows.map((row) => (
            <MetricRow
              key={row.key}
              row={row}
              colorMode={colorMode}
              onColorMode={onColorMode}
            />
          ))}
        </div>
        <p className="muted tiny metrics-note">
          {showRisk
            ? "La barra llega al p95 del proyecto; el riesgo, a 100. Pulsa una fila para pintar el mapa."
            : "La barra llega al p95 del proyecto. Pulsa una fila para pintar el mapa."}
        </p>
        {showRisk ? <RiskBreakdown breakdown={breakdown} /> : null}
      </div>
    </CollapsibleSection>
  );
}

/** Una fila de métrica: pulsa para pintar el mapa por ella. */
function MetricRow({
  row,
  colorMode,
  onColorMode
}: {
  row: ReturnType<typeof fileMetricRows>[number];
  colorMode: string;
  onColorMode: (mode: string) => void;
}) {
  const active = row.risk ? colorMode === "risk" : colorMode === row.key;
  const why = row.area ? " Esta métrica decide el área del mapa." : "";

  return (
    <button
      type="button"
      className={`metrics-row metrics-${row.state}${
        row.area ? " is-area" : ""
      }${active ? " is-active" : ""}${row.value === null ? " is-empty" : ""}`}
      aria-pressed={active}
      title={`${row.description} ${row.hint}.${why} Pulsa para pintar el mapa.`}
      aria-label={`${row.title}: ${row.description} ${row.hint}.${why} Pulsa para pintar el mapa.`}
      onClick={() => onColorMode(row.risk ? "risk" : row.key)}
    >
      <span className="metrics-label">
        <span className="metric-help" title={row.description} aria-hidden="true">
          ?
        </span>
        {row.title}
      </span>
      <span className="metrics-bar" aria-hidden="true">
        <i style={{ width: `${Math.round(row.share * 100)}%` }} />
      </span>
      <span className="metrics-value">
        {row.value === null ? "—" : formatCompact(row.value)}
        {row.risk && row.value !== null ? <em>/100</em> : null}
      </span>
    </button>
  );
}
