import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode
} from "react";
import {
  defaultMetric,
  getStats,
  parseCcJson,
  symbolsOf,
  type CcJson,
  type CcMigrationLanguageStats,
  type CcMigrationLens,
  type CcMigrationNode,
  type CcMigrationStatus,
  type CcSymbol
} from "@codarch/schema/browser";
import { parseReport, type DiffReport } from "@codarch/metrics/browser";
import type { AddonView as SavedView, RepoAddon } from "@codarch/addons";
import type { HistoryEntry } from "@codarch/schema/browser";
import type {
  SymbolChain,
  SymbolEvent,
  SymbolHeat
} from "@codarch/schema/browser";
import {
  buildRenderModel,
  formatCompact,
  inkFor,
  layoutMap,
  metricColor,
  riskColor,
  sectionColor,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  type PlacedNode,
  type RenderFile,
  type RenderModel,
  type TreeNode
} from "@codarch/render/browser";
import Settings from "./Settings";
import { usePlugins } from "./plugins";
import { labelFor } from "./labels";
import type { PluginContext } from "@codarch/plugin-api";
import PrPanel from "./PrPanel";
import {
  clearProject,
  readPreferences,
  readProject,
  writePreferences,
  writeProject,
  type ViewPreferences
} from "./storage";
import { nextCell, type CellBox, type Direction } from "./navigation";
import { DEFAULT_DETAIL_OPTIONS, pruneTree } from "./detail";
import type { CodarchDesktop } from "../preload";

const STATUS_LABEL: Record<CcMigrationStatus, string> = {
  js: "JS / TS",
  rust: "Rust",
  bridge: "Puente",
  native: "Nativo"
};

/** Cómo se lee cada evento de la vida de un símbolo. */
const EVENT_LABEL: Record<SymbolEvent["type"], string> = {
  created: "nació",
  changed: "cambió",
  unchanged: "igual",
  renamed: "renombrada",
  moved: "mudada",
  removed: "eliminada"
};

/** Cómo se lee cada tipo de símbolo en el inspector. */
const SYMBOL_LABEL: Record<CcSymbol["kind"], string> = {
  function: "fn",
  class: "cls",
  interface: "int",
  type: "typ",
  enum: "enum",
  variable: "var"
};

const STATUS_COLOR: Record<CcMigrationStatus, string> = {
  js: "#2f6fed",
  rust: "#d95d39",
  bridge: "#7b61ff",
  native: "#3f8f7a"
};

const LANGUAGE_COLOR: Record<string, string> = {
  ts: "#2f6fed",
  js: "#d9a21b",
  rust: "#d95d39",
  wasm: "#7b61ff",
  node: "#3f8f7a"
};

const PREFERRED_METRICS = [
  "rloc",
  "loc",
  "migrationDebt",
  "ffiCrossings",
  "maxComplexity",
  "maxFunctionLength",
  "functions",
  "fanIn",
  "fanOut",
  "number_of_commits",
  "number_of_authors"
];

const ARROW_DIRECTIONS: Record<string, Direction> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down"
};

/** La métrica del calor: cuántas veces se ha tocado el fichero. */
const CHURN_METRIC = "number_of_commits";

interface ViewState {
  model: RenderModel | null;
  error: string | null;
}

/** El puente con el proceso principal, expuesto por el preload. */
function desktop(): CodarchDesktop {
  const api = (window as unknown as { codarch?: CodarchDesktop }).codarch;
  if (!api) {
    throw new Error("El puente del escritorio no está disponible.");
  }
  return api;
}

