import type { HistoryEntry } from "@codarch/schema/browser";

/** Cuántas fotos del histórico se enseñan sin pedir más. */
export const HISTORY_ROWS = 8;

/** Una foto del histórico: cuándo, qué commit y qué trajo. */
export function HistoryRow({
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
