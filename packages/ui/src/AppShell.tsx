import {
  Fragment,
  type DragEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState
} from "react";
import type { AddonView as SavedView } from "@codarch/addons";
import type { HistoryEntry } from "@codarch/schema/browser";
import type { CodarchApp, WatchState } from "./useCodarchApp";
import { MapCanvas } from "./MapCanvas";
import { FileCodeView } from "./FileCodeView";
import { folderTrail, parentFolder } from "./tree";
import { viewStateFromSaved } from "./viewState";
import {
  HeatList,
  Inspector,
  Kpi,
  LanguageSample,
  Legend
} from "./panels";
import ChangesPanel, { reportHasChanges } from "./ChangesPanel";
import { InspectorBar, inspectorLabel } from "./InspectorBar";
import { ToolBar, toolLabel } from "./ToolBar";
import { localStore } from "./storage";
import { readSectionClosed, writeSectionClosed } from "./sections";
import mark from "./brand-mark.json";

/**
 * El armazón de la app: cabecera, barra lateral, mapa, inspector y ajustes.
 *
 * La web y el escritorio pintan lo mismo; lo que cambia de una plataforma a
 * otra entra por los huecos (`topbarActions`, `banner`, `settings`…) en vez de
 * duplicar el marcado (ADR 0049).
 */
export interface AppShellProps {
  app: CodarchApp;
  /** Botones propios de la plataforma, antes del menú de vistas. */
  topbarActions?: ReactNode;
  /** Botones propios de la plataforma, después del menú de vistas. */
  topbarTrailing?: ReactNode;
  /** Un aviso entre la cabecera del escenario y las pestañas. */
  banner?: ReactNode;
  /** Algo encima del mapa: la pista de arrastrar un fichero. */
  overlay?: ReactNode;
  /** Cancelar el análisis en marcha; sin esto no se pinta el botón. */
  onCancelAnalysis?: () => void;
  /** Abrir una foto del historial, con la ruta que sepa cada plataforma. */
  onOpenHistory: (entry: HistoryEntry) => void;
  /** Cargar el reporte desde donde sepa cada plataforma. */
  onLoadReport: () => void;
  /** Los ajustes ya montados: llevan props propias de la plataforma. */
  settings: ReactNode;
  /** Clases extra para el contenedor (por ejemplo, mientras se arrastra). */
  className?: string;
  onDragOver?: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave?: () => void;
  onDrop?: (event: DragEvent<HTMLDivElement>) => void;
}

