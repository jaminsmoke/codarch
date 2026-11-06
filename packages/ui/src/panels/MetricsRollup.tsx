import type { LintArtifact } from "@codarch/lint/browser";
import {
  formatCompact,
  type RenderFile,
  type RenderModel,
  type TreeNode
} from "@codarch/render/browser";
import { CollapsibleSection } from "../CollapsibleSection";
import { lintTotals } from "../lintRollup";
import { rollupMetricRows } from "../metrics";

/**
 * Las métricas de un subárbol: el proyecto entero o una carpeta.
 *
 * Es la tabla de la ficha del fichero con otro sujeto —nombre, barra y valor—
 * porque una métrica se lee igual en las tres hojas (ADR 0060). Lo que cambia
 * es lo que se cuenta: aquí son **sumas** del subárbol, y el único máximo que se
 * puede leer sin inventar, la complejidad con su dueño. La barra, que en el
 * fichero llega al p95, aquí es la **cobertura**: la parte de los ficheros que
 * declara la métrica.
 *
 * La salud del lint —errores, avisos e info— no vive aquí: es un bloque de la
 * ficha. Esta tabla, si hay artefacto, solo baja a las carpetas hijas.
 *
 * `lint` nulo no dice «sin medir»: puede ser que no haya artefacto, y eso lo
 * dice la sección Lint, o que el mapa del resto apague este bloque a propósito.
 */

const scoreFormat = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 1
});

/** La cuenta con su palabra: «1 fichero», «3 ficheros». */
function pluralFiles(value: number): string {
  return `${formatCompact(value)} ${value === 1 ? "fichero" : "ficheros"}`;
}

export function MetricsRollup({
  id,
  model,
  files,
  folders,
  lint,
  folder,
  metricTitle,
  colorMode,
  onColorMode,
  onSelectFolder
}: {
  /** `project` o `folder`: da identidad a la sección plegable. */
  id: string;
  model: RenderModel;
  /** Los ficheros del subárbol. */
  files: readonly RenderFile[];
  /** Las carpetas que cuelgan directamente del sujeto. */
  folders: readonly TreeNode[];
  lint: LintArtifact | null;
  /** La carpeta de la que se habla; `""` es el proyecto entero. */
  folder: string;
  /** Cómo se llama cada métrica en el snapshot. */
  metricTitle: (key: string) => string;
  /** La métrica o el riesgo con el que se pinta el mapa. */
  colorMode: string;
  onColorMode: (mode: string) => void;
  onSelectFolder?: (path: string) => void;
}) {
  const measured = lintTotals(lint, folder) !== null;
  const rows = rollupMetricRows(model, files, metricTitle);
  const heaviest = rows.find((row) => row.key === "maxComplexity" && row.owner);
  const riskiest = rows.find((row) => row.key === "risk" && row.owner);
  // Cerrada, la sección enseña el total de la métrica que decide el área: es
  // la cifra con la que se compara un proyecto con una carpeta.
  const area = rows.find((row) => row.area && row.value !== null);

  return (
    <CollapsibleSection
      id={`${id}-metrics`}
      title="Métricas"
      className="section-metrics"
      count={rows.length}
      summary={
        area
          ? `${area.title} ${formatCompact(area.value ?? 0)}`
          : pluralFiles(files.length)
      }
    >
      <div className="metrics-table">
        <div className="metrics-head" aria-hidden="true">
          <span>Métrica</span>
          <span>Cob.</span>
          <span>Valor</span>
        </div>
        <div
          className="metrics-rows"
          role="group"
          aria-label="Métricas del subárbol"
        >
          {rows.map((row) => {
            const active = colorMode === row.key;
            return (
              <button
                key={row.key}
                type="button"
                className={`metrics-row metrics-${row.state}${
                  row.area ? " is-area" : ""
                }${active ? " is-active" : ""}${
                  row.value === null ? " is-empty" : ""
                }`}
                aria-pressed={active}
                title={`${row.description} ${row.hint}. Pulsa para pintar el mapa.`}
                aria-label={`${row.title}: ${row.description} ${row.hint}. Pulsa para pintar el mapa.`}
                onClick={() => onColorMode(row.key)}
              >
                <span className="metrics-label">
                  <span
                    className="metric-help"
                    title={row.description}
                    aria-hidden="true"
                  >
                    ?
                  </span>
                  {row.title}
                </span>
                <span className="metrics-bar" aria-hidden="true">
                  <i style={{ width: `${Math.round(row.share * 100)}%` }} />
                </span>
                <span className="metrics-value">
                  {row.value === null ? "—" : formatCompact(row.value)}
                </span>
              </button>
            );
          })}
        </div>
        <p className="muted tiny metrics-note">
          La barra es la parte de los ficheros que trae la métrica; el valor, su
          suma —o su máximo— en el subárbol. Pulsa una fila para pintar el mapa.
        </p>
        {heaviest ? (
          <p className="muted tiny metrics-note">
            La complejidad más alta está en <code>{heaviest.owner}</code>.
          </p>
        ) : null}
        {riskiest ? (
          <p className="muted tiny metrics-note">
            El riesgo más alto está en <code>{riskiest.owner}</code>.
          </p>
        ) : null}
      </div>

      {measured && folders.length > 0 ? (
        <div className="rollup-lint">
            <div className="rollup-head">Lint por carpeta</div>
            <div
              className="rollup-table"
              role="group"
              aria-label="Lint por carpeta"
            >
              <div className="rollup-cols" aria-hidden="true">
                <span>Carpeta</span>
                <span>Err.</span>
                <span>Avis.</span>
                <span>Info</span>
                <span>Score</span>
              </div>
              {folders.map((child) => {
                const childTotals = lintTotals(lint, child.path);
                return (
                  <button
                    key={child.path}
                    type="button"
                    className="rollup-table-row"
                    onClick={() => onSelectFolder?.(child.path)}
                    title={`${child.path} · ${pluralFiles(
                      child.fileCount
                    )} · pulsa para abrir su ficha`}
                  >
                    <span className="rollup-name" title={child.name}>
                      {child.name}/
                    </span>
                    <span className="mono">
                      {formatCompact(childTotals?.errors ?? 0)}
                    </span>
                    <span className="mono">
                      {formatCompact(childTotals?.warnings ?? 0)}
                    </span>
                    <span className="mono">
                      {formatCompact(childTotals?.info ?? 0)}
                    </span>
                    <span className="mono">
                      {scoreFormat.format(childTotals?.score ?? 0)}
                    </span>
                  </button>
                );
              })}
            </div>
        </div>
      ) : null}
    </CollapsibleSection>
  );
}
