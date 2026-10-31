import type { DiffReport } from "@codarch/metrics/browser";

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
