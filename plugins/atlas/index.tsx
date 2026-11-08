import type { PluginModule } from "@codarch/plugin-api";
import { AtlasView } from "./view";
import "./styles.css";

/**
 * Atlas: una vista 3D del mapa, separada de la vista de barras (ADR 0113).
 *
 * Solo aporta su vista. La app mantiene el modelo, la selección y el resto del
 * marco; el plugin ocupa el escenario central completo.
 */
const plugin: PluginModule = {
  views: [
    {
      id: "atlas",
      label: "Atlas",
      render: (context) => <AtlasView context={context} />
    }
  ]
};

export default plugin;
