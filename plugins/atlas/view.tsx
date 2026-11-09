import { useEffect, useMemo, useRef, useState } from "react";
import type { PluginCode, PluginContext } from "@codarch/plugin-api";
import { mountScene, type Scene, type SceneBackend } from "./scene";
import { buildRoom } from "./room";
import { roomMetrics } from "./metrics";

/**
 * La vista Atlas.
 *
 * No es un plano aéreo: es un zoom frontal. La vista general son contenedores
 * de carpeta en el suelo y hojas en estanterías. Al entrar en una carpeta, sus
 * subcarpetas siguen siendo contenedores y sus ficheros pasan a las estanterías
 * de la sala.
 */
const ATLAS_BACKGROUND = "#0b1015";
const ATLAS_FALLBACK = "#5d6b78";
const ATLAS_FURNITURE = "#3a4a57";
const ATLAS_FLOOR = "#151d24";
const ATLAS_WALL = "#26323d";
const ATLAS_LIGHT = "#e6f7ff";
const ATLAS_TRIM = "#5d7485";
const ATLAS_LABEL_TEXT = "#e7f1f7";
const ATLAS_LABEL_BACKGROUND = "#111820";

type Runtime = SceneBackend | "pending" | "error";

function runtimeLabel(runtime: Runtime): string {
  if (runtime === "webgl2") return "WebGL2";
  if (runtime === "error") return "sin WebGL2";
  return "arrancando";
}

function AtlasFileView({
  path,
  load,
  onClose
}: {
  path: string;
  load: (path: string) => Promise<PluginCode | null>;
  onClose: () => void;
}) {
  const [code, setCode] = useState<PluginCode | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void load(path).then((next) => {
      if (!live) return;
      if (next) setCode(next);
      else setError("No se pudo leer el código de este fichero.");
    });
    return () => {
      live = false;
    };
  }, [path, load]);

  return (
    <aside className="atlas-file" aria-label={`Visor de ${path}`}>
      <header className="atlas-file-head">
        <span className="mono">{path}</span>
        <button
          type="button"
          className="atlas-file-close"
          onClick={onClose}
          aria-label="Cerrar el visor"
        >
          Cerrar
        </button>
      </header>
      <div className="atlas-file-body">
        {error ? (
          <p className="muted small">{error}</p>
        ) : !code ? (
          <p className="muted small">Cargando el código…</p>
        ) : (
          <pre className="atlas-file-code">
            {code.lines
              .map(
                (line, index) =>
                  `${String(code.start + index).padStart(5)}  ${line}`
              )
              .join("\n")}
          </pre>
        )}
      </div>
      {code ? (
        <footer className="atlas-file-foot">
          {code.end < code.total
            ? `líneas ${code.start}–${code.end} de ${code.total}`
            : `${code.total} líneas`}
        </footer>
      ) : null}
    </aside>
  );
}

