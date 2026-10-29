import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getStats, symbolsOf, type CcJson } from "@codarch/schema/browser";
import type { RepoAddon } from "@codarch/addons";
import type { HistoryEntry, SymbolChain, SymbolHeat } from "@codarch/schema/browser";
import type { PluginContext, PluginView } from "@codarch/plugin-api";
import { buildRenderModel } from "@codarch/render/browser";
import { usePlugins } from "./plugins";
import { CHURN_METRIC } from "./labels";
import { findFolder } from "./tree";
import { mapColorFor, metricIndexOf } from "./map";
import { orderedMetrics } from "./metrics";
import { readMigration } from "./data";
import { DEFAULT_DETAIL_OPTIONS, pruneTree, type DetailResult } from "./detail";
import { planSnapshotView } from "./app/snapshotView";
import type {
  Plataforma,
  CodeRequest,
  CodeSnippet,
  EditorRequest,
  FileDiffView
} from "./platform";
import { localStore, type ViewPreferences } from "./storage";
import {
  isColorModeAvailable,
  type InspectorTab,
  type ViewState as AppViewState
} from "./viewState";
import type {
  AppView,
  CodarchApp,
  CodarchAppActions,
  CodarchAppOptions,
  CodarchAppState,
  CodarchOption,
  MapId,
  WatchState
} from "./app/types";
import { useMapCamera } from "./app/camera";
import { useDocuments } from "./app/documents";
import { usePreferencesSync } from "./app/preferences";
import { useShortcuts } from "./app/shortcuts";

export type { ViewPreferences, SavedProject } from "./storage";
export type {
  CodarchApp,
  CodarchAppActions,
  CodarchAppOptions,
  CodarchAppState,
  CodarchOption,
  MapId,
  WatchState
} from "./app/types";

/**
 * El estado y las acciones de la app, en un solo hook.
 *
 * Lo que tiene una responsabilidad propia vive en `app/`: los tipos, la cámara
 * del mapa, los documentos que se abren y se guardan, las preferencias y los
 * atajos. Aquí queda lo que es de la app entera —qué se deriva del snapshot,
 * qué está seleccionado, qué vistas traen los plugins— y el pegamento entre
 * esas piezas.
 */
