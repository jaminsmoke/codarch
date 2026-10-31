import { useEffect, useState } from "react";
import type { HistoryEntry } from "@codarch/schema/browser";
import { formatCompact, type RenderModel } from "@codarch/render/browser";
import { CollapsibleSection, GroupHead } from "../CollapsibleSection";
import { historyRows, touchedRows } from "./summary";
import { TouchedRows } from "./TouchedRows";
import { HistoryRow, HISTORY_ROWS } from "./HistoryRow";

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
