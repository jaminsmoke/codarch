import type { RenderModel } from "@codarch/render/browser";
import { GroupHead } from "../CollapsibleSection";
import { touchedRows } from "./summary";
import { TouchedRows } from "./TouchedRows";

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
