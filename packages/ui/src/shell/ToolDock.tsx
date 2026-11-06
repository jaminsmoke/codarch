import { useId, useState, type KeyboardEvent } from "react";
import type { CodarchApp, MapId } from "../app/types";
import { CollapsibleSection } from "../CollapsibleSection";
import { ToolBar, toolLabel } from "../ToolBar";
import { docsConfigAccess, planDocsTool } from "../lintConfig";
import { HeatList, LanguageSample, Legend } from "../panels";
import { DocsToolSheet } from "../panels/LintConfigSection";
import { localStore } from "../storage-local";
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
  const sources = {
    rest: state.rest !== null,
    codeLint: state.lint,
    docsLint: state.restLint
  };
  const access = docsConfigAccess(sources);
  /**
   * Hoja de configuración sin mapa del resto.
   *
   * El escenario sigue siendo el código: no se fabrica un `rest.cc.json` y el
   * catálogo no entra en los paneles del mapa de código.
   */
  const [catalogOnly, setCatalogOnly] = useState(false);
  const docsSheet = state.map === "rest" || catalogOnly;

  /**
   * El botón del mapa activo pliega la hoja; el del otro mapa la cambia y la
   * deja abierta. Es el mismo gesto que la barra del inspector (ADR 0079).
   *
   * Docs y config, sin resto, abre solo el catálogo.
   */
  const chooseMap = (id: MapId) => {
    if (id === "rest") {
      const plan = planDocsTool(sources);
      if (plan === "disabled") return;
      if (plan === "catalog-only") {
        if (catalogOnly) {
          toggleTools();
          return;
        }
        setCatalogOnly(true);
        if (toolsClosed) toggleTools();
        return;
      }
      if (catalogOnly) setCatalogOnly(false);
      if (id === state.map) {
        toggleTools();
        return;
      }
      actions.setMap("rest");
      if (toolsClosed) toggleTools();
      return;
    }
    if (catalogOnly) setCatalogOnly(false);
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
        map={docsSheet ? "rest" : state.map}
        docsAvailable={access.enabled}
        panelId={toolsId}
        onSelectMap={chooseMap}
        onOpenSettings={() => actions.setSettingsOpen(true)}
      />
      {/* Plegada, la hoja sigue en el DOM para poder fundirse: `inert` la
          saca del foco y del árbol de accesibilidad (ADR 0083). */}
      <aside
        className="toolbar"
        id={toolsId}
        aria-label={toolLabel(docsSheet ? "rest" : state.map)}
        aria-hidden={toolsClosed}
        inert={toolsClosed}
      >
        {catalogOnly ? (
          <DocsToolSheet
            hasRest={false}
            restModel={null}
            codeLint={state.lint}
            docsLint={state.restLint}
          />
        ) : (
          <>
            <ViewControls app={app} />

            {state.map === "code" ? (
              <LanguageSample model={app.view.model} migration={app.migration} />
            ) : (
              <DocsToolSheet
                hasRest
                restModel={app.view.model}
                codeLint={state.lint}
                docsLint={state.restLint}
              />
            )}

            <Legend
              colorMode={state.colorMode}
              migration={app.migration}
              model={app.view.model}
              hasLint={state.lint !== null}
            />
          </>
        )}

        {/* El calor es del código del repo abierto: en el mapa del resto no
            hay símbolos que calentar. La lista se carga al montarse, así que
            al cambiar de proyecto se remonta (ADR 0072). */}
        {state.map === "code" && !catalogOnly ? (
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
  // El color se pinta con la misma lista que los Ajustes (ADR 0094): dos listas
  // de lentes era la forma de que una ofreciera lo que la otra no.
  const { matches, metricOptions, metricTitle, colorOptions, searchRef } = app;

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
    <CollapsibleSection
      id="rail-view"
      title="Vista"
      className="panel-block"
      count={metricOptions.length}
      summary={`${metricOptions.length} áreas · ${colorOptions.length} colores`}
    >
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
          {colorOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
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
    </CollapsibleSection>
  );
}
