import { useId, useState, type KeyboardEvent } from "react";
import type { CodarchApp, MapId } from "../app/types";
import { ToolBar, toolLabel } from "../ToolBar";
import { HeatList, LanguageSample, Legend } from "../panels";
import { localStore } from "../storage";
import { readSectionClosed, writeSectionClosed } from "../sections";

/**
 * El dock de herramientas del mapa.
 *
 * Se pliega desde su icono, como la barra lateral de un editor: el mapa gana
 * el ancho de la hoja. El estado se recuerda entre visitas, igual que el de una
 * sección (ADR 0061 · ADR 0083), y por eso vive aquí dentro: nadie más lo usa.
 */
export function ToolDock({ app }: { app: CodarchApp }) {
  const toolsId = useId();
  const [toolsClosed, setToolsClosed] = useState(() =>
    readSectionClosed(localStore(), "tool-dock", false)
  );

  const toggleTools = () =>
    setToolsClosed((current) => {
      writeSectionClosed(localStore(), "tool-dock", !current);
      return !current;
    });

  const { state, actions } = app;

  /**
   * El botón del mapa activo pliega la hoja; el del otro mapa la cambia y la
   * deja abierta. Es el mismo gesto que la barra del inspector (ADR 0079).
   */
  const chooseMap = (id: MapId) => {
    if (id === state.map) {
      toggleTools();
      return;
    }
    actions.setMap(id);
    if (toolsClosed) toggleTools();
  };

  return (
    <div className={`tool-dock${toolsClosed ? " is-folded" : ""}`}>
      <ToolBar
        open={!toolsClosed}
        settingsOpen={state.settingsOpen}
        map={state.map}
        restAvailable={state.rest !== null}
        panelId={toolsId}
        onSelectMap={chooseMap}
        onOpenSettings={() => actions.setSettingsOpen(true)}
      />
      {/* Plegada, la hoja sigue en el DOM para poder fundirse: `inert` la
          saca del foco y del árbol de accesibilidad (ADR 0083). */}
      <aside
        className="toolbar"
        id={toolsId}
        aria-label={toolLabel(state.map)}
        aria-hidden={toolsClosed}
        inert={toolsClosed}
      >
        <ViewControls app={app} />

        {state.map === "code" ? (
          <LanguageSample model={app.view.model} migration={app.migration} />
        ) : null}

        <Legend
          colorMode={state.colorMode}
          migration={app.migration}
          model={app.view.model}
        />

        {/* El calor es del código del repo abierto: en el mapa del resto no
            hay símbolos que calentar. La lista se carga al montarse, así que
            al cambiar de proyecto se remonta (ADR 0072). */}
        {state.map === "code" ? (
          <HeatList
            key={`heat:${state.source}`}
            load={app.loadHeat}
            onSelectSymbol={(name, path) => {
              void actions.openSymbolChain(name, path);
            }}
          />
        ) : null}

        {/* La deuda y los ficheros más tocados ya no tienen lista aquí:
            viven en Cambios, con el diff delante (ADR 0078). */}
      </aside>
    </div>
  );
}

/** El bloque «Vista»: qué mide el área, con qué se colorea y el buscador. */
function ViewControls({ app }: { app: CodarchApp }) {
  const { state, actions, view } = app;
  const { matches, metricOptions, metricTitle, hasChurn, migration, searchRef } =
    app;

  const submitSearch = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || !view.model) return;
    const needle = state.query.trim().toLowerCase();
    if (!needle) return;
    const match = view.model.files.find((file) =>
      file.path.toLowerCase().includes(needle)
    );
    if (match) {
      actions.selectIndex(match.index);
      actions.setTab("file");
    }
  };

  return (
    <section className="panel-block">
      <div className="eyebrow">Vista</div>
      <label className="field">
        <span>Área</span>
        <select
          value={state.areaMetric ?? ""}
          onChange={(event) => actions.setAreaMetric(event.target.value)}
        >
          {metricOptions.map((key) => (
            <option key={key} value={key}>
              {metricTitle(key)}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Color</span>
        <select
          value={state.colorMode}
          onChange={(event) => actions.setColorMode(event.target.value)}
        >
          {state.map === "code" ? (
            <>
              <option value="risk">Riesgo</option>
              <option value="structure">Estructura</option>
              {hasChurn ? <option value="churn">Calor (commits)</option> : null}
              {migration ? (
                <option value="status">Estado de migración</option>
              ) : null}
            </>
          ) : null}
          {metricOptions.map((key) => (
            <option key={key} value={key}>
              {metricTitle(key)}
            </option>
          ))}
        </select>
      </label>
      <label className="field search-field">
        <span>Buscar</span>
        <input
          ref={searchRef}
          type="search"
          placeholder="ruta o fichero…"
          title="Pulsa / para buscar; Enter abre el primer resultado"
          value={state.query}
          onChange={(event) => actions.setQuery(event.target.value)}
          onKeyDown={submitSearch}
        />
      </label>
      {state.query ? (
        <div className="muted tiny">
          {matches} de {view.model?.fileCount ?? 0} ficheros
        </div>
      ) : null}
    </section>
  );
}
