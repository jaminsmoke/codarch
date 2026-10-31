import type { RenderModel } from "@codarch/render/browser";

/** La ficha sin fichero: qué hay que hacer y de qué snapshot sale. */
export function EmptyInspector({ model }: { model: RenderModel | null }) {
  return (
    <section className="inspector-empty">
      <h2>Selecciona un fichero</h2>
      <p className="muted small">
        Un clic en un fichero del mapa abre su ficha; un doble clic lo abre en el
        escenario. Las carpetas tienen su propia hoja, en la entrada
        <strong> Carpeta</strong>: un clic en una la selecciona sin mover el zoom.
      </p>
      {model ? (
        <div className="inspector-note">
          <span className="mono">{model.meta.apiVersion}</span>
          <span>{model.meta.checksum.slice(0, 8) || "sin checksum"}</span>
        </div>
      ) : null}
    </section>
  );
}
