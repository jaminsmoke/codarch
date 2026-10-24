import { useEffect, useMemo, useRef, useState } from "react";
import { layoutMap } from "@codarch/render/browser";
import type { PluginContext } from "@codarch/plugin-api";
import { mountScene, type BoxCell, type SceneBackend } from "./scene";

/**
 * La vista 3D.
 *
 * Usa el `RenderModel` tal cual ✓ (la misma distribución 2D ✓) y levanta cada
 * fichero a una caja ✓. La altura dice cuánto pesa el fichero ✓ (el riesgo ✓)
 * y el color es el del mapa ✓.
 *
 * El aviso dice con qué runtime se está dibujando ✓: WebGPU cuando la máquina
 * lo tiene ✓ y WebGL2 cuando no ✓ (three lo decide solo ✓).
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

/** Lo que dice el aviso del runtime ✓. */
type Runtime = SceneBackend | "pending" | "error";

function runtimeLabel(runtime: Runtime): string {
  if (runtime === "webgpu") return "WebGPU";
  if (runtime === "webgl2") return "WebGL2";
  if (runtime === "error") return "sin GPU";
  return "arrancando la GPU";
}

export function Vista3D({ context }: { context: PluginContext }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [runtime, setRuntime] = useState<Runtime>("pending");
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

    setRuntime("pending");
    return mountScene(canvas, {
      cells,
      selected: selection,
      background: themeColor("--paper", "#eef1f2"),
      onSelect: (path) => context.actions.select(path),
      onBackend: (backend) => setRuntime(backend),
      onError: () => setRuntime("error")
    });
  }, [cells, selection, context]);

  if (!model) {
    return <div className="plugin-view">Sin mapa que dibujar.</div>;
  }

  return (
    <div className="vista3d">
      <canvas ref={canvasRef} className="vista3d-canvas" />
      <div className="vista3d-hud">
        <strong>{cells.length}</strong> cajas ·{" "}
        <span className="vista3d-runtime">{runtimeLabel(runtime)}</span> · orbita
        con el ratón · pulsa una caja para seleccionar
      </div>
    </div>
  );
}
