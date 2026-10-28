import type { ReactNode } from "react";
import type { CodarchApp } from "../app/types";
import { MapCanvas } from "../MapCanvas";
import { FileCodeView } from "../FileCodeView";

/**
 * El escenario: el mapa, el código de un fichero o la vista de un plugin.
 *
 * Los cuatro estados van en cadena porque son excluyentes y este es el orden
 * en que se resuelven: cargando, error, sin snapshot y, con modelo, lo que
 * toque enseñar. La pista de arrastre (`overlay`) se pinta encima de lo que
 * haya.
 */
export function MapStage({
  app,
  overlay
}: {
  app: CodarchApp;
  overlay?: ReactNode;
}) {
  const { state, actions, view, detail, migration } = app;
  const { activePluginView, pluginContext, closeFile, openFileAt } = app;
  const roots = detail?.roots ?? [];

  return (
    <div className="map-frame">
      {state.loading ? (
        <div className="empty">Cargando snapshot…</div>
      ) : view.error || state.error ? (
        <div className="empty error">
          <strong>No se pudo dibujar el mapa.</strong>
          <span>{view.error ?? state.error}</span>
        </div>
      ) : view.model ? (
        state.openFile ? (
          <FileCodeView
            key={state.openFile}
            path={state.openFile}
            load={actions.leerCodigo}
            onClose={closeFile}
          />
        ) : state.pluginView && activePluginView ? (
          <div className="plugin-stage">
            {activePluginView.render(pluginContext)}
          </div>
        ) : (
          <MapCanvas
            model={view.model}
            roots={roots}
            colorMode={state.colorMode}
            migration={migration}
            query={state.query.trim().toLowerCase()}
            selectedIndex={state.selectedIndex}
            onSelect={actions.selectIndex}
            onOpenFile={(index) => {
              const file = view.model?.files[index];
              if (file) openFileAt(file.path);
            }}
            onFocusFolder={(path) => {
              actions.setFocusPath(path);
              closeFile();
            }}
            zoom={state.zoom}
            center={state.center}
            onZoomAt={actions.zoomAt}
            showLabels={state.showLabels}
            onPan={actions.panMap}
          />
        )
      ) : (
        <div className="empty">Abre un cc.json para empezar.</div>
      )}
      {overlay}
    </div>
  );
}

/**
 * El pie del escenario: el zoom y, al lado, lo que está pasando.
 *
 * Los datos del proyecto ya están en la banda de arriba: aquí solo el zoom,
 * sin repetir ficheros, carpetas ni formato. Con un fichero abierto no hay
 * mapa que acercar (ADR 0087).
 */
export function StageFoot({
  app,
  onCancelAnalysis
}: {
  app: CodarchApp;
  onCancelAnalysis?: () => void;
}) {
  const { state, actions, view, detail } = app;

  return (
    <div className="stage-foot">
      {state.openFile ? null : (
        <div
          className="map-controls"
          title="Con el botón derecho apretado, arrastra para mover el mapa"
        >
          <button
            type="button"
            onClick={() => actions.zoomAt(1 / 1.25)}
            disabled={state.zoom <= 1}
            title="Alejar"
            aria-label="Alejar"
          >
            −
          </button>
          <span className="map-zoom-level">
            {Math.round(state.zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => actions.zoomAt(1.25)}
            disabled={state.zoom >= 8}
            title="Acercar"
            aria-label="Acercar"
          >
            +
          </button>
          <button
            className="map-fit"
            type="button"
            onClick={actions.fitMap}
            disabled={state.zoom === 1}
            title="Ver el mapa entero"
            aria-label="Ver el mapa entero"
          >
            <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
              <path
                fill="currentColor"
                d="M6 2H2v4h1.5V3.5H6V2Zm4 0v1.5h2.5V6H14V2h-4ZM2 10v4h4v-1.5H3.5V10H2Zm10.5 0v2.5H10V14h4v-4h-1.5Z"
              />
            </svg>
          </button>
        </div>
      )}
      {state.progress ? (
        <span className="progress-cell">
          <span className="mono detail-note">{state.progress}</span>
          {onCancelAnalysis ? (
            <button
              className="button ghost small"
              type="button"
              onClick={onCancelAnalysis}
              title="Cortar el análisis"
            >
              Cancelar
            </button>
          ) : null}
        </span>
      ) : detail && detail.hiddenFiles > 0 ? (
        <span className="mono detail-note">
          {`nivel carpeta · ${detail.cells} bloques · ${detail.hiddenFiles} ficheros dentro`}
        </span>
      ) : (
        <span className="mono">
          {view.model?.warnings[0] ??
            "clic en una celda para inspeccionar"}
        </span>
      )}
    </div>
  );
}
