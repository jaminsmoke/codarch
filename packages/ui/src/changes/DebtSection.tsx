import type { DiffReport } from "@codarch/metrics/browser";
import { formatCompact } from "@codarch/render/browser";
import { CollapsibleSection, GroupHead } from "../CollapsibleSection";
import { balanceSummary, debtBalance } from "../balance";
import { BalanceRow } from "./BalanceRow";
import { deltaTone } from "./deltaTone";

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
