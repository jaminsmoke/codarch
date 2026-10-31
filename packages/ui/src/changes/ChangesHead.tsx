import type { DiffReport } from "@codarch/metrics/browser";
import { reportHasChanges } from "./summary";

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