export function AtlasView({ context }: { context: PluginContext }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const [runtime, setRuntime] = useState<Runtime>("pending");
  const [boxes, setBoxes] = useState(0);
  const [openFile, setOpenFile] = useState<{
    path: string;
    focusPath: string | null;
  } | null>(null);

  const latest = useRef(context);
  // La escena lee el contexto por referencia: seleccionar no debe remontarla.
  // eslint-disable-next-line react-hooks/refs -- lectura intencionada del contexto actual
  latest.current = context;

  const model = context.model;
  const colorMode = context.preferences.colorMode;
  const focusPath = context.url.read().focusPath;

  const room = useMemo(() => {
    if (!model) return null;
    // eslint-disable-next-line react-hooks/refs -- `colorFor` se lee por referencia a propósito
    return buildRoom({
      roots: model.roots,
      files: model.files,
      focusPath,
      projectName: model.meta.project,
      metrics: roomMetrics(model, focusPath),
      colorFor: (index) => latest.current.colorFor(index),
      fallbackColor: ATLAS_FALLBACK,
      furnitureColor: ATLAS_FURNITURE,
      floorColor: ATLAS_FLOOR,
      wallColor: ATLAS_WALL,
      lightColor: ATLAS_LIGHT,
      trimColor: ATLAS_TRIM
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- colorMode cambia los colores aunque se lea por referencia
  }, [model, colorMode, focusPath]);

  const selection = context.selection;
  const selectedFolder = context.selectedFolder;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !room) return;

    setRuntime("pending");
    const scene = mountScene(canvas, {
      room,
      selected: latest.current.selection,
      selectedFolder: latest.current.selectedFolder,
      background: ATLAS_BACKGROUND,
      onSelect: (path) => {
        latest.current.actions.select(path);
        setOpenFile(null);
        sceneRef.current?.flyTo(path, 300, () => undefined);
      },
      onSelectFolder: (path) => {
        latest.current.actions.selectFolder(path);
        setOpenFile(null);
      },
      onOpen: (path) => {
        latest.current.actions.select(path);
        setOpenFile({
          path,
          focusPath: latest.current.url.read().focusPath
        });
      },
      onFocus: (path) => {
        setOpenFile(null);
        sceneRef.current?.flyTo(path, 420, () => {
          latest.current.actions.focus(path);
        });
      },
      onBackend: (backend) => setRuntime(backend),
      onError: () => setRuntime("error"),
      onBoxes: (count) => setBoxes(count),
      labelCanvas: labelsRef.current,
      labelTextColor: ATLAS_LABEL_TEXT,
      labelBackground: ATLAS_LABEL_BACKGROUND
    });
    sceneRef.current = scene;

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, [room]);

  useEffect(() => {
    sceneRef.current?.setSelected(selection);
  }, [selection]);

  useEffect(() => {
    sceneRef.current?.setSelectedFolder(selectedFolder);
  }, [selectedFolder]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName ?? "")
      ) {
        return;
      }
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        sceneRef.current?.zoom(0.88);
      } else if (event.key === "-") {
        event.preventDefault();
        sceneRef.current?.zoom(1.14);
      } else if (event.key === "0" || event.key.toLowerCase() === "r") {
        event.preventDefault();
        sceneRef.current?.resetView();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!model || !room) {
    return (
      <div className="atlas atlas-empty">
        <strong>Atlas</strong>
        <span>No hay un mapa abierto.</span>
      </div>
    );
  }

  return (
    <div className="atlas">
      <canvas ref={canvasRef} className="atlas-canvas" />
      <canvas ref={labelsRef} className="atlas-labels" aria-hidden="true" />
      <div className="atlas-brand" aria-hidden="true">
        <span className="atlas-brand-mark">CODARCH</span>
        <strong>ATLAS DE ARQUITECTURA</strong>
      </div>
      {focusPath ? (
        <div className="atlas-breadcrumb">
          <span>Atlas</span>
          <span aria-hidden="true">/</span>
          <span className="mono">{focusPath}</span>
          <button
            type="button"
            className="atlas-back"
            onClick={() => {
              setOpenFile(null);
              const leave = () => context.url.write({ focusPath: null });
              if (sceneRef.current) sceneRef.current.flyTo(null, 360, leave);
              else leave();
            }}
            title="Volver al atlas entero"
          >
            Volver
          </button>
        </div>
      ) : null}
      <div className="atlas-hud">
        <span>
          <strong>{model.fileCount}</strong> ficheros
        </span>
        <span aria-hidden="true">·</span>
        <span>
          <strong>{room.containers}</strong> contenedores
        </span>
        <span aria-hidden="true">·</span>
        <span>{room.sheets} hojas</span>
        <span aria-hidden="true">·</span>
        <span>{boxes} volúmenes</span>
        <span aria-hidden="true">·</span>
        <span className="atlas-runtime">{runtimeLabel(runtime)}</span>
      </div>
      <div className="atlas-camera" role="group" aria-label="Cámara">
        <button
          type="button"
          onClick={() => sceneRef.current?.zoom(1.14)}
          title="Alejar (−)"
          aria-label="Alejar la cámara"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => sceneRef.current?.resetView()}
          title="Centrar la vista (0)"
          aria-label="Centrar la vista"
        >
          Centrar
        </button>
        <button
          type="button"
          onClick={() => sceneRef.current?.zoom(0.88)}
          title="Acercar (+)"
          aria-label="Acercar la cámara"
        >
          +
        </button>
      </div>
      <div className="atlas-hint">
        arrastra para mirar · rueda o +/− para acercar · 0 centrar · clic
        selecciona · doble clic entra en una carpeta o abre una hoja
      </div>
      {openFile && openFile.focusPath === focusPath ? (
        <AtlasFileView
          key={openFile.path}
          path={openFile.path}
          load={context.readCode}
          onClose={() => setOpenFile(null)}
        />
      ) : null}
      {runtime === "error" ? (
        <div className="atlas-error" role="alert">
          <strong>Atlas necesita WebGL2.</strong>
          <span>Activa el mapa clásico o usa un navegador con WebGL2.</span>
        </div>
      ) : null}
    </div>
  );
}
