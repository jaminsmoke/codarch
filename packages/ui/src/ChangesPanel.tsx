import { useEffect, useState } from "react";
import type { DiffReport } from "@codarch/metrics/browser";
import type { HistoryEntry } from "@codarch/schema/browser";
import { formatCompact, type RenderModel } from "@codarch/render/browser";
import type { FileDiffView } from "./platform";
import {
  changeFileGroups,
  deltaLabel,
  deltaTone,
  filesSummary,
  rowTitle,
  type ChangeFileRow,
  type ChangeFileSymbols,
  type ChangeSymbol
} from "./changeFiles";
import { CollapsibleSection, GroupHead } from "./CollapsibleSection";
import { CHURN_METRIC } from "./labels";
import { balanceSummary, debtBalance } from "./balance";

/** Cuántas fotos del histórico se enseñan sin pedir más. */
const HISTORY_ROWS = 8;

/** Cuántos ficheros lleva la lista de los más tocados. */
const TOUCHED_ROWS = 8;

/** Lo que se dice de un símbolo que apareció, se fue o cambió. */
const SYMBOL_STATUS = {
  added: "nuevo",
  removed: "eliminado",
  changed: "cambió"
} as const;

/** La letra de un símbolo en el desplegable, como la de un fichero. */
const SYMBOL_LETTER = {
  added: "A",
  removed: "D",
  changed: "~"
} as const;

/** Cuántos símbolos del desplegable se pintan antes de contar el resto. */
const SYMBOL_ROWS = 12;

