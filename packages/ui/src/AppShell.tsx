import {
  Fragment,
  type DragEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef
} from "react";
import type { AddonView as SavedView } from "@codarch/addons";
import type { HistoryEntry } from "@codarch/schema/browser";
import type { CodarchApp, WatchState } from "./useCodarchApp";
import { MapCanvas } from "./MapCanvas";
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
    progress,
    chain,
    zoom,
    center,
    showLabels,
    pluginView,
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
    loadHistory,
    loadHeat,
    loadDiff
  } = app;
  const viewsMenuRef = useRef<HTMLDetailsElement>(null);
  const projectTitle =
    view.model?.meta.title ?? cc?.meta.projectName ?? "Sin snapshot";

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

  // En Reglas se salta de un fichero a otro sin salir de la pestaña.
  const selectInPlace = (path: string) => {
    const index =
      view.model?.files.findIndex((file) => file.path === path) ?? -1;
    if (index >= 0) selectIndex(index);
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
          <span className="brand-mark">CODARCH</span>
          <span className="brand-sub">atlas de arquitectura</span>
        </div>
        <div className="snapshot-meta">
          <span className="mono">
            {source}
            {view.model?.meta.checksum
              ? ` · ${view.model.meta.checksum.slice(0, 8)}`
              : ""}
            {view.model?.meta.commit
              ? ` · ${view.model.meta.commit.slice(0, 8)}`
              : ""}
          </span>
          <WatchIndicator watch={watch} />
          <RefreshNotice at={refreshedAt} />
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
          <button
            className="button ghost icon-button"
            type="button"
            onClick={() => setSettingsOpen(true)}
            title="Ajustes"
            aria-label="Ajustes"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path
                fill="currentColor"
                d="M8 5.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Zm0 1.6a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Z"
              />
              <path
                fill="currentColor"
                d="M6.6.9h2.8l.3 1.6c.4.1.8.3 1.1.5l1.4-.9 2 2-.9 1.4c.2.4.4.7.5 1.1l1.6.3v2.8l-1.6.3c-.1.4-.3.8-.5 1.1l.9 1.4-2 2-1.4-.9c-.4.2-.7.4-1.1.5l-.3 1.6H6.6l-.3-1.6c-.4-.1-.8-.3-1.1-.5l-1.4.9-2-2 .9-1.4c-.2-.4-.4-.7-.5-1.1l-1.6-.3V6.9l1.6-.3c.1-.4.3-.8.5-1.1l-.9-1.4 2-2 1.4.9c.3-.2.7-.4 1.1-.5L6.6.9Z"
              />
            </svg>
          </button>
        </div>
      </header>

      <div className="project-band">
        <div className="project-ident">
          <span className="project-label">Proyecto</span>
          <h1 title={projectTitle}>{projectTitle}</h1>
        </div>
        {focusPath ? (
          <nav className="breadcrumb" aria-label="Ruta del mapa">
            <button
              className="breadcrumb-up"
              type="button"
              onClick={() => setFocusPath(upPath)}
              title={
                upPath
                  ? "Subir una carpeta (Retroceso)"
                  : "Salir de la carpeta (Esc)"
              }
              aria-label="Volver"
            >
              ←
            </button>
            <button type="button" onClick={() => setFocusPath(null)}>
              Todo
            </button>
            {trail.length > 0 ? (
              trail.map((crumb, index) =>
                index === trail.length - 1 ? (
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
                      onClick={() => setFocusPath(crumb.path)}
                    >
                      {crumb.name}
                    </button>
                  </Fragment>
                )
              )
            ) : (
              <>
                <span className="breadcrumb-sep">/</span>
                <span className="breadcrumb-current">{focusPath}</span>
              </>
            )}
          </nav>
        ) : null}
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
        <aside className="rail">
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

        <main className="stage">
          {banner}

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
                  className={`stage-tab${pluginView === view.id ? " is-active" : ""}`}
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
              pluginView && activePluginView ? (
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
                  onFocusFolder={setFocusPath}
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
                solo el zoom, sin repetir ficheros, carpetas ni formato. */}
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
              <span className="map-zoom-level">{Math.round(zoom * 100)}%</span>
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
                <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M6 2H2v4h1.5V3.5H6V2Zm4 0v1.5h2.5V6H14V2h-4ZM2 10v4h4v-1.5H3.5V10H2Zm10.5 0v2.5H10V14h4v-4h-1.5Z"
                  />
                </svg>
              </button>
            </div>
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

        <aside className="inspector">
          <div className="tabs" role="tablist" aria-label="Panel derecho">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "file"}
              className={`tab${tab === "file" ? " is-active" : ""}`}
              onClick={() => setTab("file")}
            >
              Fichero
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "changes"}
              className={`tab${tab === "changes" ? " is-active" : ""}`}
              onClick={() => setTab("changes")}
            >
              Cambios{" "}
              {report && reportHasChanges(report) ? (
                <i
                  className="tab-dot"
                  title="Hay cambios desde el último commit"
                />
              ) : null}
            </button>
          </div>
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
              onSelectPath={selectPath}
              loadHistory={loadHistory}
              loadDiff={loadDiff}
              onOpenHistory={onOpenHistory}
            />
          )}
        </aside>
      </div>

      {settings}
    </div>
  );
}

/** Lo que dice cada estado de vigilancia, en la cabecera. */
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
