import { useEffect, useState } from "react";
import type { DiffReport } from "@codarch/metrics/browser";
import type { HistoryEntry } from "@codarch/schema/browser";
import { formatCompact, type RenderModel } from "@codarch/render/browser";
import type { FileDiffView } from "./platform";
import { changeFileGroups, filesSummary } from "./changeFiles";
import { CollapsibleSection, GroupHead } from "./CollapsibleSection";
import { balanceSummary, debtBalance } from "./balance";
import {
  historyRows,
  reportHasChanges,
  touchedRows
} from "./changes/summary";
import { FileChangeRow } from "./changes/FileEntry";
import { TouchedRows } from "./changes/TouchedRows";
import { BalanceRow } from "./changes/BalanceRow";
import { HistoryRow, HISTORY_ROWS } from "./changes/HistoryRow";

// La pestaña exporta sus lecturas puras desde aquí: la app y los tests las
// piden a este módulo, y el que las implementa es `changes/summary`.
export { historyRows, reportHasChanges, touchedRows };

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
 *
 * Cada fila vive en su módulo de `changes/`: aquí solo se ordenan y se les
 * pasa lo que enseñan.
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

  // Los ficheros más tocados no se pierden al abrir un `cc.json` suelto: en
  // Cambios solo se enseñan en el histórico, y sin git no hay histórico, así
  // que el estado vacío los recupera. Con reporte no se repiten (ADR 0078).
  const touched = touchedRows(model);

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

        {touched.length > 0 ? (
          <div className="change-group">
            <GroupHead
              label="Más tocados"
              summary={`${touched.length} ficheros`}
            />
            <p className="muted tiny">
              Lo que el snapshot trae: los ficheros con más commits. No es un
              cambio de ahora.
            </p>
            <TouchedRows rows={touched} onSelectPath={onSelectPath} />
          </div>
        ) : null}
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
            <TouchedRows rows={touched} onSelectPath={onSelectPath} />
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
