import { useEffect, useState } from "react";
import type { DiffReport } from "@codarch/metrics/browser";
import type { HistoryEntry } from "@codarch/schema/browser";
import { formatCompact } from "@codarch/render/browser";
import {
  changeFileGroups,
  deltaLabel,
  filesSummary,
  rowTitle,
  type ChangeFileRow
} from "./changeFiles";
import { CollapsibleSection, GroupHead } from "./CollapsibleSection";

/** Cuántas fotos del histórico se enseñan sin pedir más. */
const HISTORY_ROWS = 8;

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
 * Si el reporte trae algo que enseñar: ficheros, aristas o ciclos.
 *
 * Las reglas no cuentan: no son un cambio del código sino una lectura de la
 * configuración, y viven en la ficha del fichero (ADR 0075). Las métricas y
 * los símbolos tampoco: un cambio de métrica siempre viene con su fichero en
 * `changed`.
 */
export function reportHasChanges(report: DiffReport): boolean {
  const summary = report.summary;
  return (
    summary.addedFiles + summary.removedFiles + summary.changedFiles > 0 ||
    summary.addedEdges + summary.removedEdges > 0 ||
    summary.introducedCycles + summary.fixedCycles > 0
  );
}

/**
 * Las fotos del repo, de la más nueva a la más vieja, con su delta de rloc.
 *
 * El delta se mide contra la foto anterior: lo que trajo esa foto, no el total.
 */
export function historyRows(
  entries: readonly HistoryEntry[]
): Array<{ entry: HistoryEntry; rlocDelta: number | null }> {
  const newestFirst = entries.slice().reverse();
  return newestFirst.map((entry, index) => {
    const older = newestFirst[index + 1];
    return {
      entry,
      rlocDelta: older ? entry.rloc - older.rloc : null
    };
  });
}

interface ChangesPanelProps {
  report: DiffReport | null;
  source: string | null;
  error: string | null;
  onLoad: () => void;
  onSelectPath: (path: string) => void;
  /** El histórico del repo abierto; sin esto, la sección no se pinta. */
  loadHistory?: () => Promise<HistoryEntry[] | null>;
  /** Abrir una foto del histórico. */
  onOpenHistory?: (entry: HistoryEntry) => void;
}

/**
 * La pestaña de cambios: lo que el árbol de trabajo tiene distinto de su
 * último commit (ADR 0075).
 *
 * Solo pinta el reporte HEAD. Un `report.json` de dos fotos viejas no entra
 * aquí: enseñaría cambios de hace semanas como si fueran de ahora.
 *
 * Empieza por una línea de cifras y por los ficheros tocados, que es lo que se
 * viene a ver, y deja el resto —símbolos, migración y ciclos— plegado: su
 * cuenta se lee en el encabezado sin abrir nada. Las reglas no están: no son
 * un cambio del código y viven en la ficha del fichero. Los hotspots van
 * dentro de Ficheros porque son una vista de esos mismos ficheros (ADR 0072),
 * y el histórico de fotos va al final, aparte, porque no es el cambio actual.
 */
