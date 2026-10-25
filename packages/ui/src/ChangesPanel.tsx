import type { DiffReport } from "@codarch/metrics/browser";
import { formatCompact } from "@codarch/render/browser";
import {
  changeFileGroups,
  deltaLabel,
  filesSummary,
  rowTitle,
  type ChangeFileRow
} from "./changeFiles";
import { CollapsibleSection, GroupHead } from "./CollapsibleSection";
import { RuleRow } from "./RuleRow";
import { countBySource, type RuleStatus } from "./rules";

/** El orden en el que se leen los tres grupos de reglas. */
/**
 * El orden en el que se leen los tres grupos de reglas.
 *
 * La cuenta en palabras del encabezado («3 nuevas») ya dice cuándo un grupo
 * está vacío, así que no se repite con una frase debajo.
 */
const GROUPS: Array<{
  status: RuleStatus;
  title: string;
  one: string;
  many: string;
}> = [
  { status: "introduced", title: "Nuevas", one: "nueva", many: "nuevas" },
  { status: "existing", title: "Existentes", one: "existente", many: "existentes" },
  { status: "resolved", title: "Resueltas", one: "resuelta", many: "resueltas" }
];

/** Un grupo largo se corta aquí; el reporte sigue teniendo el resto. */
const MAX_ROWS = 25;

/** Lo que se dice de un símbolo que apareció, se fue o cambió. */
const SYMBOL_STATUS = {
  added: "nuevo",
  removed: "eliminado",
  changed: "cambió"
} as const;

/** Los símbolos tocados de un fichero. */
type SymbolChanges = NonNullable<DiffReport["symbols"]>["files"][number]["symbols"];

/**
 * El delta de un fichero, con el formato de la fila de Ficheros: `+2 −1 ~3`.
 *
 * Cuenta símbolos, no complejidad: el detalle de cada uno vive en la ficha del
 * fichero, que es donde se puede abrir su código.
 */
function symbolDelta(symbols: SymbolChanges): string {
  const of = (status: keyof typeof SYMBOL_STATUS): number =>
    symbols.filter((symbol) => symbol.status === status).length;
  return `+${of("added")} −${of("removed")} ~${of("changed")}`;
}

/** Lo que el tooltip cuenta de un fichero: sus símbolos, sin abrir nada. */
function symbolTitle(path: string, symbols: SymbolChanges): string {
  const shown = symbols
    .slice(0, 4)
    .map((symbol) => `${symbol.name} (${SYMBOL_STATUS[symbol.status]})`);
  if (symbols.length > shown.length) {
    shown.push(`y ${symbols.length - shown.length} más`);
  }
  return `${path} · ${shown.join(" · ")}`;
}

/**
 * Si el reporte trae algo que enseñar: ficheros, aristas, ciclos o reglas.
 *
 * Las métricas y los símbolos no cuentan por sí solas: un cambio de métrica
 * siempre viene con su fichero en `changed`.
 */
export function reportHasChanges(report: DiffReport): boolean {
  const summary = report.summary;
  const rules = report.rules.summary;
  return (
    summary.addedFiles + summary.removedFiles + summary.changedFiles > 0 ||
    summary.addedEdges + summary.removedEdges > 0 ||
    summary.introducedCycles + summary.fixedCycles > 0 ||
    rules.introduced + rules.existing + rules.resolved > 0
  );
}

interface ChangesPanelProps {
  report: DiffReport | null;
  source: string | null;
  error: string | null;
  onLoad: () => void;
  onSelectPath: (path: string) => void;
}

/**
 * La pestaña de cambios: qué se ha movido entre base y head.
 *
 * Empieza por lo que rompe —las reglas del cambio, con sus nuevas, existentes y
 * resueltas— y sigue con los hotspots, la migración, los símbolos, los ciclos y
 * una sola lista de ficheros (ADR 0070). Las reglas viven aquí y no en una
 * pestaña propia desde el ADR 0069: son del cambio, no del fichero.
 *
 * Cada bloque es una sección plegable de la ficha, con su punto de color, su
 * cuenta y un resumen que dice lo importante cuando está cerrada (ADR 0069).
 * Las subsecciones de reglas usan el mismo encabezado que Dominio y Migración
 * en el fichero, y las listas, el ritmo de filas de la tabla de Métricas.
 */