export default function App() {
  const [cc, setCc] = useState<CcJson | null>(null);
  const [source, setSource] = useState("sin proyecto");
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
  /** La cadena del símbolo abierto, si la hay. */
  const [chain, setChain] = useState<SymbolChain | null>(null);
  /** Si los ajustes están abiertos. */
  const [settingsOpen, setSettingsOpen] = useState(false);
  /** El zoom del mapa (1 = el mapa entero). */
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState({ x: 0.5, y: 0.5 });
  /** Si los bloques muestran su nombre aunque no quepa entero. */
  const [showLabels, setShowLabels] = useState(true);
  /** Los plugins: los compilados, los activados y sus módulos. */
  const plugins = usePlugins();
  /** Los addons que el repo analizado declara (ADR 0029). */
  const [addons, setAddons] = useState<RepoAddon[]>([]);
  /** La vista del plugin abierta en el mapa central (null = el mapa). */
  const [pluginView, setPluginView] = useState<string | null>(null);
  /** La línea del tiempo del repositorio, si el proceso principal la tiene. */
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const viewsMenuRef = useRef<HTMLDetailsElement>(null);
  const preferencesRef = useRef<ViewPreferences | null | undefined>(undefined);
  if (preferencesRef.current === undefined) {
    preferencesRef.current = readPreferences();
  }
  const selectedPathRef = useRef<string | null>(null);

  // El menú nativo abre los ajustes ✓.
  useEffect(() => {
    return desktop().onOpenSettings(() => setSettingsOpen(true));
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const index = await desktop().history();
      if (cancelled) return;
      if (!index || !Array.isArray(index.entries)) return;
      setHistory(index.entries);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Acercar o alejar el mapa, centrado en un punto (0..1). */
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

  /** Volver a ver el mapa entero. */
  /** Mover el mapa, en fracciones de su tamaño. */
  const panMap = useCallback(
    (dx: number, dy: number) => {
      setCenter((current) => {
        // Sin zoom no hay nada escondido que enseñar.
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
  /** ¿El snapshot trae churn de git? */
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

  useEffect(() => {
    if (!cc || !areaMetric) return;
    const preferences = { areaMetric, colorMode, showLabels };
    preferencesRef.current = preferences;
    writePreferences(preferences);
  }, [cc, areaMetric, colorMode, showLabels]);

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

  useEffect(() => {
    // El escritorio no tiene demo ni servidor: se restaura el último proyecto.
    const saved = readProject();
    if (saved && loadSnapshot(saved.snapshot, saved.label)) {
      setAddons(saved.addons ?? []);
      if (saved.report) {
        loadReport(saved.report, saved.reportLabel ?? "report.json", false);
      }
      return;
    }
    if (saved) clearProject();
    setLoading(false);
  }, [loadReport, loadSnapshot]);

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

  /**
   * Árbol que se dibuja. En repos grandes se poda: un mosaico de 20.000
   * celdas no se lee ni se pinta, el nivel de carpeta sí.
   */
  const detail = useMemo(() => {
    if (!view.model) return null;
    const folder = focusPath ? findFolder(view.model.roots, focusPath) : null;
    const roots = folder ? [folder] : view.model.roots;
    const total = folder ? folder.fileCount : view.model.fileCount;
    return pruneTree(roots, DEFAULT_DETAIL_OPTIONS, total);
  }, [view.model, focusPath]);

  const mapRoots = useMemo(() => detail?.roots ?? [], [detail]);

  /**
   * Selecciona un fichero por índice y recuerda su ruta.
   *
   * La ruta es la identidad estable: el índice depende del orden del árbol y
   * cambia cuando el snapshot se reanaliza o cambia la métrica de área.
   */
  const selectIndex = useCallback(
    (index: number | null) => {
      setSelectedIndex(index);
      const file = index === null ? undefined : view.model?.files[index];
      selectedPathRef.current = file?.path ?? null;
    },
    [view.model]
  );

  /**
   * Abre la vida de un símbolo: lo selecciona en el mapa y pide su cadena.
   *
   * La pide al proceso principal, que la construye desde las fotos del
   * historial.
   */
  const openSymbolChain = useCallback(
    async (name: string, path: string) => {
      const file = view.model?.files.find((item) => item.path === path);
      if (file) selectIndex(file.index);

      const raw = await desktop().chains(name);
      if (!raw || typeof raw !== "object") {
        setChain(null);
        return;
      }
      const chains = (raw as { chains?: unknown }).chains;
      if (!Array.isArray(chains) || chains.length === 0) {
        setChain(null);
        return;
      }
      setChain((chains as SymbolChain[])[0] ?? null);
    },
    [view.model, selectIndex]
  );

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

  const metricOptions = useMemo(() => {
    if (!stats) return [];
    const coverage = new Set(stats.metricCoverage.map((entry) => entry.name));
    const preferred = PREFERRED_METRICS.filter((key) => coverage.has(key));
    const rest = [...coverage]
      .filter((key) => !preferred.includes(key))
      .sort((left, right) => left.localeCompare(right));
    return [...preferred, ...rest];
  }, [stats]);

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

  const resetReport = useCallback(() => {
    setReport(null);
    setReportSource(null);
    setReportError(null);
    setTab("file");
  }, []);

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

  /** Analiza una carpeta elegida con el diálogo del sistema. */
  const analyzeFolder = useCallback(async () => {
    const root = await desktop().pickFolder();
    if (!root) return;
    setLoading(true);
    setError(null);
    setProgress(`Analizando ${root}...`);
    try {
      const result = await desktop().analyze(root);
      if (loadSnapshot(result.snapshot, root)) {
        setAddons(result.addons.addons);
        clearProject();
        writeProject({
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
  }, [loadSnapshot, resetReport]);

  /** Abre un `cc.json` con el diálogo del sistema. */
  const openSnapshotFile = useCallback(async () => {
    const file = await desktop().pickFile();
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const raw = await desktop().readJson(file);
      if (loadSnapshot(raw, file)) {
        // Un cc.json suelto no tiene repo del que sacar addons ✓.
        setAddons([]);
        clearProject();
        writeProject({
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
  }, [loadSnapshot, resetReport]);

  /** Abre un `report.json` con el diálogo del sistema. */
  const openReportFile = useCallback(async () => {
    const file = await desktop().pickFile();
    if (!file) return;
    try {
      const raw = await desktop().readJson(file);
      if (loadReport(raw, file)) {
        const saved = readProject();
        if (saved) {
          writeProject({
            ...saved,
            report: raw,
            reportLabel: file
          });
        }
      }
    } catch (cause) {
      setReportError(`No se pudo leer ${file}: ${(cause as Error).message}`);
    }
  }, [loadReport]);

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
            entries={history}
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
        onCheckUpdate={() => desktop().checkUpdate()}
        onOpenExternal={(url) => void desktop().openExternal(url)}
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

function findFolder(nodes: readonly TreeNode[], path: string): TreeNode | null {
  for (const node of nodes) {
    if (node.kind === "folder" && node.path === path) return node;
    if (node.children) {
      const found = findFolder(node.children, path);
      if (found) return found;
    }
  }
  return null;
}

/** El almacenamiento local, si el navegador lo deja. */
/** El índice de las métricas por clave ✓. */
function metricIndexOf(model: RenderModel): Map<string, number> {
  return new Map(model.metrics.map((metric, index) => [metric.key, index]));
}

function readStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function readReport(value: unknown): DiffReport | null {
  return parseReport(value);
}

function readMigration(cc: CcJson | null): CcMigrationLens | null {
  const value = cc?.lenses?.migration;
  if (!value || typeof value !== "object") return null;
  const lens = value as Partial<CcMigrationLens>;
  if (!lens.nodes || !lens.summary) return null;
  return lens as CcMigrationLens;
}

function Kpi({
  label,
  value,
  accent
}: {
  label: string;
  value: number;
  accent?: "debt";
}) {
  return (
    <div className={`kpi${accent ? ` kpi-${accent}` : ""}`}>
      <span>{label}</span>
      <b>{formatCompact(value)}</b>
    </div>
  );
}

function LanguageSample({
  model,
  migration
}: {
  model: RenderModel | null;
  migration: CcMigrationLens | null;
}) {
  if (!migration) {
    return (
      <section className="panel-block">
        <div className="eyebrow">Estratos</div>
        <p className="muted small">Este snapshot no trae lente de migración.</p>
      </section>
    );
  }

  const languages = Object.entries(migration.summary.languages).filter(
    (entry): entry is [string, CcMigrationLanguageStats] => entry[1] !== undefined
  );
  const total = languages.reduce((sum, [, stats]) => sum + stats.rloc, 0);

  return (
    <section className="panel-block">
      <div className="eyebrow">Estratos</div>
      <div className="strata" aria-label="Reparto por lenguaje">
        {languages.map(([language, stats]) => {
          if (stats.rloc === 0) return null;
          return (
            <i
              key={language}
              title={`${language}: ${formatCompact(stats.rloc)} rloc`}
              style={{
                width: `${(stats.rloc / total) * 100}%`,
                background: LANGUAGE_COLOR[language] ?? "#7b8790"
              }}
            />
          );
        })}
      </div>
      <div className="strata-legend">
        {languages.map(([language, stats]) => (
          <div key={language} className="strata-row">
            <i style={{ background: LANGUAGE_COLOR[language] ?? "#7b8790" }} />
            <span>{language}</span>
            <span className="mono">{formatCompact(stats.rloc)}</span>
          </div>
        ))}
      </div>
      <div className="status-row">
        {(["js", "rust", "bridge", "native"] as CcMigrationStatus[]).map((status) => (
          <span key={status} className="status-chip">
            <i style={{ background: STATUS_COLOR[status] }} />
            {STATUS_LABEL[status]} <b>{migration.summary.status[status]}</b>
          </span>
        ))}
      </div>
      <div className="muted tiny">
        {migration.summary.ffiEdges} aristas FFI · {migration.summary.bridgeFiles} puentes ·{" "}
        {model ? `${formatCompact(model.fileCount)} ficheros` : ""}
      </div>
    </section>
  );
}

function Legend({
  colorMode,
  migration,
  model
}: {
  colorMode: string;
  migration: CcMigrationLens | null;
  model: RenderModel | null;
}) {
  if (colorMode === "status" && migration) {
    return (
      <section className="panel-block">
        <div className="eyebrow">Leyenda</div>
        <div className="legend">
          {(["js", "rust", "bridge", "native"] as CcMigrationStatus[]).map((status) => (
            <div key={status}>
              <i style={{ background: STATUS_COLOR[status] }} />
              <span>{STATUS_LABEL[status]}</span>
              <span className="mono">{migration.summary.status[status]}</span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (colorMode === "structure" && model) {
    return (
      <section className="panel-block">
        <div className="eyebrow">Leyenda</div>
        <div className="legend">
          {model.sections.slice(0, 8).map((section) => (
            <div key={section.key}>
              <i style={{ background: section.color }} />
              <span className="ellipsis" title={section.label}>
                {section.label}
              </span>
              <span className="mono">{section.files}</span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (colorMode === "risk") {
    return (
      <section className="panel-block">
        <div className="eyebrow">Leyenda · riesgo</div>
        <div className="gradient risk" />
        <div className="gradient-labels">
          <span>bajo</span>
          <span>alto</span>
        </div>
      </section>
    );
  }

  const metric = model?.metrics.find((entry) => entry.key === colorMode);
  if (!metric) return null;

  return (
    <section className="panel-block">
      <div className="eyebrow">Leyenda · {metric.title}</div>
      <div className="gradient metric" />
      <div className="gradient-labels">
        <span>{formatCompact(metric.min)}</span>
        <span>{formatCompact(metric.max)}</span>
      </div>
      <div className="muted tiny">
        {metric.coverage} ficheros · {metric.mode === "log" ? "escala log" : "escala lineal"}
        {metric.actualMax > metric.max
          ? ` · máx real ${formatCompact(metric.actualMax)}`
          : ""}
      </div>
    </section>
  );
}

function HistoryPanel({
  entries,
  onOpenSnapshot
}: {
  entries: HistoryEntry[] | null;
  onOpenSnapshot: (entry: HistoryEntry) => void;
}) {
  if (!entries || entries.length === 0) return null;

  return (
    <section className="panel-block">
      <div className="eyebrow">Historia</div>
      <div className="history-list">
        {entries
          .slice()
          .reverse()
          .map((entry) => (
            <button
              key={entry.checksum}
              type="button"
              className="history-row"
              onClick={() => onOpenSnapshot(entry)}
              title={`${entry.files} ficheros · ${entry.rloc} rloc`}
            >
              <span className="mono history-date">{entry.date.slice(0, 16).replace("T", " ")}</span>
              <span className="mono history-count">{entry.files} f.</span>
            </button>
          ))}
        </div>
    </section>
  );
}

function HotList({
  model,
  selectedIndex,
  onSelect
}: {
  model: RenderModel | null;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}) {
  const index = model
    ? model.metrics.findIndex((metric) => metric.key === CHURN_METRIC)
    : -1;
  if (!model || index < 0) return null;

  const rows = model.files
    .map((file) => ({ file, commits: file.values[index] ?? 0 }))
    .filter((row) => row.commits > 0)
    .sort((left, right) => right.commits - left.commits)
    .slice(0, 8);
  if (rows.length === 0) return null;

  const max = rows[0]?.commits ?? 1;

  return (
    <section className="panel-block">
      <div className="eyebrow">Más tocados</div>
      <div className="debt-list">
        {rows.map(({ file, commits }) => (
          <button
            key={file.nodeId}
            type="button"
            className={`debt-row${selectedIndex === file.index ? " is-selected" : ""}`}
            onClick={() => onSelect(file.index)}
            title={file.path}
          >
            <span className="debt-name">{file.path}</span>
            <span className="debt-track">
              <i
                style={{
                  width: `${Math.max(4, (commits / max) * 100)}%`,
                  background: "var(--rust)"
                }}
              />
            </span>
            <span className="mono">{commits}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function HeatList({
  onSelectSymbol
}: {
  onSelectSymbol: (name: string, path: string) => void;
}) {
  const [heat, setHeat] = useState<SymbolHeat[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const raw = await desktop().chains();
      if (cancelled) return;
      if (!raw || typeof raw !== "object") return;
      const list = (raw as { heat?: unknown }).heat;
      if (!Array.isArray(list)) return;
      setHeat(list as SymbolHeat[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!heat || heat.length === 0) return null;

  const max = Math.max(1, heat[0]?.churn ?? 1);

  return (
    <section className="panel-block">
      <div className="eyebrow">Más reescritos</div>
      <div className="debt-list">
        {heat.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className="debt-row"
            onClick={() => onSelectSymbol(entry.name, entry.path)}
            title={`${entry.path} · ${entry.changes} cambios · ${entry.moves} mudanzas`}
          >
            <span className="debt-name">{entry.name}</span>
            <span className="debt-track">
              <i
                style={{
                  width: `${Math.max(4, (entry.churn / max) * 100)}%`,
                  background: "var(--rust)"
                }}
              />
            </span>
            <span className="mono">{entry.churn}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function DebtList({
  model,
  migration,
  selectedIndex,
  onSelect
}: {
  model: RenderModel | null;
  migration: CcMigrationLens | null;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}) {
  if (!model || !migration) return null;

  const rows = model.files
    .map((file) => ({
      file,
      node: migration.nodes[file.nodeId]
    }))
    .filter((row): row is { file: RenderFile; node: CcMigrationNode } =>
      Boolean(row.node?.debt)
    )
    .sort((left, right) => (right.node.debt ?? 0) - (left.node.debt ?? 0))
    .slice(0, 8);
  const max = rows[0]?.node.debt ?? 1;

  if (rows.length === 0) return null;

  return (
    <section className="panel-block">
      <div className="eyebrow">Deuda de migración</div>
      <div className="debt-list">
        {rows.map(({ file, node }) => (
          <button
            key={file.nodeId}
            type="button"
            className={`debt-row${selectedIndex === file.index ? " is-selected" : ""}`}
            onClick={() => onSelect(file.index)}
            title={file.path}
          >
            <span className="debt-name">{file.path}</span>
            <span className="debt-track">
              <i
                style={{
                  width: `${Math.max(4, ((node.debt ?? 0) / max) * 100)}%`,
                  background: STATUS_COLOR[node.status]
                }}
              />
            </span>
            <span className="mono">{formatCompact(node.debt ?? 0)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function MapCanvas({
  model,
  roots,
  colorMode,
  migration,
  query,
  selectedIndex,
  onSelect,
  onFocusFolder,
  zoom,
  center,
  onZoomAt,
  showLabels,
  onPan
}: {
  model: RenderModel;
  roots: TreeNode[];
  colorMode: string;
  migration: CcMigrationLens | null;
  query: string;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onFocusFolder: (path: string) => void;
  /** El zoom del mapa (1 = el mapa entero). */
  zoom: number;
  /** El centro del rectángulo visible (0..1). */
  center: { x: number; y: number };
  /** Acercar o alejar, centrado en un punto (0..1). */
  onZoomAt: (factor: number, at?: { x: number; y: number }) => void;
  /** Si los bloques muestran su nombre aunque no quepa entero. */
  showLabels: boolean;
  /** Mover el mapa, en fracciones de su tamaño. */
  onPan: (dx: number, dy: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: VIEW_WIDTH, height: VIEW_HEIGHT });
  /**
   * El rectángulo visible, en coordenadas del mapa.
   *
   * La distribución no cambia (sigue siendo la del marco): lo que cambia es
   * el rectángulo visible. Así el mapa se puede acercar sin recalcular nada.
   */
  // El pan: con el botón derecho apretado.
  const panRef = useRef<{ x: number; y: number } | null>(null);

  const viewBox = useMemo(() => {
    const width = size.width / zoom;
    const height = size.height / zoom;
    return {
      x: (size.width - width) * center.x,
      y: (size.height - height) * center.y,
      width,
      height
    };
  }, [size, zoom, center]);
  const placed = useMemo(
    () => layoutMap(roots, size.width, size.height),
    [roots, size.width, size.height]
  );

  /**
   * Celdas navegables: ficheros y carpetas sin contenido dibujado.
   *
   * Una carpeta con hijos es un contenedor, no una celda: ocupa el área de sus
   * hijos y no se puede "entrar" moviéndose a un lado. Las carpetas hoja sí:
   * en un repositorio grande el mapa se dibuja a nivel de carpeta.
   */
  const { targets, targetMeta } = useMemo(() => {
    const boxes: CellBox[] = [];
    const meta = new Map<
      string,
      { kind: "file" | "folder"; fileIndex?: number; path?: string }
    >();
    const walk = (nodes: PlacedNode[]): void => {
      for (const placedNode of nodes) {
        const { node, rect } = placedNode;
        if (node.kind === "file") {
          if (node.fileIndex === undefined) continue;
          const key = `f:${node.fileIndex}`;
          boxes.push({ key, x: rect.x, y: rect.y, w: rect.w, h: rect.h });
          meta.set(key, { kind: "file", fileIndex: node.fileIndex });
          continue;
        }
        const children = placedNode.children ?? [];
        if (children.length === 0) {
          boxes.push({ key: node.key, x: rect.x, y: rect.y, w: rect.w, h: rect.h });
          meta.set(node.key, { kind: "folder", path: node.path });
          continue;
        }
        walk(children);
      }
    };
    walk(placed);
    return { targets: boxes, targetMeta: meta };
  }, [placed]);

  /** Cursor de teclado: por dónde va el usuario, al margen de la selección. */
  const [cursor, setCursor] = useState<string | null>(null);
  const selectedKey = selectedIndex !== null ? `f:${selectedIndex}` : null;
  // El fichero seleccionado puede no estar dibujado (nivel de carpeta), así que
  // el tab stop cae en la primera celda visible.
  const activeKey =
    cursor ??
    (selectedKey && targetMeta.has(selectedKey)
      ? selectedKey
      : targets[0]?.key ?? null);

  /**
   * El foco solo se mueve si el cambio vino de las flechas. Con el ratón no se
   * roba el foco: el clic ya lo dejó donde toca.
   */
  const pendingFocusRef = useRef(false);

  useEffect(() => {
    if (!pendingFocusRef.current || !cursor) return;
    pendingFocusRef.current = false;
    const node = containerRef.current?.querySelector(`[data-cell-key="${cursor}"]`);
    // Las celdas son elementos SVG: no son HTMLElement.
    if (node instanceof SVGElement) node.focus();
  }, [cursor, targets]);

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<SVGSVGElement>) => {
      const direction = ARROW_DIRECTIONS[event.key];
      if (direction) {
        // Si el cursor todavía no existe, se sale de la celda que tiene el foco.
        const from =
          cursor ??
          (event.target as Element | null)?.getAttribute?.("data-cell-key") ??
          null;
        const next = nextCell(targets, from, direction);
        if (next === null || next === from) return;
        event.preventDefault();
        pendingFocusRef.current = true;
        setCursor(next);
        return;
      }
      if (event.key !== "Enter" && event.key !== " ") return;
      const target = cursor ? targetMeta.get(cursor) : undefined;
      if (!target) return;
      event.preventDefault();
      if (target.kind === "file" && target.fileIndex !== undefined) {
        onSelect(target.fileIndex);
        return;
      }
      if (target.path) onFocusFolder(target.path);
    },
    [cursor, onFocusFolder, onSelect, targetMeta, targets]
  );

  // El tamaño del marco, medido.
  //
  // Se mide al montar (para que el primer dibujado ya sea del tamaño
  // correcto), se observa el marco y se mide también al redimensionar la
  // ventana. Con las tres, el mapa nunca se dibuja a la escala equivocada.
  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const measure = (): void => {
      const rect = element.getBoundingClientRect();
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);
      if (width > 0 && height > 0) setSize({ width, height });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const metricIndex = useMemo(
    () => new Map(model.metrics.map((metric, index) => [metric.key, index])),
    [model.metrics]
  );

  const fillFor = (file: RenderFile): string =>
    mapColorFor(file, colorMode, model, migration, metricIndex);

  const renderNode = (placedNode: PlacedNode): ReactNode => {
    const { node, rect } = placedNode;

    if (node.kind === "file") {
      const file = node.fileIndex === undefined ? null : model.files[node.fileIndex];
      if (!file) return null;
      const fill = fillFor(file);
      const selected = selectedIndex === file.index;
      const matched = query === "" || file.path.toLowerCase().includes(query);
      // El nombre va DENTRO del bloque: el SVG envuelve y recorta y no
      // puede salirse por diseño.
      const label = showLabels ? labelFor(rect.w, rect.h) : null;
      const migrationNode = migration?.nodes[file.nodeId];
      // El tooltip solo en las celdas con área legible: en un mapa grande cada
      // nodo cuenta, y 20.000 <title> son 20.000 nodos DOM de más.
      const withTitle = rect.w > 24 && rect.h > 10;

      // El texto va FUERA del rect: en SVG un <rect> no admite hijos, y
      // dentro se dibuja con tamaño cero (o sea: nunca se ve).
      return (
        <g key={node.key}>
          <rect
            className={`cell${activeKey === `f:${file.index}` ? " is-cursor" : ""}`}
            x={rect.x}
            y={rect.y}
            width={Math.max(1, rect.w)}
            height={Math.max(1, rect.h)}
            fill={fill}
            stroke={selected ? "#121a20" : "rgba(18,26,32,.26)"}
            strokeWidth={selected ? 2 : 0.55}
            opacity={matched ? 1 : 0.13}
            role="button"
            data-cell-key={`f:${file.index}`}
            data-file-index={file.index}
            tabIndex={activeKey === `f:${file.index}` ? 0 : -1}
            aria-label={file.path}
            onFocus={() => setCursor(`f:${file.index}`)}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(file.index);
            }}
          >
            {withTitle ? (
              <title>
                {`${file.path}\n${model.areaTitle}: ${formatCompact(file.actualArea)}` +
                  (migrationNode
                    ? `\n${STATUS_LABEL[migrationNode.status]} · deuda ${migrationNode.debt ?? 0} · FFI ${migrationNode.crossings}`
                    : "")}
              </title>
            ) : null}
          </rect>
          {label ? (
            <foreignObject
              x={rect.x}
              y={rect.y}
              width={Math.max(1, rect.w)}
              height={Math.max(1, rect.h)}
              pointerEvents="none"
            >
              <div
                className={`map-label${label.vertical ? " is-vertical" : ""}`}
                style={{ fontSize: label.size, color: inkFor(fill) }}
              >
                {file.name}
              </div>
            </foreignObject>
          ) : null}
        </g>
      );
    }

    // El nombre de la carpeta va dentro de su bloque, como el de un fichero.
    const folderLabel =
      placedNode.headerHeight > 0 || showLabels
        ? labelFor(rect.w, rect.h)
        : null;

    return (
      <g key={node.key}>
        <rect
          className={`folder-block${activeKey === node.key ? " is-cursor" : ""}`}
          x={rect.x}
          y={rect.y}
          width={Math.max(1, rect.w)}
          height={Math.max(1, rect.h)}
          fill="rgba(18,26,32,.022)"
          stroke="rgba(18,26,32,.25)"
          strokeWidth={0.7}
          role="button"
          data-cell-key={node.key}
          tabIndex={activeKey === node.key ? 0 : -1}
          aria-label={`Enfocar ${node.path}`}
          onFocus={() => setCursor(node.key)}
          onClick={(event) => {
            event.stopPropagation();
            onFocusFolder(node.path);
          }}
        />
        {folderLabel ? (
          <foreignObject
            x={rect.x}
            y={rect.y}
            width={Math.max(1, rect.w)}
            height={Math.max(1, rect.h)}
            pointerEvents="none"
          >
            <div
              className={`map-label is-folder${folderLabel.vertical ? " is-vertical" : ""}`}
              style={{ fontSize: folderLabel.size }}
            >
              {node.name.toUpperCase()}
            </div>
          </foreignObject>
        ) : null}
        {placedNode.headerHeight > 0 && rect.w > 34 ? (
          <rect
            x={rect.x}
            y={rect.y}
            width={Math.max(1, rect.w)}
            height={placedNode.headerHeight}
            fill="transparent"
            className="folder-hit"
            aria-label={`Enfocar ${node.path}`}
            onClick={(event) => {
              event.stopPropagation();
              onFocusFolder(node.path);
            }}
          />
        ) : null}
        {placedNode.children.map(renderNode)}
      </g>
    );
  };

  return (
    <div
      className="map-inner"
      ref={containerRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          pendingFocusRef.current = false;
        }
      }}
    >
      <svg
        className="map"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        role="group"
        aria-label={`Mapa de arquitectura de ${model.meta.project}`}
        onKeyDown={onKeyDown}
        onContextMenu={(event) => event.preventDefault()}
        onPointerDown={(event) => {
          if (event.button !== 2) return;
          event.preventDefault();
          panRef.current = { x: event.clientX, y: event.clientY };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const start = panRef.current;
          if (!start) return;
          const dx = (event.clientX - start.x) / (event.currentTarget.clientWidth || 1);
          const dy = (event.clientY - start.y) / (event.currentTarget.clientHeight || 1);
          start.x = event.clientX;
          start.y = event.clientY;
          onPan(dx, dy);
        }}
        onPointerUp={(event) => {
          panRef.current = null;
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        onWheel={(event) => {
          // La rueda acerca el mapa (la página ya no scrollea).
          event.preventDefault();
          const bounds = event.currentTarget.getBoundingClientRect();
          onZoomAt(
            event.deltaY < 0 ? 1.12 : 1 / 1.12,
            {
              x: (event.clientX - bounds.left) / bounds.width,
              y: (event.clientY - bounds.top) / bounds.height
            }
          );
        }}
      >
        <defs>
          <pattern id="map-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path
              d="M 48 0 L 0 0 0 48"
              fill="none"
              stroke="rgba(18,26,32,.045)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width={size.width} height={size.height} fill="url(#map-grid)" />
        {placed.map(renderNode)}
      </svg>
    </div>
  );
}

/**
 * El color de un fichero, el mismo que en el mapa ✓.
 *
 * Vive aquí para que los plugins dibujen **lo mismo** que el mapa ✓ (ADR 0028 ✓).
 */
function mapColorFor(
  file: RenderFile,
  colorMode: string,
  model: RenderModel,
  migration: CcMigrationLens | null,
  metricIndex: Map<string, number>
): string {
  if (colorMode === "status") {
    const status = migration?.nodes[file.nodeId]?.status ?? "js";
    return STATUS_COLOR[status];
  }
  if (colorMode === "structure") {
    const section = model.sections[file.section];
    return section ? sectionColor(section) : "#d5d2ca";
  }
  if (colorMode === "churn") {
    // El calor: cuántas veces se ha tocado el fichero.
    const index = metricIndex.get(CHURN_METRIC);
    if (index === undefined) return riskColor(file.risk);
    const metric = model.metrics[index];
    if (!metric) return riskColor(file.risk);
    return metricColor(file.values[index] ?? null, metric);
  }
  if (colorMode === "risk") return riskColor(file.risk);
  const index = metricIndex.get(colorMode);
  if (index === undefined) return riskColor(file.risk);
  const metric = model.metrics[index];
  if (!metric) return riskColor(file.risk);
  return metricColor(file.values[index] ?? null, metric);
}

function Inspector({
  model,
  file,
  migrationNode,
  areaMetric,
  metricTitle,
  symbols,
  chain,
  onSelectSymbol
}: {
  model: RenderModel | null;
  file: RenderFile | null;
  migrationNode: CcMigrationNode | null;
  areaMetric: string | null;
  metricTitle: (key: string) => string;
  symbols: CcSymbol[];
  chain: SymbolChain | null;
  onSelectSymbol: (name: string) => void;
}) {
  if (!file) {
    return (
      <section className="inspector-empty">
        <h2>Selecciona una celda</h2>
        <p className="muted small">
          El mapa conserva la jerarquía de carpetas. Pasa el cursor para ver la ruta y haz
          clic para abrir las métricas del fichero.
        </p>
        {model ? (
          <div className="inspector-note">
            <span className="mono">{model.meta.apiVersion}</span>
            <span>{model.meta.checksum.slice(0, 8) || "sin checksum"}</span>
          </div>
        ) : null}
      </section>
    );
  }

  const areaMetricIndex = areaMetric
    ? model?.metrics.findIndex((metric) => metric.key === areaMetric) ?? -1
    : -1;
  const areaValue =
    areaMetricIndex >= 0 ? file.values[areaMetricIndex] ?? file.actualArea : file.actualArea;

  const rows = model
    ? model.metrics
        .map((metric, index) => ({
          key: metric.key,
          title: metricTitle(metric.key),
          value: file.values[index]
        }))
        .filter((row): row is { key: string; title: string; value: number } =>
          row.value !== null && row.value !== undefined
        )
        .slice(0, 10)
    : [];

  return (
    <section className="inspector-file">
      <div className="inspector-path" title={file.path}>
        {file.path}
      </div>
      <h2>{file.name}</h2>

      {migrationNode ? (
        <div className="inspector-status">
          <span
            className="status-dot"
            style={{ background: STATUS_COLOR[migrationNode.status] }}
          />
          <span>{STATUS_LABEL[migrationNode.status]}</span>
          <span className="mono">{migrationNode.language}</span>
        </div>
      ) : null}

      <div className="metric-grid">
        <Metric label={areaMetric ? metricTitle(areaMetric) : "Área"} value={formatCompact(areaValue)} />
        <Metric label="Riesgo" value={formatCompact(file.risk * 100)} />
        <Metric label="Complejidad" value={formatCompact(file.complexity)} />
        <Metric label="Churn" value={formatCompact(file.churn)} />
        {migrationNode ? (
          <>
            <Metric label="Deuda" value={formatCompact(migrationNode.debt ?? 0)} />
            <Metric label="Cruces FFI" value={formatCompact(migrationNode.crossings)} />
          </>
        ) : null}
      </div>

      {rows.length > 0 ? (
        <div className="metric-table">
          <div className="eyebrow">Métricas</div>
          {rows.map((row) => (
            <div key={row.key}>
              <span>{row.title}</span>
              <span className="mono">{formatCompact(row.value)}</span>
            </div>
          ))}
        </div>
      ) : null}

      {symbols.length > 0 ? (
        <div className="symbol-list">
          <div className="eyebrow">Símbolos</div>
          {symbols.slice(0, 12).map((symbol) => (
            <button
              key={`${symbol.name}-${symbol.line}`}
              type="button"
              className={`symbol-row${chain?.name === symbol.name ? " is-selected" : ""}`}
              onClick={() => onSelectSymbol(symbol.name)}
              title="Ver la vida de este símbolo"
            >
              <span className={`symbol-kind symbol-${symbol.kind}`}>
                {SYMBOL_LABEL[symbol.kind]}
              </span>
              <span className="symbol-name" title={symbol.name}>
                {symbol.name}
              </span>
              {symbol.complexity !== undefined ? (
                <span
                  className="mono symbol-complexity"
                  title="Complejidad ciclomática"
                >
                  {symbol.complexity}
                </span>
              ) : null}
            </button>
          ))}

          {symbols.length > 12 ? (
            <div className="symbol-more">y {symbols.length - 12} más</div>
          ) : null}
        </div>
      ) : null}

      {chain ? (
        <div className="chain-list">
          <div className="eyebrow">La vida de {chain.name}</div>
          {chain.versions.map((version) => (
            <div key={version.entry} className="chain-row">
              <span className="mono chain-date">
                {version.date.slice(0, 10)}
              </span>
              <span className="chain-events">
                {version.events.map((event) => (
                  <span key={event.type} className={`chain-event chain-${event.type}`}>
                    {EVENT_LABEL[event.type]}
                  </span>
                ))}
              </span>
              <span className="chain-path" title={version.path}>
                {version.path}
              </span>
            </div>
          ))}
        </div>
      ) : null}

    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