export default function ChangesPanel({
  report,
  source,
  error,
  onLoad,
  onSelectPath,
  loadHistory,
  onOpenHistory
}: ChangesPanelProps) {
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);

  useEffect(() => {
    if (!loadHistory) return;
    let cancelled = false;
    void (async () => {
      const list = await loadHistory();
      if (!cancelled) setHistory(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadHistory]);

  if (!report) {
    return (
      <section className="change-panel">
        <div className="eyebrow">Cambios</div>
        <h2>Sin git en esta carpeta</h2>
        <p className="muted small">
          Esta pestaña compara el árbol de trabajo con el último commit del
          repositorio. Sin git ligado a la carpeta no hay nada con lo que
          comparar, así que no hay cambios que enseñar ni forma de verlos en
          vivo.
        </p>
        <p className="muted small">
          Un <code>report.json</code> abierto a mano sí se puede ver.
        </p>
        <button className="button dark" type="button" onClick={onLoad}>
          Abrir reporte
        </button>
        {error ? <p className="panel-error">{error}</p> : null}
      </section>
    );
  }

  const summary = report.summary;
  // Un HEAD sin diferencias no tiene nada que enseñar: lo dice, en vez de una
  // lista vacía (ADR 0072).
  if (!reportHasChanges(report)) {
    return (
      <section className="change-panel">
        <div className="eyebrow">Cambios · {source ?? "HEAD"}</div>
        <h2>Sin cambios desde el último commit</h2>
        <p className="muted small">
          El árbol de trabajo coincide con su último commit en ficheros,
          aristas y ciclos.
        </p>
      </section>
    );
  }

  const hotspots = report.hotspots;
  const fileGroups = changeFileGroups(report.files);
  const totalFiles = fileGroups.reduce((sum, group) => sum + group.count, 0);
  const cycles = report.cycles.introduced.slice(0, 4);
  const migration = report.migration;
  const increased = migration?.files.increased.slice(0, 6) ?? [];
  const decreased = migration?.files.decreased.slice(0, 6) ?? [];
  const symbols = report.symbols;
  const symbolFiles = symbols?.files.slice(0, 6) ?? [];
  const photos = historyRows(history ?? []);

  return (
    <section className="change-panel">
      <div className="eyebrow">
        Cambios · {source ?? "HEAD"}{" "}
        <span className="mono">
          {report.base.checksum.slice(0, 8) || "base"}→
          {report.head.checksum.slice(0, 8) || "head"}
        </span>
      </div>
      <h2>Cambios</h2>

      {/* Una sola línea de cifras: el resto sobra hasta que se abre. */}
      <div className="change-summary">
        <span>
          ficheros{" "}
          <b className="mono">
            +{summary.addedFiles} −{summary.removedFiles} ~{summary.changedFiles}
          </b>
        </span>
        <span>
          aristas <b className="mono">+{summary.addedEdges} −{summary.removedEdges}</b>
        </span>
        <span>
          ciclos{" "}
          <b className={`mono${summary.introducedCycles > 0 ? " is-worse" : ""}`}>
            +{summary.introducedCycles} −{summary.fixedCycles}
          </b>
        </span>
      </div>

      {/* Lo tocado, primero: es lo que se viene a ver a esta pestaña. */}
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
              <div key={group.status} className={`change-group is-${group.status}`}>
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

        {/* Los hotspots son una vista de estos mismos ficheros (ADR 0072). */}
        {hotspots.length > 0 ? (
          <div className="change-group">
            <GroupHead
              label="Hotspots"
              summary={`${report.hotspotMetric ?? "métrica"} · ${hotspots.length}`}
            />
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
          </div>
        ) : null}
      </CollapsibleSection>

      {/* Sin ficheros que hayan movido la deuda no hay nada que contar. */}
      {migration && increased.length + decreased.length > 0 ? (
        <CollapsibleSection
          id="change-migration"
          title="Migración"
          className="section-changes-migration"
          defaultOpen={false}
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
            <p className="muted small">La deuda de migración no ha cambiado.</p>
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
          defaultOpen={false}
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
          defaultOpen={false}
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

      {/* El histórico es su propia sección: no se mezcla con el cambio actual. */}
      {photos.length > 0 ? (
        <CollapsibleSection
          id="change-history"
          title="Histórico del repo"
          className="section-history"
          defaultOpen={false}
          count={photos.length}
          summary={`${photos[0]?.entry.files ?? 0} ficheros · ${formatCompact(photos[0]?.entry.rloc ?? 0)} rloc`}
        >
          {/* No son los cambios de ahora: son las fotos que el repo guarda con
              `codarch analyze --history` (ADR 0075). Se dice para que nadie
              lea una fecha vieja como un cambio reciente. */}
          <p className="muted tiny">
            Fotos guardadas del repositorio, de la más nueva a la más vieja. No
            son los cambios del último commit: eso está arriba.
          </p>
          <div className="history-list">
            {photos.slice(0, HISTORY_ROWS).map(({ entry, rlocDelta }) => (
              <HistoryRow
                key={entry.checksum}
                entry={entry}
                rlocDelta={rlocDelta}
                onOpen={onOpenHistory}
              />
            ))}
          </div>
        </CollapsibleSection>
      ) : null}
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

/** Una foto del histórico: cuándo, qué commit y qué trajo. */
function HistoryRow({
  entry,
  rlocDelta,
  onOpen
}: {
  entry: HistoryEntry;
  rlocDelta: number | null;
  onOpen?: (entry: HistoryEntry) => void;
}) {
  const when = entry.date.slice(0, 16).replace("T", " ");
  const body = (
    <>
      <span className="mono history-date">{when}</span>
      <span className="change-path">
        {entry.commit ? entry.commit.slice(0, 7) : "sin commit"}
      </span>
      <span className="mono history-count">
        {entry.files} f.
        {rlocDelta !== null && rlocDelta !== 0 ? (
          <>
            {" "}
            <b className={rlocDelta > 0 ? "is-worse" : "is-better"}>
              {rlocDelta > 0 ? `+${rlocDelta}` : rlocDelta}
            </b>
          </>
        ) : null}
      </span>
    </>
  );

  if (!onOpen) {
    return <div className="history-row is-static">{body}</div>;
  }

  return (
    <button
      type="button"
      className="history-row"
      title={`${entry.files} ficheros · ${entry.rloc} rloc`}
      onClick={() => onOpen(entry)}
    >
      {body}
    </button>
  );
}
