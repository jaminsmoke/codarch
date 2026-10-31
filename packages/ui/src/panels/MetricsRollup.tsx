import type { LintArtifact } from "@codarch/lint/browser";
import {
  formatCompact,
  type RenderFile,
  type RenderModel,
  type TreeNode
} from "@codarch/render/browser";
import { CollapsibleSection, GroupHead } from "../CollapsibleSection";
import {
  SEVERITIES,
  lintTotals,
  severityCount,
  severityText
} from "../lintRollup";
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
 * El lint vive aquí dentro como un bloque, no como una fila más: los totales
 * son de esta hoja —errores, avisos e info, ficheros con hallazgos y score— y
 * Reglas cuenta las reglas que los producen, sin repetirlos (ADR 0096).
 *
 * La tabla de carpetas del lint es el descenso: cada fila abre la ficha de esa
 * carpeta, que cuenta lo mismo de su subárbol.
 */

const scoreFormat = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 1
});

/** La cuenta con su palabra: «1 fichero», «3 ficheros». */
function pluralFiles(value: number): string {
  return `${formatCompact(value)} ${value === 1 ? "fichero" : "ficheros"}`;
}

/** Las tres cuentas del lint, cada una con su tinta: nunca sumadas en gris. */
function SeverityCounts({
  counts
}: {
  counts: { errors: number; warnings: number; info: number };
}) {
  return (
    <span className="lint-counts">
      {SEVERITIES.map((severity, index) => {
        const value = severityCount(counts, severity);
        return (
          <span key={severity}>
            {index > 0 ? <span className="lint-counts-sep"> · </span> : null}
            <span
              className={`lint-count${
                value > 0 ? ` lint-count-${severity}` : " is-zero"
              }`}
            >
              {severityText(value, severity)}
            </span>
          </span>
        );
      })}
    </span>
  );
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
  const totals = lintTotals(lint, folder);
  const measured = totals !== null;
  // La cobertura y el árbol son de la pasada entera, no de la carpeta: el
  // artefacto no guarda qué fichero limpio miró cada herramienta (ADR 0098).
  const coverage = lint?.summary.measured;
  const stale = Boolean(
    lint?.meta.tree &&
      model.meta.checksum &&
      lint.meta.tree !== model.meta.checksum
  );
  const rows = rollupMetricRows(model, files, metricTitle);
  const heaviest = rows.find((row) => row.key === "maxComplexity" && row.owner);
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
      </div>

      <div className="rollup-lint">
        <GroupHead
          label="Lint"
          summary={
            totals
              ? `${pluralFiles(totals.files)} con hallazgos${
                  coverage === undefined
                    ? ""
                    : ` de ${formatCompact(coverage)} medidos`
                } · score ${scoreFormat.format(totals.score)}`
              : "sin medir"
          }
        />
        {totals ? (
          <p className="rollup-lint-counts">
            <SeverityCounts counts={totals} />
          </p>
        ) : null}
        {totals && totals.findings === 0 ? (
          <p className="lint-clean">
            {coverage === undefined
              ? "Sin hallazgos en el proyecto."
              : `Medido y limpio: ${formatCompact(coverage)} ficheros mirados, ninguno con hallazgos.`}
          </p>
        ) : null}
        {stale ? (
          <p className="muted tiny lint-stale">
            Este lint es de otro árbol: se midió antes del último análisis. Se
            vuelve a medir al guardar con el live; si no, con <code>codarch analyze</code>.
          </p>
        ) : null}

        {measured && folders.length > 0 ? (
          <>
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
          </>
        ) : null}

        {measured ? null : (
          <p className="muted tiny card-note">
            El lint no se midió: ejecuta <code>codarch analyze</code> y sus
            errores, avisos e info entran en cada carpeta.
          </p>
        )}
      </div>
    </CollapsibleSection>
  );
}