export function AppShell({
  app,
  topbarActions,
  topbarTrailing,
  banner,
  overlay,
  onCancelAnalysis,
  onOpenHistory,
  onLoadReport,
  settings,
  className,
  onDragOver,
  onDragLeave,
  onDrop
}: AppShellProps) {
  const {
    cc,
    source,
    areaMetric,
    colorMode,
    query,
    selectedIndex,
    error,
    loading,
    report,
    reportSource,
    reportError,
    tab,
    focusPath,
    openFile,
    progress,
    chain,
    zoom,
    center,
    showLabels,
    pluginView,
    settingsOpen,
    watch,
    refreshedAt
  } = app.state;
  const {
    selectIndex,
    openSymbolChain,
    leerCodigo,
    abrirEnEditor,
    zoomAt,
    panMap,
    fitMap,
    setAreaMetric,
    setColorMode,
    setQuery,
    setFocusPath,
    setTab,
    setSettingsOpen,
    setPluginView
  } = app.actions;
  const {
    closeFile,
    view,
    detail,
    migration,
    hasChurn,
    metricOptions,
    metricTitle,
    selectedFile,
    selectedMigration,
    selectedSymbols,
    selectedStructure,
    pluginViews,
    activePluginView,
    pluginContext,
    matches,
    searchRef,
    addonsWithViews,
    selectPath,
    openFileAt,
    loadHistory,
    loadHeat,
    loadDiff
  } = app;
  const viewsMenuRef = useRef<HTMLDetailsElement>(null);
  const toolsId = useId();
  // Las herramientas se pliegan desde su icono, como la barra lateral de un
  // editor: el mapa gana el ancho de la hoja. El estado se recuerda entre
  // visitas, igual que el de una sección (ADR 0061 · ADR 0083).
  const [toolsClosed, setToolsClosed] = useState(() =>
    readSectionClosed(localStore(), "tool-dock", false)
  );
  const toggleTools = () =>
    setToolsClosed((current) => {
      writeSectionClosed(localStore(), "tool-dock", !current);
      return !current;
    });
  const projectTitle =
    view.model?.meta.title ?? cc?.meta.projectName ?? "Sin snapshot";
  // Lo que identifica al snapshot abierto, en una línea: la fuente y los dos
  // checksums cortos que enseña la banda del proyecto.
  const snapshotLine = `${source}${
    view.model?.meta.checksum
      ? ` · ${view.model.meta.checksum.slice(0, 8)}`
      : ""
  }${
    view.model?.meta.commit ? ` · ${view.model.meta.commit.slice(0, 8)}` : ""
  }`;

  const mapRoots = useMemo(() => detail?.roots ?? [], [detail]);

  // Las migas salen del árbol entero, no de la ruta ni de lo que se ve: con
  // el foco puesto, `mapRoots` ya es solo la carpeta abierta y no sabría cuál
  // es su padre. Cada tramo es una carpeta que existe y se puede abrir.
  const trail = useMemo(
    () => (focusPath ? folderTrail(view.model?.roots ?? [], focusPath) : []),
    [view.model, focusPath]
  );
  const upPath = focusPath
    ? parentFolder(view.model?.roots ?? [], focusPath)
    : null;

  // Retroceso sube una carpeta, igual que la flecha de las migas. Se ignora
  // al escribir en un campo: ahí la tecla borra, que es lo que toca.
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
      setFocusPath(upPath);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focusPath, upPath, setFocusPath]);

  const applySavedView = (saved: SavedView) => {
    viewsMenuRef.current?.removeAttribute("open");
    app.applyView(viewStateFromSaved(saved.state));
  };

  // En Reglas se salta de un fichero a otro sin salir de la pestaña. Si el
  // escenario estaba enseñando un código, vuelve al mapa: la vista no se queda
  // con un fichero que ya no es el seleccionado (ADR 0087).
  const selectInPlace = (path: string) => {
    const index =
      view.model?.files.findIndex((file) => file.path === path) ?? -1;
    if (index >= 0) selectIndex(index);
    closeFile();
  };

  return (
    <div
      className={`app${className ? ` ${className}` : ""}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <header className="topbar">
        <div className="brand">
          <CodarchMark />
          <span className="brand-lockup">
            <span className="brand-mark">CODARCH</span>
            <span className="brand-sub">atlas de arquitectura</span>
          </span>
        </div>
        <div className="topbar-actions">
          {topbarActions}
          {addonsWithViews.length > 0 ? (
            <details className="open-menu" ref={viewsMenuRef}>
              <summary className="button ghost">Vistas</summary>
              <div className="open-menu-panel">
                {addonsWithViews.map((addon) => (
                  <div key={addon.name} className="open-menu-group">
                    <span
                      className="open-menu-label"
                      title={addon.description ?? addon.title}
                    >
                      {addon.title}
                    </span>
                    {addon.views.map((saved) => (
                      <button
                        key={`${addon.name}:${saved.id}`}
                        type="button"
                        title={saved.description ?? saved.title}
                        onClick={() => applySavedView(saved)}
                      >
                        {saved.title}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </details>
          ) : null}
          {topbarTrailing}
        </div>
      </header>

      <div className="project-band">
        <div className="project-ident">
          <span className="project-label">Proyecto</span>
          <div className="project-name">
            <h1 title={projectTitle}>{projectTitle}</h1>
            <WatchIndicator watch={watch} />
            <RefreshNotice at={refreshedAt} />
          </div>
          {/* El snapshot es del proyecto abierto, no de la app: va bajo el
              nombre, y la vigilancia se queda al lado del nombre. */}
          <span className="project-snapshot mono" title={snapshotLine}>
            {snapshotLine}
          </span>
        </div>
        <div className="project-kpis">
          <Kpi label="ficheros" value={view.model?.fileCount ?? 0} />
          <Kpi label="carpetas" value={view.model?.folderCount ?? 0} />
          <Kpi
            label={view.model?.areaTitle ?? "área"}
            value={view.model?.totalArea ?? 0}
          />
          <Kpi
            label="deuda"
            value={migration?.summary.migrationDebt ?? 0}
            accent={migration ? "debt" : undefined}
          />
        </div>
      </div>

      <div className="shell">
        <div className={`tool-dock${toolsClosed ? " is-folded" : ""}`}>
          <ToolBar
            open={!toolsClosed}
            settingsOpen={settingsOpen}
            panelId={toolsId}
            onToggleOpen={toggleTools}
            onOpenSettings={() => setSettingsOpen(true)}
          />
          <aside
            className="toolbar"
            id={toolsId}
            aria-label={toolLabel("map")}
            hidden={toolsClosed}
          >
            <section className="panel-block">
              <div className="eyebrow">Vista</div>
              <label className="field">
                <span>Área</span>
                <select
                  value={areaMetric ?? ""}
                  onChange={(event) => setAreaMetric(event.target.value)}
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
                  value={colorMode}
                  onChange={(event) => setColorMode(event.target.value)}
                >
                  <option value="risk">Riesgo</option>
                  <option value="structure">Estructura</option>
                  {hasChurn ? <option value="churn">Calor (commits)</option> : null}
                  {migration ? (
                    <option value="status">Estado de migración</option>
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
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" || !view.model) return;
                    const needle = query.trim().toLowerCase();
                    if (!needle) return;
                    const match = view.model.files.find((file) =>
                      file.path.toLowerCase().includes(needle)
                    );
                    if (match) {
                      selectIndex(match.index);
                      setTab("file");
                    }
                  }}
                />
              </label>
              {query ? (
                <div className="muted tiny">
                  {matches} de {view.model?.fileCount ?? 0} ficheros
                </div>
              ) : null}
            </section>

            <LanguageSample model={view.model} migration={migration} />

            <Legend colorMode={colorMode} migration={migration} model={view.model} />

            {/* El calor es del repo abierto. La lista se carga al montarse, así
                que al cambiar de proyecto se remonta: sin esto se quedaba con las
                filas del repo anterior. La historia vive en Cambios (ADR 0072). */}
            <HeatList
              key={`heat:${source}`}
              load={loadHeat}
              onSelectSymbol={(name, path) => {
                void openSymbolChain(name, path);
              }}
            />

            {/* La deuda y los ficheros más tocados ya no tienen lista aquí:
                viven en Cambios, con el diff delante (ADR 0078). */}
          </aside>
        </div>

        <main className="stage">
          {banner}

          {/* La ruta es la navegación del escenario y está siempre: en el mapa
              entero dice «Todo» y, al enfocar una carpeta, cada tramo se puede
              pulsar. Vive aquí, no en la banda, porque navega el mapa y no
              describe el proyecto (ADR 0085). Con un fichero abierto, la ruta
              lleva su nombre y cada tramo vuelve al mapa (ADR 0087). */}
          <nav className="breadcrumb stage-path" aria-label="Ruta del mapa">
            {focusPath || openFile ? (
              <button
                className="breadcrumb-up"
                type="button"
                onClick={() => {
                setFocusPath(upPath);
                closeFile();
              }}
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
              <button
                type="button"
                onClick={() => {
                  setFocusPath(null);
                  closeFile();
                }}
              >
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
                  <button
                    type="button"
                    onClick={() => {
                      setFocusPath(crumb.path);
                      closeFile();
                    }}
                  >
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

          {pluginViews.length > 0 ? (
            <div className="stage-tabs">
              <button
                type="button"
                className={`stage-tab${pluginView === null ? " is-active" : ""}`}
                onClick={() => setPluginView(null)}
              >
                Mapa
              </button>
              {pluginViews.map((view) => (
                <button
                  key={view.id}
                  type="button"
                  className={`stage-tab${
                    pluginView === view.id ? " is-active" : ""
                  }`}
                  onClick={() => setPluginView(view.id)}
                >
                  {view.label}
                </button>
              ))}
            </div>
          ) : null}

          <div className="map-frame">
            {loading ? (
              <div className="empty">Cargando snapshot…</div>
            ) : view.error || error ? (
              <div className="empty error">
                <strong>No se pudo dibujar el mapa.</strong>
                <span>{view.error ?? error}</span>
              </div>
            ) : view.model ? (
              openFile ? (
                <FileCodeView
                  key={openFile}
                  path={openFile}
                  load={leerCodigo}
                  onClose={closeFile}
                />
              ) : pluginView && activePluginView ? (
                <div className="plugin-stage">
                  {activePluginView.render(pluginContext)}
                </div>
              ) : (
                <MapCanvas
                  model={view.model}
                  roots={mapRoots}
                  colorMode={colorMode}
                  migration={migration}
                  query={query.trim().toLowerCase()}
                  selectedIndex={selectedIndex}
                  onSelect={selectIndex}
                  onOpenFile={(index) => {
                    const file = view.model?.files[index];
                    if (file) openFileAt(file.path);
                  }}
                  onFocusFolder={(path) => {
                    setFocusPath(path);
                    closeFile();
                  }}
                  zoom={zoom}
                  center={center}
                  onZoomAt={zoomAt}
                  showLabels={showLabels}
                  onPan={panMap}
                />
              )
            ) : (
              <div className="empty">Abre un cc.json para empezar.</div>
            )}
            {overlay}
          </div>

          <div className="stage-foot">
            {/* Los datos del proyecto ya están en la banda de arriba: aquí
                solo el zoom, sin repetir ficheros, carpetas ni formato. Con un
                fichero abierto no hay mapa que acercar (ADR 0087). */}
            {openFile ? null : (
              <div
                className="map-controls"
                title="Con el botón derecho apretado, arrastra para mover el mapa"
              >
                <button
                  type="button"
                  onClick={() => zoomAt(1 / 1.25)}
                  disabled={zoom <= 1}
                  title="Alejar"
                  aria-label="Alejar"
                >
                  −
                </button>
                <span className="map-zoom-level">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => zoomAt(1.25)}
                  disabled={zoom >= 8}
                  title="Acercar"
                  aria-label="Acercar"
                >
                  +
                </button>
                <button
                  className="map-fit"
                  type="button"
                  onClick={fitMap}
                  disabled={zoom === 1}
                  title="Ver el mapa entero"
                  aria-label="Ver el mapa entero"
                >
                  <svg
                    viewBox="0 0 16 16"
                    width="12"
                    height="12"
                    aria-hidden="true"
                  >
                    <path
                      fill="currentColor"
                      d="M6 2H2v4h1.5V3.5H6V2Zm4 0v1.5h2.5V6H14V2h-4ZM2 10v4h4v-1.5H3.5V10H2Zm10.5 0v2.5H10V14h4v-4h-1.5Z"
                    />
                  </svg>
                </button>
              </div>
            )}
            {progress ? (
              <span className="progress-cell">
                <span className="mono detail-note">{progress}</span>
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
        </main>

        <div className="inspector-dock">
          <aside className="inspector" aria-label={inspectorLabel(tab)}>
            {tab === "file" ? (
              <Inspector
                model={view.model}
                file={selectedFile}
                migrationNode={selectedMigration}
                areaMetric={areaMetric}
                colorMode={colorMode}
                metricTitle={metricTitle}
                symbols={selectedSymbols}
                structure={selectedStructure}
                chain={chain}
                report={report}
                migration={migration}
                onSelectSymbol={(name) => {
                  void openSymbolChain(name, selectedFile?.path ?? "");
                }}
                onLoadCode={leerCodigo}
                onOpenEditor={abrirEnEditor}
                onSelectPath={selectInPlace}
                onColorMode={setColorMode}
              />
            ) : (
              <ChangesPanel
                report={report}
                model={view.model}
                source={reportSource}
                error={reportError}
                onLoad={onLoadReport}
                onSelectPath={(path) => {
                  selectPath(path);
                  closeFile();
                }}
                loadHistory={loadHistory}
                loadDiff={loadDiff}
                onOpenHistory={onOpenHistory}
              />
            )}
          </aside>
          <InspectorBar
            active={tab}
            alert={Boolean(report && reportHasChanges(report))}
            onSelect={setTab}
          />
        </div>
      </div>

      {settings}
    </div>
  );
}

/**
 * La marca de la casa: el mapa en miniatura del icono de la app.
 *
 * Un bloque grande con su pieza en la esquina y una columna de tres al otro
 * lado, separadas por las juntas del marco. La geometría vive en
 * `brand-mark.json`, que también lee el generador de iconos
 * (`npm run icons`): la cabecera, el favicon y los iconos del escritorio son
 * el mismo dibujo, no tres parecidos.
 */
function CodarchMark() {
  return (
    <svg
      className="brand-mark-icon"
      viewBox={`0 0 ${mark.viewBox} ${mark.viewBox}`}
      width="22"
      height="22"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        width={mark.viewBox}
        height={mark.viewBox}
        rx={mark.background.radius}
        fill={mark.background.fill}
      />
      {mark.blocks.map((block) => (
        <rect
          key={`${block.x}-${block.y}`}
          x={block.x}
          y={block.y}
          width={block.width}
          height={block.height}
          fill={block.fill}
        />
      ))}
    </svg>
  );
}

/** Lo que dice cada estado de vigilancia, en la banda del proyecto. */
const WATCH_LABEL: Record<WatchState, string> = {
  live: "live",
  paused: "live en pausa",
  none: "sin vigilancia"
};

const WATCH_TITLE: Record<WatchState, string> = {
  live: "El repositorio se reanaliza al guardar y el mapa se refresca solo.",
  paused: "La vigilancia está en pausa: el mapa no cambia hasta reanalizar.",
  none: "Sin vigilancia: el mapa se actualiza al analizar el repositorio."
};

/**
 * El aviso del refresco en vivo.
 *
 * Un guardado reanaliza el repo y el mapa se pone al día; la vista se queda
 * donde estaba. Esto solo lo dice un momento (la animación se apaga sola, sin
 * temporizadores): no hay diálogo ni nada que cerrar.
 */
function RefreshNotice({ at }: { at: number | null }) {
  // La `key` remonta el nodo en cada refresco, así que la animación empieza de
  // nuevo sin que haya que reiniciarla a mano.
  return (
    <span
      key={at ?? 0}
      className={`refresh-notice${at === null ? "" : " is-new"}`}
      title="El mapa se ha puesto al día con lo que hay en el repositorio."
      aria-live="polite"
    >
      actualizado
    </span>
  );
}

function WatchIndicator({ watch }: { watch: WatchState }) {
  return (
    <span
      className={`watch-indicator watch-${watch}`}
      title={WATCH_TITLE[watch]}
    >
      <i />
      {WATCH_LABEL[watch]}
    </span>
  );
}
