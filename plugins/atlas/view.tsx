import { useEffect, useMemo, useRef, useState } from "react";
import { VIEW_HEIGHT, VIEW_WIDTH } from "@codarch/render/browser";
import type { PluginContext } from "@codarch/plugin-api";
import { mountScene, type Scene, type SceneBackend } from "./scene";
import { buildVolumes, type Volume } from "./volumes";

/**
 * La vista Atlas.
 *
 * Usa el `RenderModel` del mapa abierto —código, documentos/configuración o
 * cualquier otro— y levanta su árbol de carpetas y ficheros en 3D. No lee el
 * esquema del código ni guarda una segunda copia de los datos.
 */

function themeColor(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value === "" ? fallback : value;
}

type Runtime = SceneBackend | "pending" | "error";

function runtimeLabel(runtime: Runtime): string {
  if (runtime === "webgl2") return "WebGL2";
  if (runtime === "error") return "sin WebGL2";
  return "arrancando";
}

export function AtlasView({ context }: { context: PluginContext }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const [runtime, setRuntime] = useState<Runtime>("pending");
  const [boxes, setBoxes] = useState(0);
  const [containers, setContainers] = useState(0);

  const latest = useRef(context);
  // La escena lee el contexto por referencia: seleccionar no debe remontarla.
  // eslint-disable-next-line react-hooks/refs -- lectura intencionada del contexto actual
  latest.current = context;

  const model = context.model;
  const colorMode = context.preferences.colorMode;

  const volumes = useMemo<Volume[]>(() => {
    if (!model) return [];
    // eslint-disable-next-line react-hooks/refs -- `colorFor` se lee por referencia a propósito
    return buildVolumes({
      roots: model.roots,
      files: model.files,
      colorFor: (index) => latest.current.colorFor(index),
      fallbackColor: themeColor("--muted", "#98a2ad"),
      width: VIEW_WIDTH,
      height: VIEW_HEIGHT
    });
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
      onBoxes: (count) => setBoxes(count),
      onContainers: (count) => setContainers(count)
    });
    sceneRef.current = scene;

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, [volumes]);

  useEffect(() => {
    sceneRef.current?.setSelected(selection);
  }, [selection]);

  if (!model) {
    return (
      <div className="atlas atlas-empty">
        <strong>Atlas</strong>
        <span>No hay un mapa abierto.</span>
      </div>
    );
  }

  const focusPath = context.url.read().focusPath;

  return (
    <div className="atlas">
      <canvas ref={canvasRef} className="atlas-canvas" />
      <div className="atlas-brand" aria-hidden="true">
        <span className="atlas-brand-mark">CODARCH</span>
        <strong>ATLAS DE ARQUITECTURA</strong>
      </div>
      {focusPath ? (
        <div className="atlas-breadcrumb">
          <span>Atlas</span>
          <span aria-hidden="true">/</span>
          <span className="mono">{focusPath}</span>
        </div>
      ) : null}
      <div className="atlas-hud">
        <span>
          <strong>{model.fileCount}</strong> ficheros
        </span>
        <span aria-hidden="true">·</span>
        <span>
          <strong>{containers}</strong> contenedores
        </span>
        <span aria-hidden="true">·</span>
        <span>{boxes} volúmenes</span>
        <span aria-hidden="true">·</span>
        <span className="atlas-runtime">{runtimeLabel(runtime)}</span>
      </div>
      <div className="atlas-hint">
        arrastra para orbitar · rueda para acercar · clic en una carpeta para
        entrar · clic en un fichero para seleccionarlo
      </div>
      {runtime === "error" ? (
        <div className="atlas-error" role="alert">
          <strong>Atlas necesita WebGL2.</strong>
          <span>Activa el mapa clásico o usa un navegador con WebGL2.</span>
        </div>
      ) : null}
    </div>
  );
}
