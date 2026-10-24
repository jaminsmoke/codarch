import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  defaultMetric,
  getStats,
  parseCcJson,
  type CcJson
} from "@codarch/schema/browser";
import type { DiffReport } from "@codarch/metrics/browser";
import type { RepoAddon } from "@codarch/addons";
import type { SymbolChain } from "@codarch/schema/browser";
import { buildRenderModel, type RenderModel } from "@codarch/render/browser";
import { usePlugins } from "./plugins";
import { CHURN_METRIC } from "./labels";
import { findFolder } from "./tree";
import { readMigration, readReport } from "./data";
import { DEFAULT_DETAIL_OPTIONS, pruneTree, type DetailResult } from "./detail";
import type { Plataforma } from "./platform";
import type { ViewPreferences } from "./storage";

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
}

export interface CodarchAppActions {
  loadSnapshot: (raw: unknown, label: string, preserveView?: boolean) => boolean;
  loadReport: (raw: unknown, label: string, focus?: boolean) => boolean;
  resetReport: () => void;
  analyzeFolder: () => Promise<void>;
  openSnapshotFile: () => Promise<void>;
  openReportFile: () => Promise<void>;
  selectIndex: (index: number | null) => void;
  openSymbolChain: (name: string, path: string) => Promise<void>;
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
}

export interface CodarchAppOptions {
  /** La etiqueta inicial de la fuente (antes de cargar nada). */
  sourceInicial?: string;
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
        plataforma.borrarProyecto();
        plataforma.escribirProyecto({
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
      const raw = await leerJson(file);
      if (loadSnapshot(raw, file)) {
        setAddons([]);
        plataforma.borrarProyecto();
        plataforma.escribirProyecto({
          snapshot: raw,
          report: null,
          label: file,
          reportLabel: null,
          addons: []
        });
        resetReport();
      }
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  }, [loadSnapshot, resetReport, plataforma]);

  const openReportFile = useCallback(async () => {
    const { elegirFichero, leerJson } = plataforma;
    if (!elegirFichero || !leerJson) return;
    const file = await elegirFichero();
    if (!file) return;
    try {
      const raw = await leerJson(file);
      if (loadReport(raw, file)) {
        const saved = plataforma.leerProyecto();
        if (saved) {
          plataforma.escribirProyecto({
            ...saved,
            report: raw,
            reportLabel: file
          });
        }
      }
    } catch (cause) {
      setError((cause as Error).message);
    }
  }, [loadReport, plataforma]);

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
      plataforma.escribirProyecto({
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
    pluginView
  };

  const actions: CodarchAppActions = {
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
    setProgress
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
    fitMap
  };
}
