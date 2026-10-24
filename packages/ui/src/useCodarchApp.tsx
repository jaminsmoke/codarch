import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  defaultMetric,
  getStats,
  parseCcJson,
  symbolsOf,
  type CcJson,
  type CcMigrationNode
} from "@codarch/schema/browser";
import type { DiffReport } from "@codarch/metrics/browser";
import type { RepoAddon } from "@codarch/addons";
import type { HistoryEntry, SymbolChain, SymbolHeat } from "@codarch/schema/browser";
import type { PluginContext, PluginView } from "@codarch/plugin-api";
import { buildRenderModel, type RenderModel } from "@codarch/render/browser";
import { usePlugins } from "./plugins";
import { CHURN_METRIC } from "./labels";
import { findFolder } from "./tree";
import { mapColorFor, metricIndexOf } from "./map";
import { orderedMetrics } from "./metrics";
import { readMigration, readReport } from "./data";
import { DEFAULT_DETAIL_OPTIONS, pruneTree, type DetailResult } from "./detail";
import type { Plataforma } from "./platform";
import { localStore, type ViewPreferences } from "./storage";
import {
  isColorModeAvailable,
  type ViewState as AppViewState
} from "./viewState";

export type { ViewPreferences, SavedProject } from "./storage";

export interface CodarchAppState {
  cc: CcJson | null;
  source: string;
  areaMetric: string | null;
  colorMode: string;
  query: string;
  selectedIndex: number | null;
  error: string | null;
  loading: boolean;
  report: DiffReport | null;
  reportSource: string | null;
  reportError: string | null;
  tab: "file" | "pr";
  focusPath: string | null;
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
}

/** El estado de la vigilancia del repo: la dice cada plataforma. */
export type WatchState = "live" | "paused" | "none";

export interface CodarchAppActions {
  loadSnapshot: (raw: unknown, label: string, preserveView?: boolean) => boolean;
  loadReport: (raw: unknown, label: string, focus?: boolean) => boolean;
  resetReport: () => void;
  analyzeFolder: () => Promise<void>;
  openSnapshotFile: () => Promise<void>;
  openReportFile: () => Promise<void>;
  selectIndex: (index: number | null) => void;
  openSymbolChain: (name: string, path: string) => Promise<void>;
  /**
   * Carga un snapshot de un fichero o una URL y lo guarda como proyecto.
   *
   * Es el paso común de «Abrir cc.json», soltar un fichero y cargar por URL:
   * una sola escritura del proyecto y el reporte anterior fuera.
   */
  abrirSnapshot: (raw: unknown, label: string) => boolean;
  /** Carga un reporte y lo guarda en el proyecto actual. */
  abrirReporte: (raw: unknown, label: string) => boolean;
  zoomAt: (factor: number, at?: { x: number; y: number }) => void;
  panMap: (dx: number, dy: number) => void;
  fitMap: () => void;
  setAreaMetric: (metric: string | null) => void;
  setColorMode: (mode: string) => void;
  setQuery: (query: string) => void;
  setFocusPath: (path: string | null) => void;
  setTab: (tab: "file" | "pr") => void;
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
  setLoading: (loading: boolean) => void;
  setProgress: (message: string | null) => void;
  /** Lo pone cada plataforma: si vigila el repo o no. */
  setWatch: (watch: WatchState) => void;
}

