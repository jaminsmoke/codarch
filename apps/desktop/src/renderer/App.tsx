import { useCallback, useEffect, useMemo, useRef } from "react";
import { symbolsOf } from "@codarch/schema/browser";
import type { AddonView as SavedView } from "@codarch/addons";
import type { HistoryEntry, SymbolHeat } from "@codarch/schema/browser";
import {
  DebtList,
  findFolder,
  HeatList,
  HistoryPanel,
  HotList,
  Inspector,
  Kpi,
  LanguageSample,
  Legend,
  MapCanvas,
  mapColorFor,
  metricIndexOf,
  orderedMetrics,
  PrPanel,
  useCodarchApp
} from "@codarch/ui";
import { desktop } from "./bridge";
import { plataformaEscritorio } from "./plataforma";
import type { CodarchDesktop } from "../preload";
import { clearProject, writeProject } from "./storage";
import Settings from "./Settings";
import type { PluginContext } from "@codarch/plugin-api";

export default function App() {
  const plataforma = useMemo(() => plataformaEscritorio(), []);
  const app = useCodarchApp(plataforma);
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
    settingsOpen,
    zoom,
    center,
    showLabels,
    addons,
    pluginView
  } = app.state;
  const {
    loadSnapshot,
    loadReport,
    resetReport,
    analyzeFolder,
    openSnapshotFile,
    openReportFile,
    selectIndex,
    openSymbolChain,
    zoomAt,
    panMap,
    fitMap,
    setAreaMetric,
    setColorMode,
    setQuery,
    setFocusPath,
    setTab,
    setSettingsOpen,
    setShowLabels,
    setPluginView,
    setError,
    setAddons,
    setSelectedIndex
  } = app.actions;
  const { view, detail, stats, migration, hasChurn, plugins, selectedPathRef } =
    app;
  const searchRef = useRef<HTMLInputElement>(null);
  const viewsMenuRef = useRef<HTMLDetailsElement>(null);

  // El menú nativo abre los ajustes ✓.
  useEffect(() => {
    return desktop().onOpenSettings(() => setSettingsOpen(true));
  }, [setSettingsOpen]);

  /** Abre una foto del historial, leyéndola del disco. */
  const openHistorySnapshot = useCallback(
    async (entry: HistoryEntry) => {
      const name = `${entry.date.replace(/[:.]/g, "-").replace("Z", "")}-${entry.checksum.slice(0, 8)}.cc.json`;
      const raw = await desktop().historySnapshot(name);
      if (!raw) {
        setError(`No se pudo abrir la foto del ${entry.date}`);
        return;
      }
      loadSnapshot(raw, entry.date);
    },
    [loadSnapshot]
  );


  const mapRoots = useMemo(() => detail?.roots ?? [], [detail]);


  /**
   * Aplica una vista guardada de un addon (ADR 0029).
   *
   * Usa las mismas claves cortas que la URL de la web. Lo que no encaja con el
   * snapshot (una métrica que no está, una carpeta o un fichero que ya no
   * existen) se ignora en silencio: es una pista, no un contrato.
   */
  const applySavedView = useCallback(
    (saved: SavedView) => {
      viewsMenuRef.current?.removeAttribute("open");
      const wanted = saved.state;
      if (!view.model || !stats) return;
      const coverage = new Set(stats.metricCoverage.map((entry) => entry.name));
      if (wanted.area && coverage.has(wanted.area)) setAreaMetric(wanted.area);
      if (
        wanted.color &&
        (wanted.color === "risk" ||
          wanted.color === "structure" ||
          (wanted.color === "status" && Boolean(migration)) ||
          coverage.has(wanted.color))
      ) {
        setColorMode(wanted.color);
      }
      if (wanted.focus && findFolder(view.model.roots, wanted.focus)) {
        setFocusPath(wanted.focus);
      }
      if (wanted.file) {
        const index = view.model.files.findIndex((file) => file.path === wanted.file);
        if (index >= 0) selectIndex(index);
      }
      if (wanted.tab) setTab(wanted.tab);
      if (wanted.labels !== undefined) setShowLabels(wanted.labels);
      if (wanted.symbol) {
        void openSymbolChain(wanted.symbol, wanted.file ?? "");
      }
    },
    [view.model, stats, migration, selectIndex, openSymbolChain]
  );

  useEffect(() => {
    const files = view.model?.files;
    if (!files) {
      selectIndex(null);
      return;
    }
    // Al cambiar de métrica se conserva el fichero seleccionado si sigue existiendo.
    const wanted = selectedPathRef.current;
    if (wanted) {
      const index = files.findIndex((file) => file.path === wanted);
      if (index >= 0) {
        selectIndex(index);
        return;
      }
    }
    selectIndex(view.model?.defaultSelection ?? null);
  }, [view.model, selectIndex]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement;

      if (event.key === "/" && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }

      if (event.key !== "Escape") return;
      setFocusPath(null);
      selectedPathRef.current = null;
      setSelectedIndex(null);
      setQuery("");
      if (typing) target.blur();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const metricOptions = useMemo(
    () => (stats ? orderedMetrics(stats.metricCoverage.map((entry) => entry.name)) : []),
    [stats]
  );

  /** Los addons que traen vistas guardadas: los únicos que dan un menú. */
  const addonsWithViews = useMemo(
    () => addons.filter((addon) => addon.views.length > 0),
    [addons]
  );

  const descriptors = cc?.lenses?.metrics?.attributeDescriptors as
    | Record<string, { title?: string }>
    | undefined;

  const metricTitle = useCallback(
    (key: string): string => descriptors?.[key]?.title ?? key,
    [descriptors]
  );

  const selectedFile =
    view.model && selectedIndex !== null
      ? view.model.files[selectedIndex] ?? null
      : null;
  const selectedMigration = selectedFile
    ? migration?.nodes[selectedFile.nodeId] ?? null
    : null;
  /** Los símbolos del fichero elegido, de la función más compleja a la más simple. */
  const selectedSymbols = useMemo(
    () => (selectedFile && cc ? symbolsOf(cc, selectedFile.nodeId) : []),
    [cc, selectedFile]
  );

  /** Las vistas que aportan los plugins activados. */
  const pluginViews = useMemo(() => {
    const views = [];
    for (const descriptor of plugins.descriptors) {
      if (!plugins.enabled.includes(descriptor.manifest.name)) continue;
      const module = plugins.moduleOf(descriptor.manifest.name);
      for (const view of module?.views ?? []) views.push(view);
    }
    return views;
  }, [plugins]);

  /** La vista que está abierta, si la hay. */
  const activePluginView =
    pluginViews.find((view) => view.id === pluginView) ?? null;

  /** Lo que recibe el plugin. */
  const pluginContext = useMemo<PluginContext>(
    () => ({
      model: view.model,
      selection: selectedFile?.path ?? null,
      actions: {
        select: (path: string) => {
          const index = view.model?.files.findIndex(
            (file) => file.path === path
          );
          if (index !== undefined && index >= 0) selectIndex(index);
        },
        focus: (path: string) => setFocusPath(path),
        setTab: (tab: "file" | "pr") => setTab(tab)
      },
      preferences: { areaMetric, colorMode },
      colorFor: (index: number) => {
        const file = view.model?.files[index];
        if (!file || !view.model) return "#d5d2ca";
        return mapColorFor(
          file,
          colorMode,
          view.model,
          migration,
          metricIndexOf(view.model)
        );
      },
      url: {
        read: () => ({
          areaMetric,
          colorMode,
          focusPath,
          filePath: selectedFile?.path ?? null,
          tab
        }),
        write: (state) => {
          if (state.areaMetric !== undefined) setAreaMetric(state.areaMetric);
          if (state.colorMode !== undefined) setColorMode(state.colorMode);
          if (state.focusPath !== undefined) setFocusPath(state.focusPath);
        }
      },
      storage: readStorage()
    }),
    [
      view.model,
      selectedFile,
      areaMetric,
      colorMode,
      focusPath,
      tab,
      selectIndex
    ]
  );

  const matches = useMemo(() => {
    if (!view.model || query.trim() === "") return view.model?.fileCount ?? 0;
    const needle = query.trim().toLowerCase();
    return view.model.files.filter((file) => file.path.toLowerCase().includes(needle))
      .length;
  }, [view.model, query]);

  /** Enfoca un fichero desde la vista de PR. */
  const selectPath = useCallback(
    (path: string) => {
      const index =
        view.model?.files.findIndex((candidate) => candidate.path === path) ?? -1;
      if (index >= 0) {
        selectIndex(index);
        setTab("file");
      }
    },
    [selectIndex, view.model]
  );

  /**
   * Lo que llega del menú nativo o de "abrir con" con el sistema.
   *
   * El proceso principal ya hizo el trabajo (analizar o leer): aquí solo se
   * pinta el resultado.
   */
  useEffect(() => {
    const api = (window as unknown as { codarch?: CodarchDesktop }).codarch;
    if (!api?.onTarget) return;
    return api.onTarget((target) => {
      if (target.kind === "snapshot") {
        if (loadSnapshot(target.snapshot, target.label)) {
          setAddons([]);
          clearProject();
          writeProject({
            snapshot: target.snapshot,
            report: null,
            label: target.label,
            reportLabel: null,
            addons: []
          });
          resetReport();
        }
        return;
      }
      if (target.report === null) {
        setError(`No se pudo abrir ${target.label}`);
        return;
      }
      loadReport(target.report, target.label);
    });
  }, [loadReport, loadSnapshot, resetReport]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">CODARCH</span>
          <span className="brand-sub">atlas de arquitectura</span>
        </div>
        <div className="snapshot-meta">
          <span className="project">{cc?.meta.projectName ?? "sin proyecto"}</span>
          <span className="mono">
            {source}
            {view.model?.meta.checksum ? ` · ${view.model.meta.checksum.slice(0, 8)}` : ""}
            {view.model?.meta.commit ? ` · ${view.model.meta.commit.slice(0, 8)}` : ""}
          </span>
        </div>
        <div className="topbar-actions">
          <button
            className="button ghost"
            type="button"
            onClick={() => void analyzeFolder()}
          >
            Analizar carpeta
          </button>
          <button
            className="button ghost"
            type="button"
            onClick={() => void openSnapshotFile()}
          >
            Abrir cc.json
          </button>
          <button
            className="button ghost"
            type="button"
            onClick={() => void openReportFile()}
          >
            Abrir report.json
          </button>
          {addonsWithViews.length > 0 ? (
            <details className="open-menu" ref={viewsMenuRef}>
              <summary className="button ghost">Vistas</summary>
              <div className="open-menu-panel">
                {addonsWithViews.map((addon) => (
                  <div key={addon.name} className="open-menu-group">
                    <span className="open-menu-label" title={addon.description ?? addon.title}>
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
              <select value={colorMode} onChange={(event) => setColorMode(event.target.value)}>
                <option value="risk">Riesgo</option>
                <option value="structure">Estructura</option>
                {hasChurn ? <option value="churn">Calor (commits)</option> : null}
                {migration ? <option value="status">Estado de migración</option> : null}
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

          <HistoryPanel
            load={loadHistory}
            onOpenSnapshot={(entry) => {
              void openHistorySnapshot(entry);
            }}
          />

          <HotList
            model={view.model}
            selectedIndex={selectedIndex}
            onSelect={selectIndex}
          />

          <HeatList
            load={loadHeat}
            onSelectSymbol={(name, path) => {
              void openSymbolChain(name, path);
            }}
          />

          <DebtList
            model={view.model}
            migration={migration}
            selectedIndex={selectedIndex}
            onSelect={selectIndex}
          />
        </aside>

        <main className="stage">
          <div className="stage-head">
            <div>
              <div className="eyebrow">Mapa</div>
              <h1>{view.model?.meta.title ?? "Sin snapshot"}</h1>
              {focusPath ? (
                <div className="breadcrumb">
                  <button type="button" onClick={() => setFocusPath(null)}>
                    Todo
                  </button>
                  <span>/</span>
                  <span>{focusPath}</span>
                </div>
              ) : null}
            </div>
            <div className="stage-kpis">
              <Kpi label="ficheros" value={view.model?.fileCount ?? 0} />
              <Kpi label="carpetas" value={view.model?.folderCount ?? 0} />
              <Kpi label={view.model?.areaTitle ?? "área"} value={view.model?.totalArea ?? 0} />
              <Kpi
                label="deuda"
                value={migration?.summary.migrationDebt ?? 0}
                accent={migration ? "debt" : undefined}
              />
            </div>
          </div>

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
          </div>

          <div className="stage-foot">
            <div className="map-controls">
              <button
                type="button"
                onClick={() => zoomAt(1.25)}
                disabled={zoom >= 8}
                title="Acercar"
                aria-label="Acercar"
              >
                +
              </button>
              <span className="map-zoom-level">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                onClick={() => zoomAt(1 / 1.25)}
                disabled={zoom <= 1}
                title="Alejar"
                aria-label="Alejar"
              >
                −
              </button>
              <button
                type="button"
                onClick={fitMap}
                disabled={zoom === 1}
                title="Ver el mapa entero"
              >
                Ajustar
              </button>
              <span className="map-controls-hint" title="Con el botón derecho apretado, arrastra para mover el mapa">
                botón derecho: mover
              </span>
            </div>
            <span>
              {view.model
                ? `${view.model.fileCount} ficheros · ${view.model.folderCount} carpetas · ${view.model.meta.apiVersion}`
                : "—"}
            </span>
            {progress ? (
              <span className="mono detail-note">{progress}</span>
            ) : detail && detail.hiddenFiles > 0 ? (
              <span className="mono detail-note">
                {`nivel carpeta · ${detail.cells} bloques · ${detail.hiddenFiles} ficheros dentro`}
              </span>
            ) : (
              <span className="mono">
                {view.model?.warnings[0] ?? "clic en una celda para inspeccionar"}
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
              aria-selected={tab === "pr"}
              className={`tab${tab === "pr" ? " is-active" : ""}`}
              onClick={() => setTab("pr")}
            >
              PR {report ? <i className="tab-dot" title="Reporte cargado" /> : null}
            </button>
          </div>
          {tab === "file" ? (
            <Inspector
              model={view.model}
              file={selectedFile}
              migrationNode={selectedMigration}
              areaMetric={areaMetric}
              metricTitle={metricTitle}
              symbols={selectedSymbols}
              chain={chain}
              onSelectSymbol={(name) => {
                void openSymbolChain(name, selectedFile?.path ?? "");
              }}
            />
          ) : (
            <PrPanel
              report={report}
              source={reportSource}
              error={reportError}
              onLoad={() => void openReportFile()}
              onSelectPath={selectPath}
            />
          )}
        </aside>
      </div>

      <Settings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        areaMetric={areaMetric}
        onAreaMetric={(value) => setAreaMetric(value)}
        colorMode={colorMode}
        onColorMode={(value) => setColorMode(value)}
        areaOptions={metricOptions.map((key) => ({
          value: key,
          label: metricTitle(key)
        }))}
        colorOptions={[
          { value: "risk", label: "Riesgo" },
          { value: "structure", label: "Estructura" },
          ...(hasChurn ? [{ value: "churn", label: "Calor (commits)" }] : []),
          ...(migration
            ? [{ value: "status", label: "Estado de migración" }]
            : []),
          ...metricOptions.map((key) => ({
            value: key,
            label: metricTitle(key)
          }))
        ]}
        model={view.model}
        savedProject={null}
        onClearProject={() => setSettingsOpen(false)}
        storageAvailable={true}
        version={desktop().version}
        plugins={plugins.descriptors}
        enabledPlugins={plugins.enabled}
        onTogglePlugin={plugins.toggle}
        failedPlugins={plugins.failed}
        addons={addons}
        showLabels={showLabels}
        onShowLabels={setShowLabels}
      />
    </div>
  );
}

/** La línea del tiempo que guarda el proceso principal ✓. */
async function loadHistory(): Promise<HistoryEntry[] | null> {
  const index = await desktop().history();
  return index && Array.isArray(index.entries) ? index.entries : null;
}

/** El calor de los símbolos que calcula el proceso principal ✓. */
async function loadHeat(): Promise<SymbolHeat[] | null> {
  const raw = await desktop().chains();
  if (!raw || typeof raw !== "object") return null;
  const list = (raw as { heat?: unknown }).heat;
  return Array.isArray(list) ? (list as SymbolHeat[]) : null;
}

/** El almacenamiento local, si el navegador lo deja. */
function readStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

