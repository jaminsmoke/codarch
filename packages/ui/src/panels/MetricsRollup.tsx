import type { LintArtifact } from "@codarch/lint/browser";
import {
  formatCompact,
  type RenderFile,
  type RenderModel,
  type TreeNode
} from "@codarch/render/browser";
import { CollapsibleSection } from "../CollapsibleSection";
import { lintTotals, type LintTotals } from "../lintRollup";
import { sumMetric } from "../metrics";

/**
 * Las métricas de un subárbol: el proyecto entero o una carpeta.
 *
 * No es la tabla del fichero con otro sujeto. Un fichero tiene un valor y un
 * p95; una carpeta tiene **sumas** —ficheros, líneas, errores, avisos— y el
 * único máximo que se puede leer sin inventar, la complejidad. El lint vive
 * aquí dentro, como una fila más y su tabla de carpetas, no en una sección
 * aparte: la deuda es una métrica (ADR 0095).
 *
 * La tabla de carpetas es el descenso: cada fila abre la ficha de esa carpeta,
 * que enseña lo mismo de su subárbol. Del proyecto al fichero se baja
 * seleccionando, como en el resto de la app.
 */

const scoreFormat = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 1
});

/** Una fila de la tabla de totales. */
interface RollupRow {
  key: string;
  label: string;
  value: string;
  /** Lo que se lee a la derecha del valor: la letra pequeña del total. */
  note?: string;
  title?: string;
}

function text(value: number | null): string {
  return value === null ? "—" : formatCompact(value);
}

/** La cuenta con su palabra: «1 error», «3 errores». */
function count(value: number, one: string, many: string): string {
  return `${formatCompact(value)} ${value === 1 ? one : many}`;
}

/** Las filas de totales del subárbol. */
function rollupRows(
  model: RenderModel,
  files: readonly RenderFile[],
  folderCount: number,
  totals: LintTotals | null
): RollupRow[] {
  const heaviest = files.reduce<RenderFile | null>(
    (top, file) => (!top || file.complexity > top.complexity ? file : top),
    null
  );
  const rows: RollupRow[] = [
    { key: "files", label: "Ficheros", value: formatCompact(files.length) },
    { key: "folders", label: "Carpetas", value: formatCompact(folderCount) },
    {
      key: "loc",
      label: "Líneas",
      value: text(sumMetric(model, files, "loc"))
    }
  ];

  const rloc = sumMetric(model, files, "rloc");
  if (rloc !== null) {
    rows.push({ key: "rloc", label: "Líneas de código", value: text(rloc) });
  }
  rows.push({
    key: "complexity",
    label: "Complejidad máx.",
    value: heaviest ? formatCompact(heaviest.complexity) : "—",
    // Un máximo sin dueño no es una tarea: se dice en qué fichero está.
    note: heaviest?.path,
    title: "La mayor complejidad del subárbol y el fichero que la tiene."
  });
  rows.push(
    totals
      ? {
          key: "lint",
          label: "Lint",
          value: `${count(totals.errors, "error", "errores")} · ${count(
            totals.warnings,
            "aviso",
            "avisos"
          )}`,
          note: `${count(totals.files, "fichero", "ficheros")} · score ${scoreFormat.format(
            totals.score
          )}`,
          title:
            "Errores y avisos que declara el artefacto del lint; el score es errores + ¼ de avisos."
        }
      : {
          key: "lint",
          label: "Lint",
          value: "sin medir",
          note: "con artefacto pesa 20 % en el riesgo",
          title:
            "El proyecto no tiene `.codarch/lint.json`: ejecuta `codarch lint` para medirlo."
        }
  );

  return rows;
}

export function MetricsRollup({
  id,
  model,
  files,
  folders,
  folderCount,
  lint,
  folder,
  onSelectFolder
}: {
  /** `project` o `folder`: da identidad a la sección plegable. */
  id: string;
  model: RenderModel;
  /** Los ficheros del subárbol. */
  files: readonly RenderFile[];
  /** Las carpetas que cuelgan directamente del sujeto. */
  folders: readonly TreeNode[];
  /** Las carpetas del subárbol, sin contarse a sí misma. */
  folderCount: number;
  lint: LintArtifact | null;
  /** La carpeta de la que se habla; `""` es el proyecto entero. */
  folder: string;
  onSelectFolder?: (path: string) => void;
}) {
  const totals = lintTotals(lint, folder);
  const rows = rollupRows(model, files, folderCount, totals);
  const measured = totals !== null;

  return (
    <CollapsibleSection
      id={`${id}-metrics`}
      title="Métricas"
      className="section-metrics"
      count={rows.length}
      summary={`${formatCompact(files.length)} ficheros`}
    >
      <dl className="rollup-rows">
        {rows.map((row) => (
          <div
            key={row.key}
            className={`rollup-row-data${row.key === "lint" ? " is-lint" : ""}`}
            title={row.title}
          >
            <dt>{row.label}</dt>
            <dd className="mono">{row.value}</dd>
            {row.note ? <dd className="rollup-note">{row.note}</dd> : null}
          </div>
        ))}
      </dl>

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
              <span>Fich.</span>
              <span>Err.</span>
              <span>Avis.</span>
              <span>Score</span>
            </div>
            {folders.map((child) => {
              const totals = lintTotals(lint, child.path);
              return (
                <button
                  key={child.path}
                  type="button"
                  className="rollup-table-row"
                  onClick={() => onSelectFolder?.(child.path)}
                  title={`${child.path} · ${formatCompact(
                    child.fileCount
                  )} ficheros · pulsa para abrir su ficha`}
                >
                  <span className="rollup-name" title={child.name}>
                    {child.name}/
                  </span>
                  <span className="mono">{formatCompact(child.fileCount)}</span>
                  <span className="mono">{formatCompact(totals?.errors ?? 0)}</span>
                  <span className="mono">
                    {formatCompact(totals?.warnings ?? 0)}
                  </span>
                  <span className="mono">
                    {scoreFormat.format(totals?.score ?? 0)}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      ) : null}

      {measured ? null : (
        <p className="muted tiny card-note">
          El lint no se midió: ejecuta <code>codarch lint</code> y sus errores y
          avisos entran en cada carpeta.
        </p>
      )}
    </CollapsibleSection>
  );
}
