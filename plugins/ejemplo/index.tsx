import { useMemo } from "react";
import type { PluginContext, PluginModule } from "@codarch/plugin-api";

/**
 * Un plugin de juguete.
 *
 * No dibuja nada útil: sirve para **probar el contrato** ✓. Si esta vista
 * funciona, la vista 3D también ✓ (que es la que de verdad importa ✓).
 */

function Vista({ context }: { context: PluginContext }) {
  const files = useMemo(
    () => context.model?.files.length ?? 0,
    [context.model]
  );

  return (
    <div className="plugin-view">
      <div className="eyebrow">Plugin de ejemplo</div>
      <h2>El contrato funciona</h2>
      <p className="muted small">
        Esta pestaña la ha puesto un plugin del repo. Solo lee el modelo y pide
        cambios; no toca el snapshot ni el análisis.
      </p>
      <div className="metric-grid">
        <div className="metric">
          <span>Ficheros</span>
          <b>{files}</b>
        </div>
        <div className="metric">
          <span>Seleccionado</span>
          <b>{context.selection ?? "—"}</b>
        </div>
        <div className="metric">
          <span>Área</span>
          <b>{context.preferences.areaMetric ?? "—"}</b>
        </div>
        <div className="metric">
          <span>Color</span>
          <b>{context.preferences.colorMode}</b>
        </div>
      </div>
      <p className="muted small">
        {context.model?.files[0] ? (
          <button
            type="button"
            className="button dark"
            onClick={() => context.actions.select(context.model?.files[0]?.path ?? "")}
          >
            Seleccionar {context.model.files[0].path}
          </button>
        ) : (
          "No hay snapshot."
        )}
      </p>
    </div>
  );
}

const plugin: PluginModule = {
  views: [
    {
      id: "ejemplo",
      label: "Ejemplo",
      render: (context) => <Vista context={context} />
    }
  ]
};

export default plugin;
