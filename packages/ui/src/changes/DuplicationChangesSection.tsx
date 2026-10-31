import type { DiffReport } from "@codarch/metrics/browser";
import { formatCompact } from "@codarch/render/browser";
import { CollapsibleSection, GroupHead } from "../CollapsibleSection";
import { deltaTone } from "./deltaTone";

/**
 * La duplicación del cambio: pares nuevos, pares que se separan y líneas
 * ganadas o perdidas (ADR 0102, M71).
 *
 * Es la sección que convierte el diff en una tarea: no dice que el 3 % está
 * copiado, dice qué dos ficheros empiezan a compartir y cuál se está separando.
 * Con la lente en un solo lado no hay comparación y se dice cuál falta.
 */
export function DuplicationChangesSection({
  report,
  onSelectPath
}: {
  report: DiffReport;
  onSelectPath: (path: string) => void;
}) {
  const duplication = report.duplication;
  const counts = duplication?.counts;
  const changes = (counts?.added ?? 0) + (counts?.diverging ?? 0);
  const delta = duplication?.lines.delta ?? null;
  const summary = !duplication
    ? "sin medir"
    : delta === null
      ? "sin comparación"
      : `${delta > 0 ? `+${delta}` : delta} líneas · ${changes} pares`;

  const rows = duplication
    ? [
        ...duplication.added.map((pair) => ({ pair, kind: "added" as const })),
        ...duplication.diverging.map((pair) => ({
          pair,
          kind: "diverging" as const
        }))
      ]
    : [];
  const unshown = Math.max(
    0,
    (counts?.added ?? 0) + (counts?.diverging ?? 0) - rows.length
  );

  return (
    <CollapsibleSection
      id="change-duplication"
      title="Duplicación"
      className="section-changes-duplication"
      defaultOpen={false}
      count={changes || undefined}
      summary={summary}
    >
      {!duplication ? (
        <p className="muted small">
          Este reporte no trae la lente de duplicación: no hay código copiado
          que comparar.
        </p>
      ) : delta === null ? (
        <p className="muted small">
          La lente de duplicación está en {duplication.base ? "el head" : "la base"}{" "}
          pero no en {duplication.base ? "la base" : "el head"}: sin las dos no
          hay comparación, y el código copiado de un lado está sin medir.
        </p>
      ) : (
        <>
          <div className="change-summary">
            <span>
              líneas <b>{formatCompact(duplication.lines.base ?? 0)}</b> →{" "}
              <b>{formatCompact(duplication.lines.head ?? 0)}</b>{" "}
              <b className={deltaTone(delta)}>
                ({delta > 0 ? `+${delta}` : delta})
              </b>
            </span>
            <span>
              pares <b>{duplication.head?.pairs ?? 0}</b>
            </span>
            {counts?.removed ? (
              <span>{counts.removed} dejan de compartir</span>
            ) : null}
          </div>

          <div className="change-group">
            <GroupHead
              label="Pares que cambian"
              summary={changes > 0 ? String(changes) : undefined}
            />
            {rows.length > 0 ? (
              <div
                className="duplication-list"
                role="list"
                aria-label="Pares de duplicación que cambian"
              >
                {rows.map(({ pair, kind }) => (
                  <div
                    key={`${pair.from}->${pair.to}`}
                    role="listitem"
                    className={`duplication-pair-row ${
                      kind === "diverging" ? "duplication-diverging" : ""
                    }`}
                  >
                    <span className="duplication-ends">
                      <button
                        type="button"
                        className="mono duplication-end"
                        title={`Abrir ${pair.from}`}
                        onClick={() => onSelectPath(pair.from)}
                      >
                        {pair.from}
                      </button>
                      <span className="duplication-arrow" aria-hidden="true">
                        ↔
                      </span>
                      <button
                        type="button"
                        className="mono duplication-end"
                        title={`Abrir ${pair.to}`}
                        onClick={() => onSelectPath(pair.to)}
                      >
                        {pair.to}
                      </button>
                    </span>
                    <span className="mono duplication-pair-meta">
                      {kind === "added"
                        ? pair.similarity === 100
                          ? "nuevo · copia"
                          : `nuevo · ${pair.similarity}%`
                        : `se separa · ${pair.previousSimilarity ?? pair.similarity}% → ${pair.similarity}%`}
                      {" · "}
                      {formatCompact(pair.lines)} líneas
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted small">
                Ningún par nuevo ni separándose: lo copiado aguanta.
              </p>
            )}
            {unshown > 0 ? (
              <p className="muted tiny">+{unshown} más</p>
            ) : null}
          </div>
        </>
      )}
    </CollapsibleSection>
  );
}
