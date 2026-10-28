import { useEffect, useState } from "react";
import type { HistoryEntry } from "@codarch/schema/browser";

/** El nombre con el que se guarda una foto del historial. */
export function historyFileName(entry: { date: string; checksum: string }): string {
  const stamp = entry.date.replace(/[:.]/g, "-").replace("Z", "");
  return `${stamp}-${entry.checksum.slice(0, 8)}.cc.json`;
}

/**
 * Las fotos guardadas del repo, de la más nueva a la más vieja.
 *
 * Sin fotos no hay sección: no dice nada una lista vacía.
 */
export function HistoryPanel({
  load,
  onOpenSnapshot
}: {
  load: () => Promise<HistoryEntry[] | null>;
  onOpenSnapshot: (entry: HistoryEntry) => void;
}) {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const list = await load();
      if (cancelled) return;
      setEntries(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  if (!entries || entries.length === 0) return null;

  return (
    <section className="panel-block">
      <div className="eyebrow">Historia</div>
      <div className="history-list">
        {entries
          .slice()
          .reverse()
          .map((entry) => (
            <button
              key={entry.checksum}
              type="button"
              className="history-row"
              onClick={() => onOpenSnapshot(entry)}
              title={`${entry.files} ficheros · ${entry.rloc} rloc`}
            >
              <span className="mono history-date">{entry.date.slice(0, 16).replace("T", " ")}</span>
              <span className="mono history-count">{entry.files} f.</span>
            </button>
          ))}
      </div>
    </section>
  );
}
