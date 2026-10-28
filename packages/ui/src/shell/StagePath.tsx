import { Fragment, useEffect, useMemo } from "react";
import type { CodarchApp } from "../app/types";
import { folderTrail, parentFolder } from "../tree";

/**
 * La ruta del escenario: dónde estás dentro del mapa y cómo volver.
 *
 * Está siempre: en el mapa entero dice «Todo» y, al enfocar una carpeta, cada
 * tramo se puede pulsar. Vive aquí, no en la banda, porque navega el mapa y no
 * describe el proyecto (ADR 0085). Con un fichero abierto, la ruta lleva su
 * nombre y cada tramo vuelve al mapa (ADR 0087).
 *
 * Retroceso sube una carpeta, igual que la flecha de las migas. Se ignora al
 * escribir en un campo: ahí la tecla borra, que es lo que toca.
 */
export function StagePath({ app }: { app: CodarchApp }) {
  const { state, actions, view } = app;
  const { focusPath, openFile } = state;

  // Las migas salen del árbol entero, no de la ruta ni de lo que se ve: con
  // el foco puesto, el mapa ya es solo la carpeta abierta y no sabría cuál
  // es su padre. Cada tramo es una carpeta que existe y se puede abrir.
  const trail = useMemo(
    () => (focusPath ? folderTrail(view.model?.roots ?? [], focusPath) : []),
    [view.model, focusPath]
  );
  const upPath = focusPath
    ? parentFolder(view.model?.roots ?? [], focusPath)
    : null;

  const navigate = (path: string | null) => {
    actions.setFocusPath(path);
    app.closeFile();
  };

  useEffect(() => {
    if (typeof window === "undefined" || !focusPath) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Backspace") return;
      const target = event.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }
      event.preventDefault();
      actions.setFocusPath(upPath);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focusPath, upPath, actions]);

  return (
    <nav className="breadcrumb stage-path" aria-label="Ruta del mapa">
      {focusPath || openFile ? (
        <button
          className="breadcrumb-up"
          type="button"
          onClick={() => navigate(upPath)}
          title={
            upPath
              ? "Subir una carpeta (Retroceso)"
              : "Salir de la carpeta (Esc)"
          }
          aria-label="Volver"
        >
          ←
        </button>
      ) : null}
      {focusPath || openFile ? (
        <button type="button" onClick={() => navigate(null)}>
          Todo
        </button>
      ) : (
        <span className="breadcrumb-current" aria-current="page">
          Todo
        </span>
      )}
      {trail.map((crumb, index) =>
        !openFile && index === trail.length - 1 ? (
          <Fragment key={crumb.path}>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current" aria-current="page">
              {crumb.name}
            </span>
          </Fragment>
        ) : (
          <Fragment key={crumb.path}>
            <span className="breadcrumb-sep">/</span>
            <button type="button" onClick={() => navigate(crumb.path)}>
              {crumb.name}
            </button>
          </Fragment>
        )
      )}
      {openFile ? (
        <>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current" aria-current="page">
            {openFile.split("/").at(-1)}
          </span>
        </>
      ) : null}
    </nav>
  );
}

/** Las pestañas del escenario cuando los plugins traen vistas propias. */
export function StageTabs({ app }: { app: CodarchApp }) {
  const { state, actions, pluginViews } = app;
  if (pluginViews.length === 0) return null;

  return (
    <div className="stage-tabs">
      <button
        type="button"
        className={`stage-tab${state.pluginView === null ? " is-active" : ""}`}
        onClick={() => actions.setPluginView(null)}
      >
        Mapa
      </button>
      {pluginViews.map((view) => (
        <button
          key={view.id}
          type="button"
          className={`stage-tab${
            state.pluginView === view.id ? " is-active" : ""
          }`}
          onClick={() => actions.setPluginView(view.id)}
        >
          {view.label}
        </button>
      ))}
    </div>
  );
}
