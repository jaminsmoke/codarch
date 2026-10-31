import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CcJson } from "@codarch/schema/browser";
import type { RepoAddon } from "@codarch/addons";
import type { SymbolChain } from "@codarch/schema/browser";
import { usePlugins } from "./plugins";
import { metricCoverage, planMapSwitch } from "./app/snapshotView";
import { planViewState } from "./app/applyView";
import { useDerivedMap } from "./app/derived";
import { useRestoreProject, useExistingMap } from "./app/restore";
import { useRestoreSelection, useSelection } from "./app/useSelection";
import { useViewOptions } from "./app/viewOptions";
import { usePluginBindings } from "./app/pluginBindings";
import { platformBridges } from "./app/bridges";
import type { Plataforma } from "./platform";
import type { ViewPreferences } from "./storage";
import type { InspectorTab, ViewState as AppViewState } from "./viewState";
import type {
  CodarchApp,
  CodarchAppActions,
  CodarchAppOptions,
  CodarchAppState,
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
 * El estado y las acciones de la app.
 *
 * El hook es el pegamento: guarda el estado, encadena las piezas y devuelve lo
 * que la interfaz pinta. Lo que tiene una regla propia vive fuera, en `app/`:
 * la cámara, los documentos, las preferencias, los atajos, lo que se deriva del
 * snapshot, la selección, las opciones de los selectores, el contexto de los
 * plugins y el arranque del último proyecto. Cada una se lee —y sus reglas se
 * prueban— sin montar la app.
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

  /** El snapshot que se mira, sus cuentas, su modelo, su detalle y su foco. */
  const { activeCc, stats, migration, hasChurn, view, detail } = useDerivedMap({
    cc,
    rest,
    lint,
    map,
    areaMetric,
    colorMode,
    focusPath
  });

  /** Qué está elegido, qué se abre y qué hoja lo lee (ADR 0092, ADR 0087). */
  const selection = useSelection({
    model: view.model,
    activeCc,
    migration,
    selectedIndex,
    selectedFolder,
    selectedPathRef,
    setSelectedIndex,
    setSelectedFolder,
    setTab,
    setOpenFile,
    setFocusPath,
    setQuery,
    setChain,
    chains: plataforma.cadenas ?? null
  });
  const {
    selectIndex,
    restoreIndex,
    selectFolder,
    openSymbolChain,
    selectedFile,
    selectedFolderNode,
    selectedMigration,
    selectedSymbols,
    selectedStructure,
    selectPath,
    openFileAt,
    closeFile,
    clearSelection
  } = selection;

  useRestoreSelection({
    model: view.model,
    selectedFolder,
    selectedPathRef,
    restoreIndex,
    setSelectedFolder,
    setTab
  });

  // Derivado del modelo: es lo mismo en la web y en el escritorio (ADR 0049).
  const descriptors = activeCc?.lenses?.metrics?.attributeDescriptors as
    | Record<string, { title?: string }>
    | undefined;

  /** Las métricas que se ofrecen, sus títulos y los colores que se pueden pintar. */
  const { metricOptions, metricTitle, areaOptions, colorOptions } =
    useViewOptions({ stats, descriptors, map, lint, hasChurn, migration });

  /** Las vistas de los plugins activados y lo que reciben al dibujar. */
  const { pluginViews, activePluginView, pluginContext } = usePluginBindings({
    plugins,
    pluginView,
    model: view.model,
    selectedFile,
    areaMetric,
    colorMode,
    focusPath,
    tab,
    migration,
    select: selectIndex,
    setFocusPath,
    setTab,
    setAreaMetric,
    setColorMode
  });

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
      const plan = planMapSwitch({
        next,
        current: map,
        cc,
        rest,
        preferences: preferencesRef.current
      });
      if (plan.kind !== "switch") return;
      setPluginView(null);
      setSelectedIndex(null);
      setSelectedFolder(null);
      setFocusPath(null);
      setOpenFile(null);
      setChain(null);
      selectedPathRef.current = null;
      setMapView(plan.map);
      setAreaMetric(plan.areaMetric);
      setColorMode(plan.colorMode);
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

  useExistingMap({ map, rest, changeMap });

  /**
   * Aplica un estado de vista al mapa.
   *
   * Lo usan la URL de la web y las vistas guardadas de un addon (ADR 0029):
   * las dos hablan el mismo dialecto. El plan dice qué encaja con este mapa y
   * qué se ignora en silencio; aquí solo se obedece.
   */
  const applyView = useCallback(
    (wanted: AppViewState) => {
      if (!view.model || !stats) return;
      const plan = planViewState(wanted, {
        model: view.model,
        coverage: metricCoverage(stats),
        migration
      });
      if (plan.areaMetric !== null) setAreaMetric(plan.areaMetric);
      if (plan.colorMode !== null) setColorMode(plan.colorMode);
      if (plan.focusPath !== null) setFocusPath(plan.focusPath);
      if (plan.folderPath !== null) selectFolder(plan.folderPath);
      if (plan.fileIndex !== null) selectIndex(plan.fileIndex);
      if (plan.openFilePath !== null) openFileAt(plan.openFilePath);
      if (plan.tab !== null) setTab(plan.tab);
      if (plan.showLabels !== null) setShowLabels(plan.showLabels);
      if (plan.symbol) void openSymbolChain(plan.symbol.name, plan.symbol.path);
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

  /** Las puertas opcionales de la plataforma, con las que faltan apagadas. */
  const bridges = useMemo(() => platformBridges(plataforma), [plataforma]);

  const openSettings = useCallback(() => setSettingsOpen(true), []);
  useShortcuts({ search: searchRef, openSettings, clear: clearSelection });

  useRestoreProject({
    plataforma,
    loadSnapshot,
    loadRest,
    loadLint,
    loadReport,
    setAddons,
    setLoading
  });

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
    leerCodigo: bridges.leerCodigo,
    abrirEnEditor: bridges.abrirEnEditor,
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
    loadHistory: bridges.loadHistory,
    loadHeat: bridges.loadHeat,
    loadDiff: bridges.loadDiff
  };
}
