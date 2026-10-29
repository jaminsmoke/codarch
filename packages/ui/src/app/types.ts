import type { CcJson, CcMigrationNode, CcStructureNode } from "@codarch/schema/browser";
import type { DiffReport } from "@codarch/metrics/browser";
import type { LintArtifact } from "@codarch/lint/browser";
import type { RepoAddon } from "@codarch/addons";
import type { HistoryEntry, SymbolChain, SymbolHeat } from "@codarch/schema/browser";
import type { PluginContext, PluginView } from "@codarch/plugin-api";
import type { getStats, symbolsOf } from "@codarch/schema/browser";
import type { RenderModel, TreeNode } from "@codarch/render/browser";
import type { usePlugins } from "../plugins";
import type { readMigration } from "../data";
import type { DetailResult } from "../detail";
import type {
  CodeRequest,
  CodeSnippet,
  EditorRequest,
  FileDiffView
} from "../platform";
import type { ViewPreferences } from "../storage";
import type { InspectorTab, ViewState as AppViewState } from "../viewState";

/** El estado de la vigilancia del repo: la dice cada plataforma. */
export type WatchState = "live" | "paused" | "none";

/**
 * El mapa que ocupa el escenario (ADR 0093).
 *
 * `code` es el mapa del código; `rest` es el mapa de lo que no es código
 * —documentos, configuración y assets—, con su propio snapshot y su propio
 * checksum. Es un mapa más, no una vista: cambia el modelo entero.
 */
export type MapId = "code" | "rest";

export interface CodarchAppState {
  cc: CcJson | null;
  /**
   * El snapshot de lo que no es código, si el proyecto lo trae (ADR 0093).
   *
   * `null` cuando no hay `rest.cc.json` o es de otro proyecto: entonces no hay
   * mapa del resto que enseñar.
   */
  rest: CcJson | null;
  /**
   * El lint del proyecto, si lo trae (ADR 0094).
   *
   * `null` no es «limpio»: es «sin medir». El artefacto vacío —medido y sin un
   * solo mensaje— también es un artefacto.
   */
  lint: LintArtifact | null;
  /** El mapa que ocupa el escenario. */
  map: MapId;
  source: string;
  areaMetric: string | null;
  colorMode: string;
  query: string;
  selectedIndex: number | null;
  /** La carpeta seleccionada, si lo que está abierto en la ficha es una (ADR 0092). */
  selectedFolder: string | null;
  error: string | null;
  loading: boolean;
  report: DiffReport | null;
  reportSource: string | null;
  reportError: string | null;
  tab: InspectorTab;
  focusPath: string | null;
  /** El fichero cuyo código ocupa el escenario, si hay uno abierto. */
  openFile: string | null;
  progress: string | null;
  chain: SymbolChain | null;
  settingsOpen: boolean;
  zoom: number;
  center: { x: number; y: number };
  showLabels: boolean;
  addons: RepoAddon[];
  pluginView: string | null;
  /**
   * Si el repo se vigila y el mapa se refresca solo (ADR 0050).
   *
   * `live` reanaliza al guardar; `paused` puede vigilar pero está parado;
   * `none` no hay vigilancia en esta plataforma.
   */
  watch: WatchState;
  /**
   * Cuándo llegó el último refresco con datos nuevos (ms de `Date.now()`).
   *
   * La cabecera lo enseña un momento y se apaga solo: el mapa se ha puesto al
   * día sin mover la vista.
   */
  refreshedAt: number | null;
}

