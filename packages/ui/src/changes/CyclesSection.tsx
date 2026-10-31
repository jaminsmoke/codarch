import type { DiffReport } from "@codarch/metrics/browser";
import { CollapsibleSection } from "../CollapsibleSection";

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
      summary={
        cycles.length > 0 ? `${cycles.length} nuevos` : "sin ciclos nuevos"
      }
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