interface ViewState {
  model: RenderModel | null;
  error: string | null;
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
  selectedMigration: CcMigrationNode | null;
  selectedSymbols: ReturnType<typeof symbolsOf>;
  /** Las vistas que aportan los plugins activados. */
  pluginViews: PluginView[];
  activePluginView: PluginView | null;
  /** Lo que recibe la vista de un plugin. */
  pluginContext: PluginContext;
  /** Cuántos ficheros encajan con la búsqueda actual. */
  matches: number;
  /** Selecciona un fichero por su ruta y vuelve a la pestaña del fichero. */
  selectPath: (path: string) => void;
  /** Los addons que traen vistas guardadas: los únicos que dan menú. */
  addonsWithViews: RepoAddon[];
  /** Aplica un estado de vista (la URL o una vista guardada, ADR 0029). */
  applyView: (view: AppViewState) => void;
  /** El historial del repo, si la plataforma lo sabe leer. */
  loadHistory: () => Promise<HistoryEntry[] | null>;
  /** El calor de los símbolos, si la plataforma lo sabe leer. */
  loadHeat: () => Promise<SymbolHeat[] | null>;
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

export function useCodarchApp(
  plataforma: Plataforma,
  options: CodarchAppOptions = {}
): CodarchApp {
  const [cc, setCc] = useState<CcJson | null>(null);
  const [source, setSource] = useState(options.sourceInicial ?? "sin proyecto");
  const [areaMetric, setAreaMetric] = useState<string | null>(null);
  const [colorMode, setColorMode] = useState("risk");
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<DiffReport | null>(null);
  const [reportSource, setReportSource] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [tab, setTab] = useState<"file" | "pr">("file");
  const [focusPath, setFocusPath] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [chain, setChain] = useState<SymbolChain | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState({ x: 0.5, y: 0.5 });
  const [showLabels, setShowLabels] = useState(true);
  const plugins = usePlugins(plataforma.plugins);
  const [addons, setAddons] = useState<RepoAddon[]>([]);
  const [pluginView, setPluginView] = useState<string | null>(null);
  const [watch, setWatch] = useState<WatchState>("none");

  const preferencesRef = useRef<ViewPreferences | null | undefined>(undefined);
  if (preferencesRef.current === undefined) {
    preferencesRef.current = plataforma.leerPreferencias();
  }
  const selectedPathRef = useRef<string | null>(null);

  const zoomAt = useCallback(
    (factor: number, at?: { x: number; y: number }) => {
      setZoom((current) => {
        const next = Math.min(8, Math.max(1, current * factor));
        if (next === current) return current;
        if (at) {
          const dx = at.x - center.x;
          const dy = at.y - center.y;
          const scale = 1 - next / current;
          setCenter({
            x: Math.min(1, Math.max(0, center.x + dx * scale)),
            y: Math.min(1, Math.max(0, center.y + dy * scale))
          });
        }
        return next;
      });
    },
    [center]
  );

  const panMap = useCallback(
    (dx: number, dy: number) => {
      setCenter((current) => {
        const hidden = 1 - 1 / zoom;
        if (hidden <= 0.001) return current;
        return {
          x: Math.min(1, Math.max(0, current.x - dx / hidden)),
          y: Math.min(1, Math.max(0, current.y - dy / hidden))
        };
      });
    },
    [zoom]
  );

  const fitMap = useCallback(() => {
    setZoom(1);
    setCenter({ x: 0.5, y: 0.5 });
  }, []);

  const stats = useMemo(() => (cc ? getStats(cc) : null), [cc]);
  const migration = useMemo(() => readMigration(cc), [cc]);
  const hasChurn = useMemo(
    () =>
      stats
        ? stats.metricCoverage.some((entry) => entry.name === CHURN_METRIC)
        : false,
    [stats]
  );

  const loadSnapshot = useCallback(
    (raw: unknown, label: string, preserveView = false): boolean => {
      try {
        const parsed = parseCcJson(raw);
        const nextStats = getStats(parsed);
        const coverage = new Set(nextStats.metricCoverage.map((entry) => entry.name));
        const nextArea = coverage.has("rloc")
          ? "rloc"
          : defaultMetric(nextStats) ?? nextStats.metricCoverage[0]?.name ?? null;
        const wanted = preferencesRef.current;
        const preferredArea =
          wanted?.areaMetric && coverage.has(wanted.areaMetric)
            ? wanted.areaMetric
            : nextArea;
        const preferredColor = wanted?.colorMode;
        const validPreferredColor =
          preferredColor &&
          (preferredColor === "risk" ||
            preferredColor === "structure" ||
            (preferredColor === "status" && Boolean(parsed.lenses?.migration)) ||
            coverage.has(preferredColor))
            ? preferredColor
            : null;
        const defaultColor =
          parsed.lenses?.migration && coverage.has("migrationDebt")
            ? "migrationDebt"
            : "risk";

        setCc(parsed);
        setSource(label);
        setAreaMetric((current) =>
          preserveView && current && coverage.has(current) ? current : preferredArea
        );
        setColorMode((current) => {
          if (preserveView) {
            if (current === "risk" || current === "structure" || current === "status") {
              return current;
            }
            return coverage.has(current) ? current : "risk";
          }
          return validPreferredColor ?? defaultColor;
        });
        if (!preserveView) {
          setQuery("");
          selectedPathRef.current = null;
          setSelectedIndex(null);
          setFocusPath(null);
        }
        setError(null);
        return true;
      } catch (cause) {
        setError((cause as Error).message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const loadReport = useCallback(
    (raw: unknown, label: string, focus = true): boolean => {
      const next = readReport(raw);
      if (!next) {
        setReportError(`El fichero ${label} no parece un report.json de CodArch.`);
        return false;
      }
      setReport(next);
      setReportSource(label);
      setReportError(null);
      if (focus) setTab("pr");
      return true;
    },
    []
  );

  const resetReport = useCallback(() => {
    setReport(null);
    setReportSource(null);
    setReportError(null);
    setTab("file");
  }, []);

  /**
   * Carga un snapshot y lo guarda como el proyecto actual.
   *
   * Es el paso que comparten «Abrir cc.json», soltar un fichero y cargar por
   * URL: una sola escritura y el reporte anterior fuera.
   */
  const abrirSnapshot = useCallback(
    (raw: unknown, label: string): boolean => {
      if (!loadSnapshot(raw, label)) return false;
      setAddons([]);
      void plataforma.escribirProyecto({
        snapshot: raw,
        report: null,
        label,
        reportLabel: null,
        addons: []
      });
      resetReport();
      return true;
    },
    [loadSnapshot, resetReport, plataforma]
  );

  /** Carga un reporte y lo guarda en el proyecto actual. */
  const abrirReporte = useCallback(
    (raw: unknown, label: string): boolean => {
      if (!loadReport(raw, label)) return false;
      const saved = plataforma.leerProyecto();
      if (saved) {
        void plataforma.escribirProyecto({
          ...saved,
          report: raw,
          reportLabel: label
        });
      }
      return true;
    },
    [loadReport, plataforma]
  );

  const analyzeFolder = useCallback(async () => {
    const { elegirCarpeta, analizar } = plataforma;
    if (!elegirCarpeta || !analizar) return;
    const root = await elegirCarpeta();
    if (!root) return;
    setLoading(true);
    setError(null);
    setProgress(`Analizando ${root}...`);
    try {
      const result = await analizar(root);
      if (loadSnapshot(result.snapshot, root)) {
        setAddons(result.addons.addons);
        void plataforma.escribirProyecto({
          snapshot: result.snapshot,
          report: null,
          label: root,
          reportLabel: null,
          addons: result.addons.addons
        });
        resetReport();
      }
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setProgress(null);
      setLoading(false);
    }
  }, [loadSnapshot, resetReport, plataforma]);

  const openSnapshotFile = useCallback(async () => {
    const { elegirFichero, leerJson } = plataforma;
    if (!elegirFichero || !leerJson) return;
    const file = await elegirFichero();
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      abrirSnapshot(await leerJson(file), file);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  }, [plataforma, abrirSnapshot]);

  const openReportFile = useCallback(async () => {
    const { elegirFichero, leerJson } = plataforma;
    if (!elegirFichero || !leerJson) return;
    const file = await elegirFichero();
    if (!file) return;
    try {
      abrirReporte(await leerJson(file), file);
    } catch (cause) {
      setError((cause as Error).message);
    }
  }, [plataforma, abrirReporte]);

  const view = useMemo<ViewState>(() => {
    if (!cc || !areaMetric) return { model: null, error: null };
    try {
      return {
        model: buildRenderModel(cc, {
          areaMetric,
          color: colorMode === "status" ? "risk" : colorMode,
          title: cc.meta.projectName
        }),
        error: null
      };
    } catch (cause) {
      return { model: null, error: (cause as Error).message };
    }
  }, [cc, areaMetric, colorMode]);

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

  /** El buscador de la barra lateral: lo enfoca la tecla `/`. */
  const searchRef = useRef<HTMLInputElement | null>(null);

  // Derivado del modelo: es lo mismo en la web y en el escritorio (ADR 0049).
  const metricOptions = useMemo(
    () =>
      stats ? orderedMetrics(stats.metricCoverage.map((entry) => entry.name)) : [],
    [stats]
  );

  const descriptors = cc?.lenses?.metrics?.attributeDescriptors as
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
    const options: CodarchOption[] = [
      { value: "risk", label: "Riesgo" },
      { value: "structure", label: "Estructura" }
    ];
    if (hasChurn) options.push({ value: "churn", label: "Calor (commits)" });
    if (migration) {
      options.push({ value: "status", label: "Estado de migración" });
    }
    for (const option of areaOptions) options.push(option);
    return options;
  }, [hasChurn, migration, areaOptions]);

  const selectedFile =
    view.model && selectedIndex !== null
      ? view.model.files[selectedIndex] ?? null
      : null;
  const selectedMigration = selectedFile
    ? migration?.nodes[selectedFile.nodeId] ?? null
    : null;
  /** Los símbolos del fichero elegido, del más complejo al más simple. */
  const selectedSymbols = useMemo(
    () => (selectedFile && cc ? symbolsOf(cc, selectedFile.nodeId) : []),
    [cc, selectedFile]
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
      if (wanted.filePath) {
        const index = view.model.files.findIndex(
          (file) => file.path === wanted.filePath
        );
        if (index >= 0) selectIndex(index);
      }
      if (wanted.tab) setTab(wanted.tab);
      if (wanted.showLabels !== null) setShowLabels(wanted.showLabels);
      // El símbolo se abre después, cuando ya se puede pedir su cadena.
      if (wanted.symbolName) {
        void openSymbolChain(wanted.symbolName, wanted.filePath ?? "");
      }
    },
    [view.model, stats, migration, selectIndex, openSymbolChain]
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

  // Al cambiar de métrica se conserva el fichero elegido si sigue existiendo.
  useEffect(() => {
    const files = view.model?.files;
    if (!files) {
      selectIndex(null);
      return;
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
  }, [view.model, selectIndex]);

  // `/` lleva al buscador y Escape limpia el foco y la selección.
  useEffect(() => {
    if (typeof window === "undefined") return;
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

  useEffect(() => {
    if (!cc || !areaMetric) return;
    const preferences = { areaMetric, colorMode, showLabels };
    preferencesRef.current = preferences;
    plataforma.escribirPreferencias(preferences);
  }, [cc, areaMetric, colorMode, showLabels, plataforma]);

  // Restaurar el último proyecto al montar. Solo si la plataforma guarda en
  // disco: la web lleva su propio arranque (servidor, URL, demo).
  useEffect(() => {
    if (!plataforma.restaurarProyecto) return;
    let cancelled = false;
    void (async () => {
      const saved = await plataforma.restaurarProyecto?.();
      if (cancelled) return;
      if (saved && loadSnapshot(saved.snapshot, saved.label)) {
        setAddons((saved.addons ?? []) as RepoAddon[]);
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
  }, [loadSnapshot, loadReport, plataforma]);

  useEffect(() => {
    if (!cc || !plataforma.restaurarProyecto) return;
    const saved = plataforma.leerProyecto();
    if (saved) {
      void plataforma.escribirProyecto({
        ...saved,
        snapshot: cc,
        label: source
      });
    }
  }, [cc, source, plataforma]);

  const state: CodarchAppState = {
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
    pluginView,
    watch
  };

  const actions: CodarchAppActions = {
    loadSnapshot,
    loadReport,
    resetReport,
    analyzeFolder,
    openSnapshotFile,
    openReportFile,
    abrirSnapshot,
    abrirReporte,
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
    setZoom,
    setCenter,
    setShowLabels,
    setPluginView,
    setChain,
    setError,
    setReportError,
    setAddons,
    setSelectedIndex,
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
    selectedMigration,
    selectedSymbols,
    pluginViews,
    activePluginView,
    pluginContext,
    matches,
    selectPath,
    addonsWithViews,
    applyView,
    loadHistory,
    loadHeat
  };
}