export interface CodarchAppActions {
  loadSnapshot: (
    raw: unknown,
    label: string,
    preserveView?: boolean,
    preferences?: ViewPreferences | null
  ) => boolean;
  loadReport: (raw: unknown, label: string, focus?: boolean) => boolean;
  /**
   * Carga el mapa del resto, o lo quita con `null`.
   *
   * Un fichero que no es un mapa del resto se ignora: es un dato opcional y no
   * puede tumbar el mapa del código.
   */
  loadRest: (raw: unknown) => boolean;
  /**
   * Carga el lint del proyecto, o lo quita con `null`.
   *
   * Un artefacto que no se entiende se descarta: es una señal opcional y no
   * puede tumbar el mapa.
   */
  loadLint: (raw: unknown) => boolean;
  /** Cambia de mapa; sin resto cargado, a `rest` no se puede ir. */
  setMap: (map: MapId) => void;
  resetReport: () => void;
  analyzeFolder: () => Promise<void>;
  openSnapshotFile: () => Promise<void>;
  openReportFile: () => Promise<void>;
  selectIndex: (index: number | null) => void;
  /** Selecciona una carpeta por su ruta: la ficha cambia de sujeto (ADR 0092). */
  selectFolder: (path: string | null) => void;
  openSymbolChain: (name: string, path: string) => Promise<void>;
  /** Lee el código real de un símbolo, si la plataforma puede (ADR 0067). */
  leerCodigo: (request: CodeRequest) => Promise<CodeSnippet | null>;
  /** Abre un fichero en el editor del usuario (ADR 0068). */
  abrirEnEditor: (request: EditorRequest) => Promise<boolean>;
  /**
   * Carga un snapshot de un fichero o una URL y lo guarda como proyecto.
   *
   * Es el paso común de «Abrir cc.json», soltar un fichero y cargar por URL:
   * una sola escritura del proyecto y el reporte anterior fuera.
   */
  abrirSnapshot: (
    raw: unknown,
    label: string,
    rest?: unknown,
    lint?: unknown
  ) => boolean;
  /** Carga un reporte y lo guarda en el proyecto actual. */
  abrirReporte: (raw: unknown, label: string) => boolean;
  zoomAt: (factor: number, at?: { x: number; y: number }) => void;
  panMap: (dx: number, dy: number) => void;
  fitMap: () => void;
  setAreaMetric: (metric: string | null) => void;
  setColorMode: (mode: string) => void;
  setQuery: (query: string) => void;
  setFocusPath: (path: string | null) => void;
  setTab: (tab: InspectorTab) => void;
  setSettingsOpen: (open: boolean) => void;
  setZoom: (zoom: number) => void;
  setCenter: (center: { x: number; y: number }) => void;
  setShowLabels: (show: boolean) => void;
  setPluginView: (view: string | null) => void;
  setChain: (chain: SymbolChain | null) => void;
  setError: (message: string | null) => void;
  setReportError: (message: string | null) => void;
  setAddons: (addons: RepoAddon[]) => void;
  setSelectedIndex: (index: number | null) => void;
  setSelectedFolder: (path: string | null) => void;
  setLoading: (loading: boolean) => void;
  setProgress: (message: string | null) => void;
  /** Lo pone cada plataforma: si vigila el repo o no. */
  setWatch: (watch: WatchState) => void;
}

export interface CodarchApp {
  state: CodarchAppState;
  actions: CodarchAppActions;
  view: { model: RenderModel | null; error: string | null };
  detail: DetailResult | null;
  stats: ReturnType<typeof getStats> | null;
  migration: ReturnType<typeof readMigration>;
  hasChurn: boolean;
  plugins: ReturnType<typeof usePlugins>;
  preferencesRef: React.MutableRefObject<ViewPreferences | null | undefined>;
  selectedPathRef: React.MutableRefObject<string | null>;
  zoomAt: (factor: number, at?: { x: number; y: number }) => void;
  panMap: (dx: number, dy: number) => void;
  fitMap: () => void;
  /** El buscador de la barra lateral: lo enfoca la tecla `/`. */
  searchRef: React.RefObject<HTMLInputElement | null>;
  /** Las métricas del snapshot, en el orden en que se ofrecen. */
  metricOptions: string[];
  /** El título de una métrica, con el que trae el snapshot si lo trae. */
  metricTitle: (key: string) => string;
  /** Las opciones del selector de área de los ajustes. */
  areaOptions: CodarchOption[];
  /** Las opciones del selector de color de los ajustes. */
  colorOptions: CodarchOption[];
  selectedFile: RenderModel["files"][number] | null;
  /** La carpeta seleccionada, con su contenido (ADR 0092). */
  selectedFolderNode: TreeNode | null;
  selectedMigration: CcMigrationNode | null;
  selectedSymbols: ReturnType<typeof symbolsOf>;
  /** Miembros, imports y exports del fichero (ADR 0064). */
  selectedStructure: CcStructureNode | null;
  /** Las vistas que aportan los plugins activados. */
  pluginViews: PluginView[];
  activePluginView: PluginView | null;
  /** Lo que recibe la vista de un plugin. */
  pluginContext: PluginContext;
  /** Cuántos ficheros encajan con la búsqueda actual. */
  matches: number;
  /** Selecciona un fichero por su ruta y vuelve a la pestaña del fichero. */
  selectPath: (path: string) => void;
  /** Abre el código de un fichero en el escenario (ADR 0087). */
  openFileAt: (path: string) => void;
  /** Vuelve al mapa. */
  closeFile: () => void;
  /** Los addons que traen vistas guardadas: los únicos que dan menú. */
  addonsWithViews: RepoAddon[];
  /** Aplica un estado de vista (la URL o una vista guardada, ADR 0029). */
  applyView: (view: AppViewState) => void;
  /** El historial del repo, si la plataforma lo sabe leer. */
  loadHistory: () => Promise<HistoryEntry[] | null>;
  /** El calor de los símbolos, si la plataforma lo sabe leer. */
  loadHeat: () => Promise<SymbolHeat[] | null>;
  /** El diff de un fichero contra el último commit (ADR 0077). */
  loadDiff: (path: string) => Promise<FileDiffView | null>;
}

export interface CodarchAppOptions {
  /** La etiqueta inicial de la fuente (antes de cargar nada). */
  sourceInicial?: string;
}

/** Una opción de un selector de los ajustes. */
export interface CodarchOption {
  value: string;
  label: string;
}

/** Lo que la app deriva de un snapshot: el modelo del mapa y su fallo. */
export interface AppView {
  model: RenderModel | null;
  error: string | null;
}
