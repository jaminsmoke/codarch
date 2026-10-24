import { useEffect, useMemo, useRef, useState } from "react";
import { VIEW_HEIGHT, VIEW_WIDTH } from "@codarch/render/browser";
import type { PluginContext } from "@codarch/plugin-api";
import { mountScene, type Scene, type SceneBackend } from "./scene";
import { buildVolumes, type Volume } from "./volumes";

/**
 * La vista 3D.
 *
 * Usa el `RenderModel` tal cual ✓ (la misma distribución 2D ✓) y levanta cada
 * fichero a una caja ✓. La altura dice cuánto pesa el fichero ✓ (el riesgo ✓)
 * y el color es el del mapa ✓.
 *
 * Las carpetas son contenedores ✓: de lejos son una caja ✓, de cerca se abren ✓
 * (el nivel de detalle de `volumes.ts` ✓). El aviso dice con qué runtime se
 * está dibujando ✓ y cuántas primitivas hay en pantalla ✓.
 */

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
  const sceneRef = useRef<Scene | null>(null);
  const [runtime, setRuntime] = useState<Runtime>("pending");
  const [boxes, setBoxes] = useState(0);

  // El contexto cambia con cada selección ✓ (lleva el fichero elegido ✓), pero
  // la escena no debe volver a montarse por eso ✓: los callbacks leen de aquí ✓.
  const latest = useRef(context);
  // La escena lee el contexto por referencia para no remontarse en cada selección.
  // eslint-disable-next-line react-hooks/refs -- lectura intencionada del contexto actual
  latest.current = context;

  const model = context.model;
  const colorMode = context.preferences.colorMode;

  /** El árbol de volúmenes: se construye cuando cambia el mapa o el color ✓. */
  const volumes = useMemo<Volume[]>(() => {
    if (!model) return [];
    // `colorFor` se resuelve al construir el árbol: no depende de cada render.
    // eslint-disable-next-line react-hooks/refs -- la función se lee por referencia a propósito
    return buildVolumes({
      roots: model.roots,
      files: model.files,
      colorFor: (index) => latest.current.colorFor(index),
      fallbackColor: themeColor("--muted", "#98a2ad"),
      width: VIEW_WIDTH,
      height: VIEW_HEIGHT
    });
    // `colorFor` se lee por la referencia ✓: su identidad cambia en cada render ✓
    // y no queremos reconstruir el árbol por eso ✓.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- colorMode cambia los colores aunque se lea por referencia
  }, [model, colorMode]);

  const selection = context.selection;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || volumes.length === 0) return;

    setRuntime("pending");
    const scene = mountScene(canvas, {
      roots: volumes,
      selected: latest.current.selection,
      background: themeColor("--paper", "#eef1f2"),
      onSelect: (path) => latest.current.actions.select(path),
      onFocus: (path) => latest.current.actions.focus(path),
      onBackend: (backend) => setRuntime(backend),
      onError: () => setRuntime("error"),
      onBoxes: (count) => setBoxes(count)
    });
    sceneRef.current = scene;

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, [volumes]);

  // Seleccionar no vuelve a montar la escena ✓: solo mueve el foco ✓.
  useEffect(() => {
    sceneRef.current?.setSelected(selection);
  }, [selection]);

  if (!model) {
    return <div className="plugin-view">Sin mapa que dibujar.</div>;
  }

  return (
    <div className="vista3d">
      <canvas ref={canvasRef} className="vista3d-canvas" />
      <div className="vista3d-hud">
        <strong>{model.fileCount}</strong> ficheros ·{" "}
        <strong>{boxes}</strong> cajas ·{" "}
        <span className="vista3d-runtime">{runtimeLabel(runtime)}</span> · orbita
        con el ratón · pulsa una caja (o una carpeta) para entrar
      </div>
    </div>
  );
}