export default function ChangesPanel({
  report,
  source,
  error,
  onLoad,
  onSelectPath
}: ChangesPanelProps) {
  if (!report) {
    return (
      <section className="change-panel">
        <div className="eyebrow">Cambios</div>
        <h2>Sin reporte</h2>
        <p className="muted small">
          Carga el <code>report.json</code> que genera <code>codarch diff</code>{" "}
          o la GitHub Action para ver los cambios del snapshot.
        </p>
        <button className="button dark" type="button" onClick={onLoad}>
          Abrir reporte
        </button>
        {error ? <p className="panel-error">{error}</p> : null}
      </section>
    );
  }

  const summary = report.summary;
  const rules = report.rules;
  // Un HEAD sin diferencias no tiene nada que enseñar: lo dice, en vez de una
  // lista vacía (ADR 0072).
  if (!reportHasChanges(report)) {
    return (
      <section className="change-panel">
        <div className="eyebrow">Cambios · {source ?? "HEAD"}</div>
        <h2>Sin cambios desde el último commit</h2>
        <p className="muted small">
          El working tree coincide con su último commit en ficheros, aristas,
          ciclos y reglas.
        </p>
      </section>
    );
  }
  const ruleSummary = rules.summary;
  const allViolations = [
    ...rules.violations.introduced,
    ...rules.violations.existing,
    ...rules.violations.resolved
  ];
  const sources = countBySource(allViolations);
  const hotspots = report.hotspots;
  const fileGroups = changeFileGroups(report.files);
  const totalFiles = fileGroups.reduce((sum, group) => sum + group.count, 0);
  const cycles = report.cycles.introduced.slice(0, 4);
  const migration = report.migration;
  const increased = migration?.files.increased.slice(0, 6) ?? [];
  const decreased = migration?.files.decreased.slice(0, 6) ?? [];
  const symbols = report.symbols;
  const symbolFiles = symbols?.files.slice(0, 6) ?? [];

  /** El reparto de reglas del cambio, para el resumen de la sección plegada. */
  const ruleParts = [
    ruleSummary.introduced > 0
      ? `${ruleSummary.introduced} nueva${ruleSummary.introduced === 1 ? "" : "s"}`
      : null,
    ruleSummary.existing > 0
      ? `${ruleSummary.existing} existente${ruleSummary.existing === 1 ? "" : "s"}`
      : null,
    ruleSummary.resolved > 0
      ? `${ruleSummary.resolved} resuelta${ruleSummary.resolved === 1 ? "" : "s"}`
      : null
  ].filter((part) => part !== null);

  return (
    <section className="change-panel">
      <div className="eyebrow">Cambios · {source ?? "report.json"}</div>
      <h2>Cambios de arquitectura</h2>
      <div className="change-checksums mono">
        {report.base.checksum.slice(0, 8) || "base"} →{" "}
        {report.head.checksum.slice(0, 8) || "head"}
      </div>

      {summary.addedEdges +
      summary.removedEdges +
      summary.introducedCycles +
      summary.fixedCycles >
      0 ? (
        <div className="change-line">
          <span>
            Aristas <b className="mono">+{summary.addedEdges}</b>{" "}
            <b className="mono">−{summary.removedEdges}</b>
          </span>{" "}
          <span>
            Ciclos{" "}
            <b
              className={`mono${
                summary.introducedCycles > 0 ? " is-worse" : ""
              }`}
            >
              +{summary.introducedCycles}
            </b>{" "}
            <b className="mono">−{summary.fixedCycles}</b>
          </span>
        </div>
      ) : null}

      <CollapsibleSection
        id="change-rules"
        title="Reglas"
        className="section-changes-rules"
        count={allViolations.length}
        summary={ruleParts.join(" · ") || "sin violaciones"}
      >
        {!rules.configured ? (
          <p className="muted small">
            Este reporte no trae reglas de arquitectura. Añádelas a{" "}
            <code>.codarch.yml</code> para que el diff las evalúe.
          </p>
        ) : (
          <>
            <p className="rules-meta">
              {ruleSummary.introducedWarnings} aviso
              {ruleSummary.introducedWarnings === 1 ? "" : "s"} nuevo
              {ruleSummary.introducedWarnings === 1 ? "" : "s"} ·{" "}
              {ruleSummary.rules} regla{ruleSummary.rules === 1 ? "" : "s"} en{" "}
              {ruleSummary.layers} capa{ruleSummary.layers === 1 ? "" : "s"}
              {rules.profile ? (
                <>
                  {" "}
                  · perfil <b>{rules.profile}</b>
                </>
              ) : null}
              {sources.length > 0 ? (
                <>
                  {" "}
                  · origen{"\u00a0"}
                  {sources.map((entry, index) => (
                    <span key={entry.source}>
                      {index > 0 ? " · " : ""}
                      {entry.label} <b>{entry.count}</b>
                    </span>
                  ))}
                </>
              ) : null}
            </p>

            {GROUPS.map((group) => {
              const rows = rules.violations[group.status];
              return (
                <div className="rule-group" key={group.status}>
                  <GroupHead
                    label={group.title}
                    summary={
                      rows.length === 0
                        ? "ninguna"
                        : `${rows.length} ${rows.length === 1 ? group.one : group.many}`
                    }
                  />
                  {rows.length === 0 ? null : (
                    <div className="violation-list">
                      {rows.slice(0, MAX_ROWS).map((violation) => (
                        <RuleRow
                          key={violation.key}
                          violation={violation}
                          status={group.status}
                          onSelectPath={onSelectPath}
                        />
                      ))}
                    </div>
                  )}
                  {rows.length > MAX_ROWS ? (
                    <p className="muted tiny">
                      y {rows.length - MAX_ROWS} más en el reporte.
                    </p>
                  ) : null}
                </div>
              );
            })}
          </>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        id="change-hotspots"
        title="Hotspots"
        className="section-hotspots"
        count={hotspots.length}
        summary={report.hotspotMetric ?? "métrica"}
      >
        <p className="rules-meta">
          Los que más se mueven en{" "}
          <b>{report.hotspotMetric ?? "la métrica del cambio"}</b>.
        </p>
        {hotspots.length === 0 ? (
          <p className="muted small">
            Ningún fichero destaca en la métrica del cambio.
          </p>
        ) : (
          <div className="change-rows">
            {hotspots.map((hotspot) => (
              <button
                key={`${hotspot.id}-${hotspot.metric}`}
                type="button"
                className="change-row"
                title={hotspot.path}
                onClick={() => onSelectPath(hotspot.path)}
              >
                <span className="change-path">{hotspot.path}</span>
                <span
                  className={`mono change-delta${
                    hotspot.delta > 0 ? " is-worse" : ""
                  }`}
                >
                  {formatCompact(hotspot.base)} → {formatCompact(hotspot.head)}
                </span>
              </button>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {migration ? (
        <CollapsibleSection
          id="change-migration"
          title="Migración"
          className="section-changes-migration"
          count={increased.length + decreased.length}
          summary={`deuda ${formatCompact(migration.debt.base)} → ${formatCompact(migration.debt.head)}`}
        >
          <div className="change-summary">
            <span>
              deuda <b>{migration.debt.base}</b> → <b>{migration.debt.head}</b>
            </span>
            <span>
              cruces FFI <b>{migration.crossings.head}</b>
            </span>
            <span>
              nativos <b>{migration.status.head.native ?? 0}</b>
            </span>
          </div>
          {increased.length === 0 && decreased.length === 0 ? (
            <p className="muted small">
              La deuda de migración no ha cambiado.
            </p>
          ) : (
            <div className="change-rows">
              {increased.map((file) => (
                <MigrationRow
                  key={file.id}
                  path={file.path}
                  before={file.base}
                  after={file.head}
                  onSelectPath={onSelectPath}
                />
              ))}
              {decreased.map((file) => (
                <MigrationRow
                  key={file.id}
                  path={file.path}
                  before={file.base}
                  after={file.head}
                  onSelectPath={onSelectPath}
                />
              ))}
            </div>
          )}
        </CollapsibleSection>
      ) : null}

      {symbols && symbolFiles.length > 0 ? (
        <CollapsibleSection
          id="change-symbols"
          title="Símbolos"
          className="section-changes-symbols"
          count={symbolFiles.length}
          summary={`+${symbols.summary.added} −${symbols.summary.removed} ~${symbols.summary.changed}`}
        >
          <div className="change-rows">
            {symbolFiles.map((file) => (
              <button
                key={file.id}
                type="button"
                className="change-row"
                title={symbolTitle(file.path, file.symbols)}
                onClick={() => onSelectPath(file.path)}
              >
                <span className="change-path">{file.path}</span>
                <span className="mono change-delta">
                  {symbolDelta(file.symbols)}
                </span>
              </button>
            ))}
          </div>
        </CollapsibleSection>
      ) : null}

      {cycles.length > 0 ? (
        <CollapsibleSection
          id="change-cycles"
          title="Ciclos nuevos"
          className="section-cycles"
          count={report.cycles.introduced.length}
        >
          <div className="change-rows">
            {cycles.map((cycle, index) => (
              <div key={index} className="change-cycle">
                <span className="mono">×{cycle.size}</span>
                <span
                  className="change-path"
                  title={cycle.nodes.map((node) => node.path).join(" → ")}
                >
                  {cycle.nodes.map((node) => node.path).join(" → ")}
                </span>
              </div>
            ))}
          </div>
          {report.cycles.introduced.length > cycles.length ? (
            <p className="muted tiny">
              +{report.cycles.introduced.length - cycles.length} más
            </p>
          ) : null}
        </CollapsibleSection>
      ) : null}

      <CollapsibleSection
        id="change-files"
        title="Ficheros"
        className="section-files"
        count={totalFiles}
        summary={filesSummary(fileGroups)}
      >
        {totalFiles === 0 ? (
          <p className="muted small">Sin ficheros tocados.</p>
        ) : (
          fileGroups
            .filter((group) => group.count > 0)
            .map((group) => (
              <div
                key={group.status}
                className={`change-group is-${group.status}`}
              >
                <GroupHead label={group.title} summary={String(group.count)} />
                <div className="change-rows">
                  {group.files.map((file) => (
                    <FileChangeRow
                      key={file.id}
                      file={file}
                      letter={group.letter}
                      onSelectPath={onSelectPath}
                    />
                  ))}
                </div>
                {group.rest > 0 ? (
                  <p className="muted tiny">+{group.rest} más</p>
                ) : null}
              </div>
            ))
        )}
      </CollapsibleSection>
    </section>
  );
}

/**
 * Una fila de **Ficheros**: la letra del estado, la ruta y el delta (ADR 0070).
 *
 * El eliminado no es un botón: no está en el snapshot del head y no hay ficha
 * que abrir. La fila lo dice en el tooltip en vez de fingir que lleva a algo.
 */
function FileChangeRow({
  file,
  letter,
  onSelectPath
}: {
  file: ChangeFileRow;
  letter: "A" | "M" | "D";
  onSelectPath: (path: string) => void;
}) {
  const body = (
    <>
      <span className={`change-status is-${file.status}`} aria-hidden="true">
        {letter}
      </span>
      <span className="change-path">{file.path}</span>
      <span className="mono change-delta">{deltaLabel(file)}</span>
    </>
  );

  if (file.status === "removed") {
    return (
      <div className="change-row file-row is-static" title={rowTitle(file)}>
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="change-row file-row"
      title={rowTitle(file)}
      onClick={() => onSelectPath(file.path)}
    >
      {body}
    </button>
  );
}

function MigrationRow({
  path,
  before,
  after,
  onSelectPath
}: {
  path: string;
  before: number | null;
  after: number | null;
  onSelectPath: (path: string) => void;
}) {
  const delta = (after ?? 0) - (before ?? 0);
  return (
    <button
      className="change-row"
      type="button"
      onClick={() => onSelectPath(path)}
    >
      <span className="change-path">{path}</span>
      <span
        className={`mono change-delta${delta > 0 ? " is-worse" : " is-better"}`}
      >
        {before ?? 0} → {after ?? 0} ({delta > 0 ? `+${delta}` : delta})
      </span>
    </button>
  );
}