export function useCodarchApp(
  plataforma: Plataforma,
  options: CodarchAppOptions = {}
): CodarchApp {
  const [cc, setCc] = useState<CcJson | null>(null);
  /**
   * El mapa de lo que no es código (ADR 0093).
   *
   * Llega de la misma pasada que el snapshot del código y vive aparte: su
   * checksum es suyo y el mapa del código no lo mira.
   */
  const [rest, setRest] = useState<CcJson | null>(null);
  /**
   * El lint del proyecto (ADR 0094).
   *
   * `null` es «sin medir»; un artefacto con cero mensajes es «medido y
   * limpio». Lo carga cada plataforma y lo consume el mapa en la fase
   * siguiente.
   */
  const [lint, setLint] = useState<CodarchAppState["lint"]>(null);
  const [map, setMapView] = useState<MapId>("code");
  /**
   * El mapa de ahora, para las piezas que no pueden volver a crearse al
   * cambiar de mapa: `loadSnapshot` es la dependencia del arranque de la web, y
   * si cambiara de identidad se volvería a arrancar y se perdería el resto.
   */
  const mapRef = useRef<MapId>(map);
  useEffect(() => {
    mapRef.current = map;
  }, [map]);
  const [source, setSource] = useState(options.sourceInicial ?? "sin proyecto");
  const [areaMetric, setAreaMetric] = useState<string | null>(null);
  const [colorMode, setColorMode] = useState("risk");
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  /**
   * La carpeta que ocupa la ficha, si lo seleccionado es una carpeta (ADR 0092).
   *
   * La selección es una sola cosa: un fichero o una carpeta. Se guarda en dos
   * estados porque el fichero se maneja por índice y la carpeta por ruta, pero
   * las dos acciones de selección se limpian la una a la otra.
   */
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<CodarchAppState["report"]>(null);
  const [reportSource, setReportSource] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [tab, setTab] = useState<InspectorTab>("file");
  const [focusPath, setFocusPath] = useState<string | null>(null);
  /**
   * El fichero abierto en el escenario, en lugar del mapa (ADR 0087).
   *
   * Es estado de la vista: viaja en la URL con la clave `code` (ADR 0088), no
   * en el snapshot. Se cierra con la ruta, con `Esc` o al cargar otro snapshot.
   */
  const [openFile, setOpenFile] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [chain, setChain] = useState<SymbolChain | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [addons, setAddons] = useState<RepoAddon[]>([]);
  const [pluginView, setPluginView] = useState<string | null>(null);
  const [watch, setWatch] = useState<WatchState>("none");
  const [refreshedAt, setRefreshedAt] = useState<number | null>(null);

  const plugins = usePlugins(plataforma.plugins);
  const { zoom, center, setZoom, setCenter, zoomAt, panMap, fitMap } = useMapCamera();

  // `loadReport` se crea una vez: el ref le deja saber en qué pestaña está el
  // usuario sin volver a crearla en cada render.
  const tabRef = useRef(tab);
  useEffect(() => {
    tabRef.current = tab;
  }, [tab]);

  const preferencesRef = useRef<ViewPreferences | null | undefined>(undefined);
  /** El checksum del snapshot que hay en pantalla: distingue refresco de apertura. */
  const checksumRef = useRef<string | null>(null);
  if (preferencesRef.current === undefined) {
    preferencesRef.current = plataforma.leerPreferencias();
  }
  const selectedPathRef = useRef<string | null>(null);
  /** El buscador de la barra lateral: lo enfoca la tecla `/`. */
  const searchRef = useRef<HTMLInputElement | null>(null);

  const documents = useDocuments({
    plataforma,
    preferencesRef,
    checksumRef,
    tabRef,
    selectedPathRef,
    mapRef,
    cc,
    source,
    setCc,
    setRest,
    setLint,
    setMap: setMapView,
    setSource,
    setAreaMetric,
    setColorMode,
    setQuery,
    setSelectedIndex,
    setSelectedFolder,
    setFocusPath,
    setOpenFile,
    setShowLabels,
    setError,
    setLoading,
    setReport,
    setReportSource,
    setReportError,
    setTab,
    setAddons,
    setProgress,
    setRefreshedAt
  });
  const {
    loadSnapshot,
    loadRest,
    loadLint,
    loadReport,
    resetReport,
    abrirSnapshot,
    abrirReporte
  } = documents;

  usePreferencesSync({
    cc,
    // El área y el color que se guardan son los del mapa del código: las
    // preferencias del repo no tienen por qué saber del resto (ADR 0053).
    areaMetric: map === "rest" ? null : areaMetric,
    colorMode,
    showLabels,
    plataforma,
    preferencesRef
  });

  /** El snapshot que se está mirando: el código o el resto. */
  const activeCc = map === "rest" && rest ? rest : cc;

  const stats = useMemo(() => (activeCc ? getStats(activeCc) : null), [activeCc]);
  const migration = useMemo(() => readMigration(activeCc), [activeCc]);
  const hasChurn = useMemo(
    () =>
      stats
        ? stats.metricCoverage.some((entry) => entry.name === CHURN_METRIC)
        : false,
    [stats]
  );

  const view = useMemo<AppView>(() => {
    if (!activeCc || !areaMetric) return { model: null, error: null };
    try {
      return {
        model: buildRenderModel(activeCc, {
          areaMetric,
          color: colorMode === "status" ? "risk" : colorMode,
          title: activeCc.meta.projectName
        }),
        error: null
      };
    } catch (cause) {
      return { model: null, error: (cause as Error).message };
    }
  }, [activeCc, areaMetric, colorMode]);

  const detail = useMemo<DetailResult | null>(() => {
    if (!view.model) return null;
    const folder = focusPath ? findFolder(view.model.roots, focusPath) : null;
    const roots = folder ? [folder] : view.model.roots;
    const total = folder ? folder.fileCount : view.model.fileCount;
    return pruneTree(roots, DEFAULT_DETAIL_OPTIONS, total);
  }, [view.model, focusPath]);

  const selectIndex = useCallback(
    (index: number | null) => {
      setSelectedIndex(index);
      const file = index === null ? undefined : view.model?.files[index];
      selectedPathRef.current = file?.path ?? null;
      // Un fichero y una carpeta no pueden estar seleccionados a la vez, y la
      // hoja de la carpeta no se queda abierta hablando de un fichero.
      if (index !== null) {
        setSelectedFolder(null);
        setTab((current) => (current === "folder" ? "file" : current));
      }
    },
    [view.model]
  );

  /**
   * Selecciona una carpeta: la ficha pasa a hablar de ella (ADR 0092).
   *
   * No mueve el mapa: la selección y el foco son cosas distintas. Una ruta que
   * ya no existe en el árbol se ignora en silencio, como en `applyView`.
   */
  const selectFolder = useCallback(
    (path: string | null) => {
      if (path !== null && !findFolder(view.model?.roots ?? [], path)) return;
      setSelectedFolder(path);
      if (path !== null) {
        selectedPathRef.current = null;
        setSelectedIndex(null);
        // El clic en una carpeta abre su hoja: es la razón de tener entrada
        // propia en la barra de actividad (ADR 0092).
        setTab("folder");
      }
    },
    [view.model]
  );

  const openSymbolChain = useCallback(
    async (name: string, path: string) => {
      const file = view.model?.files.find((item) => item.path === path);
      if (file) selectIndex(file.index);

      if (!plataforma.cadenas) return;
      const raw = await plataforma.cadenas(name);
      const chains =
        raw && typeof raw === "object"
          ? (raw as { chains?: unknown }).chains
          : null;
      if (!Array.isArray(chains) || chains.length === 0) {
        setChain(null);
        return;
      }
      setChain((chains as SymbolChain[])[0] ?? null);
    },
    [view.model, selectIndex, plataforma]
  );

  // Derivado del modelo: es lo mismo en la web y en el escritorio (ADR 0049).
  const metricOptions = useMemo(
    () =>
      stats ? orderedMetrics(stats.metricCoverage.map((entry) => entry.name)) : [],
    [stats]
  );

  const descriptors = activeCc?.lenses?.metrics?.attributeDescriptors as
    | Record<string, { title?: string }>
    | undefined;

  const metricTitle = useCallback(
    (key: string): string => descriptors?.[key]?.title ?? key,
    [descriptors]
  );

  const areaOptions = useMemo<CodarchOption[]>(
    () => metricOptions.map((key) => ({ value: key, label: metricTitle(key) })),
    [metricOptions, metricTitle]
  );

  const colorOptions = useMemo<CodarchOption[]>(() => {
    // El resto no tiene riesgo, estructura ni migración: se pinta por tipo, y
    // el tamaño queda como un color más si se quiere.
    const options: CodarchOption[] = [];
    if (map === "code") {
      options.push({ value: "risk", label: "Riesgo" });
      options.push({ value: "structure", label: "Estructura" });
      if (hasChurn) options.push({ value: "churn", label: "Calor (commits)" });
      if (migration) {
        options.push({ value: "status", label: "Estado de migración" });
      }
    } else {
      options.push({ value: "kind", label: "Tipo" });
    }
    for (const option of areaOptions) options.push(option);
    return options;
  }, [hasChurn, migration, areaOptions, map]);

  const selectedFile =
    view.model && selectedIndex !== null
      ? view.model.files[selectedIndex] ?? null
      : null;
  const selectedFolderNode =
    view.model && selectedFolder
      ? findFolder(view.model.roots, selectedFolder)
      : null;
  const selectedMigration = selectedFile
    ? migration?.nodes[selectedFile.nodeId] ?? null
    : null;
  /** Los símbolos del fichero elegido, del más complejo al más simple. */
  const selectedSymbols = useMemo(
    () =>
      selectedFile && activeCc ? symbolsOf(activeCc, selectedFile.nodeId) : [],
    [activeCc, selectedFile]
  );
  const selectedStructure = useMemo(
    () =>
      selectedFile && activeCc
        ? activeCc.lenses?.structure?.nodes[selectedFile.nodeId] ?? null
        : null,
    [activeCc, selectedFile]
  );

  /** Las vistas que aportan los plugins activados. */
  const pluginViews = useMemo(() => {
    const views: PluginView[] = [];
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

  /** Lo que recibe el plugin: el modelo, lo que puede pedir y el color. */
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
        setTab: (tab: InspectorTab) => setTab(tab)
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
      storage: localStore()
    }),
    [
      view.model,
      selectedFile,
      areaMetric,
      colorMode,
      focusPath,
      tab,
      selectIndex,
      migration
    ]
  );

  const matches = useMemo(() => {
    if (!view.model || query.trim() === "") return view.model?.fileCount ?? 0;
    const needle = query.trim().toLowerCase();
    return view.model.files.filter((file) =>
      file.path.toLowerCase().includes(needle)
    ).length;
  }, [view.model, query]);

  /** Los addons que traen vistas guardadas: los únicos que dan menú. */
  const addonsWithViews = useMemo(
    () => addons.filter((addon) => addon.views.length > 0),
    [addons]
  );

  /** Selecciona un fichero por su ruta y vuelve a la pestaña del fichero. */
  const selectPath = useCallback(
    (path: string) => {
      const index =
        view.model?.files.findIndex((candidate) => candidate.path === path) ??
        -1;
      if (index >= 0) {
        selectIndex(index);
        setTab("file");
      }
    },
    [selectIndex, view.model]
  );

  /**
   * Abre un fichero en el escenario y lo deja seleccionado en la ficha.
   *
   * El mapa se sustituye por su código, no se añade una pestaña (ADR 0087).
   * Se vuelve con la ruta, con `Esc` o abriendo otra carpeta.
   */
  const openFileAt = useCallback(
    (path: string) => {
      const index = view.model?.files.findIndex((file) => file.path === path);
      if (index !== undefined && index >= 0) selectIndex(index);
      setOpenFile(path);
      setTab("file");
    },
    [selectIndex, view.model]
  );

  const closeFile = useCallback(() => setOpenFile(null), []);

  /**
   * Cambia de mapa: el del código o el del resto (ADR 0093).
   *
   * Es un cambio de modelo, no de vista. La selección, el foco y el fichero
   * abierto son del mapa anterior y se sueltan; el área y el color también son
   * de cada mapa, así que al volver al código se recuperan los suyos. El resto
   * se mide en bytes y se pinta por tipo (ADR 0093).
   */
  const changeMap = useCallback(
    (next: MapId) => {
      if (next === map) return;
      if (next === "rest" && !rest) return;
      setPluginView(null);
      setSelectedIndex(null);
      setSelectedFolder(null);
      setFocusPath(null);
      setOpenFile(null);
      setChain(null);
      selectedPathRef.current = null;
      setMapView(next);
      if (next === "rest") {
        setAreaMetric("bytes");
        setColorMode("kind");
        return;
      }
      const plan = cc
        ? planSnapshotView(cc, getStats(cc), preferencesRef.current)
        : null;
      setAreaMetric(plan?.areaMetric ?? null);
      setColorMode(plan?.colorMode ?? "risk");
    },
    [
      map,
      rest,
      cc,
      preferencesRef,
      selectedPathRef,
      setAreaMetric,
      setChain,
      setColorMode,
      setFocusPath,
      setOpenFile,
      setPluginView,
      setSelectedFolder,
      setSelectedIndex
    ]
  );

  // Si el resto desaparece (otro proyecto, un refresco sin él), no se puede
  // seguir en un mapa que ya no existe.
  /* eslint-disable react-hooks/set-state-in-effect -- el mapa activo se corrige cuando su snapshot deja de estar */
  useEffect(() => {
    if (map === "rest" && !rest) changeMap("code");
  }, [map, rest, changeMap]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /**
   * Aplica un estado de vista al mapa.
   *
   * Lo usan la URL de la web y las vistas guardadas de un addon (ADR 0029):
   * las dos hablan el mismo dialecto. Lo que no encaja con el snapshot
   * (métrica que no está, carpeta o fichero que ya no existen) se ignora en
   * silencio: es una pista, no un contrato.
   */
  const applyView = useCallback(
    (wanted: AppViewState) => {
      if (!view.model || !stats) return;
      const coverage = new Set(stats.metricCoverage.map((entry) => entry.name));
      if (wanted.areaMetric && coverage.has(wanted.areaMetric)) {
        setAreaMetric(wanted.areaMetric);
      }
      if (
        wanted.colorMode &&
        isColorModeAvailable(wanted.colorMode, coverage, migration)
      ) {
        setColorMode(wanted.colorMode);
      }
      if (wanted.focusPath && findFolder(view.model.roots, wanted.focusPath)) {
        setFocusPath(wanted.focusPath);
      }
      // La carpeta primero: si el enlace trae las dos selecciones, manda el
      // fichero, que es la clave que llevan los enlaces de siempre.
      if (wanted.folderPath) selectFolder(wanted.folderPath);
      if (wanted.filePath) {
        const index = view.model.files.findIndex(
          (file) => file.path === wanted.filePath
        );
        if (index >= 0) selectIndex(index);
      }
      // `code` manda sobre `file`: el enlace dice qué fichero se ve abierto.
      if (
        wanted.openFilePath &&
        view.model.files.some((file) => file.path === wanted.openFilePath)
      ) {
        openFileAt(wanted.openFilePath);
      }
      if (wanted.tab) setTab(wanted.tab);
      if (wanted.showLabels !== null) setShowLabels(wanted.showLabels);
      // El símbolo se abre después, cuando ya se puede pedir su cadena.
      if (wanted.symbolName) {
        void openSymbolChain(wanted.symbolName, wanted.filePath ?? "");
      }
    },
    [
      view.model,
      stats,
      migration,
      selectIndex,
      selectFolder,
      openFileAt,
      openSymbolChain
    ]
  );

  const loadHistory = useCallback(
    async (): Promise<HistoryEntry[] | null> =>
      plataforma.historial ? plataforma.historial() : null,
    [plataforma]
  );

  const loadHeat = useCallback(
    async (): Promise<SymbolHeat[] | null> =>
      plataforma.calor ? plataforma.calor() : null,
    [plataforma]
  );

  const loadDiff = useCallback(
    async (path: string): Promise<FileDiffView | null> =>
      plataforma.diff ? plataforma.diff(path) : null,
    [plataforma]
  );

  const leerCodigo = useCallback(
    async (request: CodeRequest): Promise<CodeSnippet | null> =>
      plataforma.codigo ? plataforma.codigo(request) : null,
    [plataforma]
  );

  const abrirEnEditor = useCallback(
    async (request: EditorRequest): Promise<boolean> =>
      plataforma.abrirEnEditor ? plataforma.abrirEnEditor(request) : false,
    [plataforma]
  );

  // Al cambiar de métrica se conserva el fichero elegido si sigue existiendo.
  /* eslint-disable react-hooks/set-state-in-effect -- la selección se deriva del modelo; el efecto la mantiene al cambiar de métrica */
  useEffect(() => {
    const files = view.model?.files;
    if (!files) {
      selectIndex(null);
      return;
    }
    // Una carpeta seleccionada no se cambia por el fichero por defecto al
    // cambiar de métrica (ADR 0092); solo cae si el refresco se la llevó.
    if (selectedFolder) {
      if (findFolder(view.model?.roots ?? [], selectedFolder)) return;
      setSelectedFolder(null);
    }
    const wanted = selectedPathRef.current;
    if (wanted) {
      const index = files.findIndex((file) => file.path === wanted);
      if (index >= 0) {
        selectIndex(index);
        return;
      }
    }
    selectIndex(view.model?.defaultSelection ?? null);
  }, [view.model, selectedFolder, selectIndex]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const clearSelection = useCallback(() => {
    setFocusPath(null);
    setOpenFile(null);
    selectedPathRef.current = null;
    setSelectedIndex(null);
    setSelectedFolder(null);
    setQuery("");
  }, [setFocusPath, setOpenFile, setQuery, setSelectedIndex]);
  useShortcuts({ search: searchRef, openSettings, clear: clearSelection });

  // Restaurar el último proyecto al montar. Solo si la plataforma guarda en
  // disco: la web lleva su propio arranque (servidor, URL, demo).
  useEffect(() => {
    if (!plataforma.restaurarProyecto) return;
    let cancelled = false;
    void (async () => {
      const saved = await plataforma.restaurarProyecto?.();
      if (cancelled) return;
      if (saved && loadSnapshot(saved.snapshot, saved.label, false, saved.preferences)) {
        setAddons((saved.addons ?? []) as RepoAddon[]);
        // El proyecto guardado puede traer su resto (ADR 0093).
        if (saved.rest) loadRest(saved.rest);
        // Y su lint (ADR 0094); sin él, el proyecto está sin medir.
        loadLint(saved.lint ?? null);
        if (saved.report) {
          loadReport(saved.report, saved.reportLabel ?? "report.json", false);
        }
        return;
      }
      if (saved) plataforma.borrarProyecto();
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadSnapshot, loadRest, loadLint, loadReport, plataforma]);

  // No hay un efecto que reescriba el proyecto cuando cambia `cc` a propósito:
  // cada camino que carga un snapshot ya lo guarda donde toca —«Abrir cc.json»,
  // soltar un fichero, cargar por URL y analizar una carpeta—, y el refresco del
  // live lo escribe el proceso que analiza. Reescribirlo aquí mandaba el
  // snapshot entero por IPC en cada guardado para dejar el disco igual que ya
  // estaba, y convertir una foto del historial en «proyecto» rompía la
  // vigilancia del repo (ADR 0048, ADR 0056).

  const state: CodarchAppState = {
    cc,
    rest,
    lint,
    map,
    source,
    areaMetric,
    colorMode,
    query,
    selectedIndex,
    selectedFolder,
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
    settingsOpen,
    zoom,
    center,
    showLabels,
    addons,
    pluginView,
    watch,
    refreshedAt
  };

  const actions: CodarchAppActions = {
    loadSnapshot,
    loadRest,
    loadLint,
    setMap: changeMap,
    loadReport,
    resetReport,
    analyzeFolder: documents.analyzeFolder,
    openSnapshotFile: documents.openSnapshotFile,
    openReportFile: documents.openReportFile,
    abrirSnapshot,
    abrirReporte,
    selectIndex,
    selectFolder,
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
    setZoom,
    setCenter,
    setShowLabels,
    setPluginView,
    setChain,
    setError,
    setReportError,
    setAddons,
    setSelectedIndex,
    setSelectedFolder,
    setLoading,
    setProgress,
    setWatch
  };

  return {
    state,
    actions,
    view,
    detail,
    stats,
    migration,
    hasChurn,
    plugins,
    preferencesRef,
    selectedPathRef,
    zoomAt,
    panMap,
    fitMap,
    searchRef,
    metricOptions,
    metricTitle,
    areaOptions,
    colorOptions,
    selectedFile,
    selectedFolderNode,
    selectedMigration,
    selectedSymbols,
    selectedStructure,
    pluginViews,
    activePluginView,
    pluginContext,
    matches,
    selectPath,
    openFileAt,
    closeFile,
    addonsWithViews,
    applyView,
    loadHistory,
    loadHeat,
    loadDiff
  };
}