/** Lo que el tooltip del galón cuenta: cuántos símbolos hay detrás. */
function symbolTitle(path: string, symbols: ChangeFileSymbols): string {
  return `${path} · ${symbols.items.length} símbolos tocados`;
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

/**
 * Los ficheros que más se han tocado, por commits.
 *
 * Es la lista que el raíl tenía como **Más tocados**: churn del snapshot, no
 * del cambio. Se lee con el histórico porque cuenta lo mismo —lo que el repo
 * lleva hecho—, no lo que el árbol tiene ahora mismo.
 */
export function touchedRows(
  model: RenderModel | null | undefined
): Array<{ path: string; commits: number }> {
  if (!model) return [];
  const index = model.metrics.findIndex((metric) => metric.key === CHURN_METRIC);
  if (index < 0) return [];

  return model.files
    .map((file) => ({ path: file.path, commits: file.values[index] ?? 0 }))
    .filter((row) => row.commits > 0)
    .sort(
      (left, right) =>
        right.commits - left.commits || left.path.localeCompare(right.path)
    )
    .slice(0, TOUCHED_ROWS);
}

interface ChangesPanelProps {
  report: DiffReport | null;
  /** El snapshot pintado: de ahí salen los commits por fichero. */
  model?: RenderModel | null;
  source: string | null;
  error: string | null;
  onLoad: () => void;
  onSelectPath: (path: string) => void;
  /** El diff de un fichero; sin esto, el desplegable solo enseña símbolos. */
  loadDiff?: (path: string) => Promise<FileDiffView | null>;
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
 * viene a ver, y deja el resto —símbolos, balance de deuda y ciclos— plegado:
 * su cuenta se lee en el encabezado sin abrir nada. Las reglas no están: no son
 * un cambio del código y viven en la ficha del fichero. El balance de deuda
 * reúne los diffs de deuda y los hotspots, que son dos lecturas del mismo peso
 * (ADR 0078), y el histórico —los más tocados y las fotos— va al final, aparte,
 * porque no es el cambio actual.
 */
export default function ChangesPanel({
  report,
  model,
  source,
  error,
  onLoad,
  onSelectPath,
  loadDiff,
  loadHistory,
  onOpenHistory
}: ChangesPanelProps) {
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  // Las filas desplegadas, por ruta: no son selección ni foco, solo qué está
  // abierto mientras se mira la lista.
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const toggle = (path: string): void => {
    setExpanded((open) => {
      const next = new Set(open);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

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
  // Un HEAD sin diferencias ya no esconde la pestaña: las secciones siguen
  // ahí, con sus títulos y sin valores (ADR 0078). El aviso dice por qué.
  const hasChanges = reportHasChanges(report);

  const fileGroups = changeFileGroups(report.files, undefined, report.symbols);
  const totalFiles = fileGroups.reduce((sum, group) => sum + group.count, 0);
  const cycles = report.cycles.introduced.slice(0, 4);
  // La deuda y el crecimiento viven juntos: son dos lecturas del mismo peso
  // (ADR 0078).
  const balance = debtBalance(report);
  const debtDelta = balance.debt ? balance.debt.head - balance.debt.base : 0;
  const symbols = report.symbols;
  const photos = historyRows(history ?? []);
  const touched = touchedRows(model);

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

      {hasChanges ? null : (
        <p className="muted small">
          El árbol de trabajo coincide con su último commit: no hay ficheros,
          aristas ni ciclos que enseñar. El balance de deuda sigue siendo el del
          repositorio.
        </p>
      )}

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
        {/* Los símbolos ya no tienen sección: su cuenta se lee aquí y su
            detalle se abre en la fila del fichero (ADR 0077). */}
        {symbols ? (
          <span>
            símbolos{" "}
            <b className="mono">
              +{symbols.summary.added} −{symbols.summary.removed} ~
              {symbols.summary.changed}
            </b>
          </span>
        ) : null}
      </div>

      {/* Lo tocado, primero: es lo que se viene a ver a esta pestaña. */}
      <CollapsibleSection
        id="change-files"
        title="Ficheros"
        className="section-files"
        count={totalFiles || undefined}
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
                      open={expanded.has(file.path)}
                      loadDiff={loadDiff}
                      onToggle={() => toggle(file.path)}
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

        {/* Los hotspots ya no viven aquí: son el crecimiento del peso y se
            leen con la deuda (ADR 0078). */}
      </CollapsibleSection>

      {/* La deuda y el crecimiento, en una sola sección: lo que pesa y dónde
          crece el peso no se leen por separado, y su título no desaparece
          aunque el cambio esté limpio (ADR 0078). */}
      <CollapsibleSection
        id="change-debt"
        title="Balance de deuda"
        className="section-changes-debt"
        defaultOpen={false}
        count={balance.count || undefined}
        summary={balanceSummary(balance)}
      >
        <p className="muted tiny">
          La deuda de migración del cambio y lo que más creció: dos lecturas del
          mismo peso.
        </p>

        {balance.debt ? (
          <div className="change-summary">
            <span>
              deuda <b>{formatCompact(balance.debt.base)}</b> →{" "}
              <b>{formatCompact(balance.debt.head)}</b>{" "}
              <b
                className={
                  debtDelta > 0 ? "is-worse" : debtDelta < 0 ? "is-better" : undefined
                }
              >
                ({debtDelta > 0 ? `+${debtDelta}` : debtDelta})
              </b>
            </span>
            <span>
              cruces FFI <b>{balance.debt.crossings}</b>
            </span>
            <span>
              nativos <b>{balance.debt.native}</b>
            </span>
          </div>
        ) : (
          <p className="muted small">
            Este reporte no trae la lente de migración: no hay deuda que
            balancear.
          </p>
        )}

        {balance.debt ? (
          <div className="change-group">
            <GroupHead
              label="Diffs de deuda"
              summary={
                balance.increased.length + balance.decreased.length > 0
                  ? String(balance.increased.length + balance.decreased.length)
                  : undefined
              }
            />
            {balance.increased.length + balance.decreased.length > 0 ? (
              <div className="change-rows">
                {[...balance.increased, ...balance.decreased].map((file) => (
                  <BalanceRow
                    key={file.id}
                    path={file.path}
                    base={file.base}
                    head={file.head}
                    delta={file.delta}
                    peak={balance.peak}
                    onSelect={() => onSelectPath(file.path)}
                  />
                ))}
              </div>
            ) : (
              <p className="muted small">
                La deuda de migración no se ha movido en este cambio.
              </p>
            )}
            {balance.rest > 0 ? (
              <p className="muted tiny">+{balance.rest} más</p>
            ) : null}
          </div>
        ) : null}

        <div className="change-group">
          <GroupHead
            label="Hotspots"
            summary={
              balance.hotspots.length > 0
                ? `${report.hotspotMetric ?? "métrica"} · ${balance.hotspots.length}`
                : (report.hotspotMetric ?? "métrica")
            }
          />
          {balance.hotspots.length > 0 ? (
            <div className="change-rows">
              {balance.hotspots.map((hotspot) => (
                <BalanceRow
                  key={`${hotspot.id}-${hotspot.metric}`}
                  path={hotspot.path}
                  base={hotspot.base}
                  head={hotspot.head}
                  delta={hotspot.delta}
                  peak={balance.hotspotPeak}
                  onSelect={() => onSelectPath(hotspot.path)}
                />
              ))}
            </div>
          ) : (
            <p className="muted small">
              Ningún fichero ha crecido en este cambio.
            </p>
          )}
        </div>

      </CollapsibleSection>

      {/* El título se queda aunque no haya ciclos: una sección que aparece y
          desaparece se lee como un fallo de la app (ADR 0078). */}
      <CollapsibleSection
        id="change-cycles"
        title="Ciclos nuevos"
        className="section-cycles"
        defaultOpen={false}
        count={cycles.length || undefined}
      >
        {cycles.length > 0 ? (
          <>
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
          </>
        ) : (
          <p className="muted small">Sin ciclos nuevos en este cambio.</p>
        )}
      </CollapsibleSection>

      {/* El histórico es su propia sección: no se mezcla con el cambio actual.
          Lleva las dos lecturas de lo que el repo ya hizo —los ficheros que más
          se tocan y las fotos guardadas— y el título se queda aunque no haya
          ninguna de las dos (ADR 0078). */}
      <CollapsibleSection
        id="change-history"
        title="Histórico del repo"
        className="section-history"
        defaultOpen={false}
        count={photos.length + touched.length || undefined}
        summary={
          photos.length > 0
            ? `${photos[0]?.entry.files ?? 0} ficheros · ${formatCompact(photos[0]?.entry.rloc ?? 0)} rloc`
            : "sin fotos"
        }
      >
        <p className="muted tiny">
          Lo que el repositorio lleva hecho, no los cambios del último commit:
          eso está arriba.
        </p>

        <div className="change-group">
          <GroupHead
            label="Más tocados"
            summary={touched.length > 0 ? `${touched.length} ficheros` : undefined}
          />
          {touched.length > 0 ? (
            <div className="mini-list">
              {touched.map((row) => (
                <button
                  key={row.path}
                  type="button"
                  className="mini-row"
                  title={`${row.path} · ${row.commits} commits`}
                  onClick={() => onSelectPath(row.path)}
                >
                  <span className="mini-name">{row.path}</span>
                  <span className="mini-track" aria-hidden="true">
                    <i
                      style={{
                        width: `${Math.max(
                          4,
                          (row.commits / (touched[0]?.commits ?? 1)) * 100
                        )}%`,
                        background: "var(--rust)"
                      }}
                    />
                  </span>
                  <span className="mono">{row.commits}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="muted small">
              Sin commits que contar en este repositorio.
            </p>
          )}
        </div>

        <div className="change-group">
          <GroupHead
            label="Fotos guardadas"
            summary={photos.length > 0 ? String(photos.length) : undefined}
          />
          {history === null ? (
            <p className="muted small">Leyendo las fotos del repo…</p>
          ) : photos.length > 0 ? (
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
          ) : (
            <p className="muted small">
              Todavía no hay fotos guardadas: se guardan con{" "}
              <code>codarch analyze --history</code>.
            </p>
          )}
        </div>
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
  open,
  loadDiff,
  onToggle,
  onSelectPath
}: {
  file: ChangeFileRow;
  letter: "A" | "M" | "D";
  open: boolean;
  loadDiff?: (path: string) => Promise<FileDiffView | null>;
  onToggle: () => void;
  onSelectPath: (path: string) => void;
}) {
  // La fila lleva **un** total: el delta de su métrica. Los parciales
  // (`+38 −27`) y el código que los explica viven en el desplegable: mezclarlos
  // en 60 px de columna dejaba las tres cifras ilegibles (ADR 0070).
  const body = (
    <>
      <span className={`change-status is-${file.status}`} aria-hidden="true">
        {letter}
      </span>
      <span className="change-path">{file.path}</span>
      <span className={`mono change-delta${deltaTone(file.delta)}`}>
        {deltaLabel(file)}
      </span>
    </>
  );

  // La fila entera lleva el color de su estado, no solo la letra: así el grupo
  // se lee de un vistazo sin contar letras (ADR 0070).
  const symbols = file.symbols;
  const hasInside = Boolean(symbols) || Boolean(loadDiff);

  return (
    <div className={`file-entry is-${file.status}`}>
      <div className="change-row file-row">
        {file.status === "removed" ? (
          // Un eliminado no está en el head: no hay ficha que abrir.
          <div className="file-open is-static" title={rowTitle(file)}>
            {body}
          </div>
        ) : (
          <button
            type="button"
            className="file-open"
            title={rowTitle(file)}
            onClick={() => onSelectPath(file.path)}
          >
            {body}
          </button>
        )}

        {/* El galón es hermano de la ruta, no hijo: un botón no se anida en
            otro. Solo aparece cuando hay interior que enseñar. */}
        {hasInside ? (
          <button
            type="button"
            className={`file-ahead${open ? " is-open" : ""}`}
            aria-expanded={open}
            aria-label={`${open ? "Ocultar" : "Ver"} el interior de ${file.path}`}
            title={
              symbols ? symbolTitle(file.path, symbols) : `Ver el diff de ${file.path}`
            }
            onClick={onToggle}
          >
            <span aria-hidden="true">{open ? "▾" : "▸"}</span>
          </button>
        ) : (
          // El hueco se reserva siempre: sin él, el delta de las filas que no
          // tienen interior se desalinea del resto.
          <span className="file-ahead is-empty" aria-hidden="true" />
        )}
      </div>

      {open && symbols ? <FileSymbolRows symbols={symbols} /> : null}
      {open && loadDiff ? <FileDiffRows path={file.path} load={loadDiff} /> : null}
    </div>
  );
}

/**
 * La vista de diferencias de un fichero, pedida al abrir.
 *
 * No viaja en el reporte: el diff entero de cada fichero lo inflaría para
alguien que no lo abre. Se pide una vez y se queda montada mientras la fila
 * esté abierta.
 */
function FileDiffRows({
  path,
  load
}: {
  path: string;
  load: (path: string) => Promise<FileDiffView | null>;
}) {
  const [diff, setDiff] = useState<FileDiffView | null | "error">(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const loaded = await load(path);
        if (!cancelled) setDiff(loaded ?? "error");
      } catch {
        if (!cancelled) setDiff("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [path, load]);

  if (diff === "error") {
    return (
      <div className="file-diff-view">
        <p className="muted tiny">No se pudo leer el diff de este fichero.</p>
      </div>
    );
  }

  if (!diff) {
    return (
      <div className="file-diff-view">
        <p className="muted tiny">Leyendo el diff…</p>
      </div>
    );
  }

  return (
    <div className="file-diff-view">
      <div className="file-symbols-head">
        <span className="muted tiny">Diffs</span>
        {/* Un fichero sin medir no enseña cifras: el tamaño del fichero no es
            lo que cambió. La nota de abajo dice por qué. */}
        {diff.added !== null && diff.added > 0 ? (
          <span className="mono symbol-delta is-positive">+{diff.added}</span>
        ) : null}
        {diff.removed !== null && diff.removed > 0 ? (
          <span className="mono symbol-delta is-negative">−{diff.removed}</span>
        ) : null}
      </div>

      <div className="diff-body">
        {diff.rows.map((row, index) =>
          row.type === "gap" ? (
            <div className="diff-gap" key={`gap-${index}`}>
              ⋯
            </div>
          ) : (
            <div className={`diff-line is-${row.type}`} key={index}>
              <span className="diff-num">{row.baseLine ?? ""}</span>
              <span className="diff-num">{row.headLine ?? ""}</span>
              <span className="diff-sign">
                {row.type === "add" ? "+" : row.type === "del" ? "−" : ""}
              </span>
              <span className="diff-text">{row.text}</span>
            </div>
          )
        )}
      </div>

      {diff.truncated ? (
        <p className="muted tiny">El fichero es demasiado grande: la vista va recortada.</p>
      ) : null}
    </div>
  );
}

/**
 * El interior de un fichero: sus símbolos con lo que suma y resta cada uno.
 *
 * Es lo que antes era la sección **Símbolos**, pero pegado al fichero al que
 * pertenece: allí una lista global no decía en cuál estaba cada cambio.
 */
function FileSymbolRows({ symbols }: { symbols: ChangeFileSymbols }) {
  const shown = symbols.items.slice(0, SYMBOL_ROWS);
  const rest = symbols.items.length - shown.length;

  return (
    <div className="file-symbols">
      {/* Solo lo que hay: un `−0` en la cabecera es ruido, no información. */}
      <div className="file-symbols-head">
        <span className="muted tiny">Símbolos</span>
        {symbols.added > 0 ? (
          <span className="mono symbol-delta is-positive">+{symbols.added}</span>
        ) : null}
        {symbols.removed > 0 ? (
          <span className="mono symbol-delta is-negative">−{symbols.removed}</span>
        ) : null}
        {symbols.changed > 0 ? (
          <span className="mono symbol-delta is-changed">~{symbols.changed}</span>
        ) : null}
      </div>
      <ul className="file-symbols-list">
        {shown.map((symbol, index) => (
          <li className="file-symbol" key={`${symbol.name}:${index}`}>
            <span
              className={`symbol-letter is-${symbol.status}`}
              aria-hidden="true"
            >
              {SYMBOL_LETTER[symbol.status]}
            </span>
            <span
              className="symbol-name"
              title={`${symbol.name} · ${SYMBOL_STATUS[symbol.status]}`}
            >
              {symbol.name}
            </span>
            <SymbolLines symbol={symbol} />
          </li>
        ))}
      </ul>
      {rest > 0 ? <p className="muted tiny">+{rest} más</p> : null}
    </div>
  );
}

/**
 * Lo que suma y resta un símbolo: `+10 −4`.
 *
 * Sin las fuentes con las que medir el cuerpo, el reporte trae el tamaño de
 * cada lado y se enseña eso: `22 → 26`. Nunca un cero de relleno.
 */
function SymbolLines({ symbol }: { symbol: ChangeSymbol }) {
  // Un reporte viejo puede traerlos sin definir: eso es «no medido», `null`.
  const added = symbol.addedLines ?? null;
  const removed = symbol.removedLines ?? null;

  if (added !== null || removed !== null) {
    if (!added && !removed) return <span className="mono symbol-delta">±0</span>;
    return (
      <span className="symbol-lines">
        {added ? (
          <span className="mono symbol-delta is-positive">+{added}</span>
        ) : null}
        {removed ? (
          <span className="mono symbol-delta is-negative">−{removed}</span>
        ) : null}
      </span>
    );
  }

  const before = symbol.base?.lines ?? null;
  const after = symbol.head?.lines ?? null;
  if (before === null && after === null) return null;
  return (
    <span className="mono symbol-delta">
      {before ?? "?"} → {after ?? "?"}
    </span>
  );
}

/**
 * Una fila del **Balance de deuda**: la ruta, lo que se movió y una barra con
 * cuánto, en la escala del mayor movimiento de su grupo (ADR 0078).
 *
 * La barra viene de la lista que la deuda tenía en el raíl del mapa; los
 * valores son los del diff: `648 → 696 (+48)`, que una cifra suelta no dice.
 * La barra es el vistazo, el número es el dato. La usan los ficheros de deuda
 * y los hotspots: son dos lecturas del mismo peso y se leen igual.
 */
function BalanceRow({
  path,
  base,
  head,
  delta,
  peak,
  onSelect
}: {
  path: string;
  base: number | null;
  head: number | null;
  delta: number;
  peak: number;
  onSelect: () => void;
}) {
  const tone = delta > 0 ? " is-worse" : " is-better";
  // Un cuatro por ciento mínimo para que un movimiento pequeño se vea que existe.
  const share =
    peak > 0 ? Math.max(4, Math.round((Math.abs(delta) / peak) * 100)) : 100;
  const before = formatCompact(base ?? 0);
  const after = formatCompact(head ?? 0);

  return (
    <button
      type="button"
      className="change-row balance-row"
      title={`${path} · ${before} → ${after}`}
      onClick={onSelect}
    >
      <span className="change-path">{path}</span>
      <span className={`mono change-delta${tone}`}>
        {before} → {after} ({delta > 0 ? `+${delta}` : delta})
      </span>
      <span className="balance-bar" aria-hidden="true">
        <i className={tone.trim()} style={{ width: `${share}%` }} />
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
