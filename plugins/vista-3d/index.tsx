import type { PluginModule } from "@codarch/plugin-api";
import { Vista3D } from "./view";
import "./styles.css";

/**
 * La vista 3D: un plugin ✓.
 *
 * Solo aporta su vista ✓: el mapa central la muestra cuando la activas ✓ y
 * las barras laterales no cambian ✓.
 */
const plugin: PluginModule = {
  views: [
    {
      id: "vista-3d",
      label: "3D",
      render: (context) => <Vista3D context={context} />
    }
  ]
};

export default plugin;
