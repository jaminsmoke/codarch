import { useEffect, useState } from "react";
import type { DiffReport } from "@codarch/metrics/browser";
import type { HistoryEntry } from "@codarch/schema/browser";
import { formatCompact, type RenderModel } from "@codarch/render/browser";
import type { FileDiffView } from "../platform";
import { changeFileGroups, filesSummary } from "../changeFiles";
import { CollapsibleSection, GroupHead } from "../CollapsibleSection";
import { balanceSummary, debtBalance } from "../balance";
import { historyRows, reportHasChanges, touchedRows } from "./summary";
import { FileChangeRow } from "./FileEntry";
import { TouchedRows } from "./TouchedRows";
import { BalanceRow } from "./BalanceRow";
import { HistoryRow, HISTORY_ROWS } from "./HistoryRow";

/**
 * El color de un delta de deuda: subir empeora, bajar mejora, quedarse igual no
 * se pinta. Vive aquí para que la fila no anide ternarios.
 */
function deltaTone(delta: number): string | undefined {
  if (delta > 0) return "is-worse";
  if (delta < 0) return "is-better";
  return undefined;
}

/** El estado vacío: la carpeta no tiene git y no hay reporte que enseñar. */
export function ChangesEmpty({
  model,
  error,
  onLoad,
  onSelectPath
}: {
  model?: RenderModel | null;
  error: string | null;
  onLoad: () => void;
  onSelectPath: (path: string) => void;
}) {
  // Los ficheros más tocados no se pierden al abrir un `cc.json` suelto: en
  // Cambios solo se enseñan en el histórico, y sin git no hay histórico, así
  // que el estado vacío los recupera (ADR 0078).
  const touched = touchedRows(model);

  return (
    <section className="change-panel">
      <div className="eyebrow">Cambios</div>
      <h2>Sin git en esta carpeta</h2>
      <p className="muted small">
        Esta pestaña compara el árbol de trabajo con el último commit del
        repositorio. Sin git ligado a la carpeta no hay nada con lo que
        comparar, así que no hay cambios que enseñar ni forma de verlos en vivo.
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

/**
 * El encabezado del reporte: de qué fuente sale, entre qué dos fotos y, si no
 * hay nada, por qué la pestaña sigue con sus secciones (ADR 0078).
 */
export function ChangesHead({
  report,
  source
}: {
  report: DiffReport;
  source: string | null;
}) {
  return (
    <>
      <div className="eyebrow">
        Cambios · {source ?? "HEAD"}{" "}
        <span className="mono">
          {report.base.checksum.slice(0, 8) || "base"}→
          {report.head.checksum.slice(0, 8) || "head"}
        </span>
      </div>
      <h2>Cambios</h2>

      {reportHasChanges(report) ? null : (
        <p className="muted small">
          El árbol de trabajo coincide con su último commit: no hay ficheros,
          aristas ni ciclos que enseñar. El balance de deuda sigue siendo el del
          repositorio.
        </p>
      )}
    </>
  );
}

/** La línea de cifras: el resto sobra hasta que se abre una sección. */
export function ChangesSummary({ report }: { report: DiffReport }) {
  const summary = report.summary;
  // Los símbolos ya no tienen sección: su cuenta se lee aquí y su detalle se
  // abre en la fila del fichero (ADR 0077).
  const symbols = report.symbols;

  return (
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
  );
}

/**
 * Los ficheros tocados, agrupados por estado.
 *
 * Qué filas están desplegadas es estado suyo y de nadie más: no es selección ni
 * foco, solo qué está abierto mientras se mira la lista.
 */
export function FilesSection({
  report,
  loadDiff,
  onSelectPath
}: {
  report: DiffReport;
  loadDiff?: (path: string) => Promise<FileDiffView | null>;
  onSelectPath: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const toggle = (path: string): void => {
    setExpanded((open) => {
      const next = new Set(open);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const groups = changeFileGroups(report.files, undefined, report.symbols);
  const total = groups.reduce((sum, group) => sum + group.count, 0);

  return (
    <CollapsibleSection
      id="change-files"
      title="Ficheros"
      className="section-files"
      count={total || undefined}
      summary={filesSummary(groups)}
    >
      {total === 0 ? (
        <p className="muted small">Sin ficheros tocados.</p>
      ) : (
        groups
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
    </CollapsibleSection>
  );
}

/**
 * La deuda y el crecimiento, en una sola sección: lo que pesa y dónde crece el
 * peso no se leen por separado, y su título no desaparece aunque el cambio esté
 * limpio (ADR 0078).
 */
export function DebtSection({
  report,
  onSelectPath
}: {
  report: DiffReport;
  onSelectPath: (path: string) => void;
}) {
  const balance = debtBalance(report);
  const debtDelta = balance.debt ? balance.debt.head - balance.debt.base : 0;
  const moves = balance.increased.length + balance.decreased.length;

  return (
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
            <b className={deltaTone(debtDelta)}>
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
            summary={moves > 0 ? String(moves) : undefined}
          />
          {moves > 0 ? (
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
  );
}

/**
 * Los ciclos que el cambio introduce.
 *
 * El título se queda aunque no haya ninguno: una sección que aparece y
 * desaparece se lee como un fallo de la app (ADR 0078).
 */
export function CyclesSection({ report }: { report: DiffReport }) {
  const cycles = report.cycles.introduced.slice(0, 4);

  return (
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
  );
}

/**
 * El histórico del repo: los ficheros más tocados y las fotos guardadas.
 *
 * Es su propia sección porque no es el cambio actual: cuenta lo que el repo ya
 * hizo (ADR 0078). Las fotos las pide ella misma a la plataforma, que es la
 * única que las lee.
 */
export function HistorySection({
  model,
  loadHistory,
  onOpenHistory,
  onSelectPath
}: {
  model?: RenderModel | null;
  loadHistory?: () => Promise<HistoryEntry[] | null>;
  onOpenHistory?: (entry: HistoryEntry) => void;
  onSelectPath: (path: string) => void;
}) {
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

  const touched = touchedRows(model);
  const photos = historyRows(history ?? []);

  return (
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
        Lo que el repositorio lleva hecho, no los cambios del último commit: eso
        está arriba.
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
  );
}
