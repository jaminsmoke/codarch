import { useEffect, useMemo, useRef } from "react";
import { layoutMap } from "@codarch/render/browser";
import type { PluginContext } from "@codarch/plugin-api";
import { mountScene, type BoxCell } from "./scene";

/**
 * La vista 3D.
 *
 * Usa el `RenderModel` tal cual ✓ (la misma distribución 2D ✓) y levanta cada
 * fichero a una caja ✓. La altura dice cuánto pesa el fichero ✓ (el riesgo ✓)
 * y el color es el del mapa ✓.
 */

const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 700;

/** Un color del tema de la app ✓ (el plugin no bringa su propia paleta ✓). */
function themeColor(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value === "" ? fallback : value;
}

export function Vista3D({ context }: { context: PluginContext }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const model = context.model;

  const cells = useMemo<BoxCell[]>(() => {
    if (!model) return [];

    const placed = layoutMap(model.roots, VIEW_WIDTH, VIEW_HEIGHT);
    const boxes: BoxCell[] = [];

    const walk = (nodes: ReturnType<typeof layoutMap>): void => {
      for (const placedNode of nodes) {
        const { node, rect } = placedNode;
        if (node.kind === "file") {
          if (node.fileIndex === undefined) continue;
          const file = model.files[node.fileIndex];
          if (!file) continue;
          boxes.push({
            path: file.path,
            x: rect.x,
            z: rect.y,
            width: rect.w,
            depth: rect.h,
            height: 2 + file.risk * 90,
            color: context.colorFor(file.index)
          });
          continue;
        }
        walk(placedNode.children ?? []);
      }
    };

    walk(placed);
    return boxes;
  }, [model, context]);

  const selection = context.selection;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || cells.length === 0) return;

    return mountScene(canvas, {
      cells,
      selected: selection,
      background: themeColor("--paper", "#eef1f2"),
      onSelect: (path) => context.actions.select(path)
    });
  }, [cells, selection, context]);

  if (!model) {
    return <div className="plugin-view">Sin mapa que dibujar.</div>;
  }

  return (
    <div className="vista3d">
      <canvas ref={canvasRef} className="vista3d-canvas" />
      <div className="vista3d-hud">
        <strong>{cells.length}</strong> cajas · orbita con el ratón · pulsa una
        para seleccionar
      </div>
    </div>
  );
}
