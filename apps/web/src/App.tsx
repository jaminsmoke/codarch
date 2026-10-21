import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
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
import type { HistoryEntry } from "@codarch/schema/browser";
import type { SymbolChain, SymbolEvent, SymbolHeat } from "@codarch/schema/browser";
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
import FolderPicker from "./FolderPicker";
import Settings from "./Settings";
import PrPanel from "./PrPanel";
import {
  readRepositoryFromFiles,
  readRepositoryFromPicker
} from "./repository";
import {
  clearProject,
  readPreferences,
  readProject,
  writePreferences,
  writeProject,
  type ViewPreferences
} from "./storage";
import {
  buildSearch,
  parseSourceRequest,
  parseViewState,
  type SourceRequest,
  type ViewState as UrlViewState
} from "./viewState";
import { nextCell, type CellBox, type Direction } from "./navigation";
import { DEFAULT_DETAIL_OPTIONS, pruneTree } from "./detail";
import { analyzeInBrowser, AnalysisCancelled } from "./analysis/client";
import type { AnalysisHandle } from "./analysis/client";
import { readDirectoryToMemory } from "./analysis/reader";
import { directoryPicker } from "./fs-access";

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

export default function App() {
  const [cc, setCc] = useState<CcJson | null>(null);
  const [source, setSource] = useState("demo.cc.json");
  const [areaMetric, setAreaMetric] = useState<string | null>(null);
  const [colorMode, setColorMode] = useState("risk");
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [report, setReport] = useState<DiffReport | null>(null);
  const [reportSource, setReportSource] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [tab, setTab] = useState<"file" | "pr">("file");
  const [focusPath, setFocusPath] = useState<string | null>(null);
  const [serverMode, setServerMode] = useState<"demo" | "local" | "served" | "live">(
    "demo"
  );
  const [serverRootPath, setServerRootPath] = useState("");
  /** La versión de CodArch que está sirviendo el servidor local. */
  const [serverVersion, setServerVersion] = useState<string | null>(null);
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [reportUrlInput, setReportUrlInput] = useState("");
  const [progress, setProgress] = useState<string | null>(null);
  /** La cadena del símbolo abierto, si la hay. */
  const [chain, setChain] = useState<SymbolChain | null>(null);
  /** Si los ajustes están abiertos. */
  const [settingsOpen, setSettingsOpen] = useState(false);
  /** El análisis en marcha, para poder cortarlo. */
  const analysisRef = useRef<AnalysisHandle | null>(null);
  /** Se pone a `true` al cancelar: corta la lectura de ficheros. */
  const cancelRef = useRef<{ aborted: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const reportInputRef = useRef<HTMLInputElement>(null);
  const repositoryInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const openMenuRef = useRef<HTMLDetailsElement>(null);
  const manualLoadRef = useRef(false);
  const preferencesRef = useRef<ViewPreferences | null | undefined>(undefined);
  if (preferencesRef.current === undefined) {
    preferencesRef.current = readPreferences();
  }
  // La URL se lee una sola vez: al arrancar decide qué se carga y qué vista se aplica.
  const urlRef = useRef<{ view: UrlViewState; source: SourceRequest } | null>(null);
  if (urlRef.current === null) {
    const search = typeof window === "undefined" ? "" : window.location.search;
    urlRef.current = { view: parseViewState(search), source: parseSourceRequest(search) };
  }
  const selectedPathRef = useRef<string | null>(null);

  const stats = useMemo(() => (cc ? getStats(cc) : null), [cc]);
  const migration = useMemo(() => readMigration(cc), [cc]);
  /** ¿El snapshot trae churn de git? */
  const hasChurn = useMemo(
    () => (stats ? stats.metricCoverage.some((entry) => entry.name === CHURN_METRIC) : false),
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
    const preferences = { areaMetric, colorMode };
    preferencesRef.current = preferences;
    writePreferences(preferences);
  }, [cc, areaMetric, colorMode]);

  /** Abre una foto del historial. */
  const openHistorySnapshot = useCallback(
    async (url: string, label: string) => {
      const raw = await fetchJson(url);
      if (!raw) {
        setError(`No se pudo abrir ${label}`);
        return;
      }
      loadSnapshot(raw, label);
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
    let cancelled = false;

    const boot = async (): Promise<void> => {
      // Una URL explícita manda sobre el servidor local y sobre la demo.
      const requested = urlRef.current?.source;
      if (requested?.snapshotUrl) {
        try {
          const raw = await fetchJsonStrict(requested.snapshotUrl);
          if (cancelled) return;
          manualLoadRef.current = true;
          if (loadSnapshot(raw, requested.snapshotUrl)) {
            setServerMode("local");
            setSourceUrl(requested.snapshotUrl);
            if (requested.reportUrl) {
              try {
                const report = await fetchJsonStrict(requested.reportUrl);
                if (!cancelled && report) {
                  loadReport(report, requested.reportUrl);
                  setReportUrl(requested.reportUrl);
                }
              } catch (cause) {
                if (!cancelled) {
                  setReportError(`No se pudo cargar el reporte: ${(cause as Error).message}`);
                }
              }
            }
            return;
          }
          setLoading(false);
          return;
        } catch (cause) {
          // No se cae al servidor ni a la demo: la URL pedida es explícita.
          if (!cancelled) {
            setServerMode("local");
            setError(`No se pudo cargar ${requested.snapshotUrl}: ${(cause as Error).message}`);
            setLoading(false);
          }
          return;
        }
      }

      const meta = await fetchJson("data/meta.json");
      const servedSnapshot = await fetchJson("data/snapshot.cc.json");

      if (manualLoadRef.current) return;

      if (servedSnapshot) {
        if (cancelled) return;
        loadSnapshot(servedSnapshot, "servidor local");
        const watch =
          typeof meta === "object" &&
          meta !== null &&
          (meta as { watch?: unknown }).watch === true;
        setServerMode(watch ? "live" : "served");
        if (
          typeof meta === "object" &&
          meta !== null &&
          typeof (meta as { rootPath?: unknown }).rootPath === "string"
        ) {
          setServerRootPath((meta as { rootPath: string }).rootPath);
        }
        if (
          typeof meta === "object" &&
          meta !== null &&
          typeof (meta as { version?: unknown }).version === "string"
        ) {
          setServerVersion((meta as { version: string }).version);
        }
        const servedReport = await fetchJson("data/report.json");
        if (servedReport && !cancelled) loadReport(servedReport, "servidor local");
        return;
      }

      const saved = readProject();
      if (saved && !cancelled && !manualLoadRef.current) {
        if (loadSnapshot(saved.snapshot, saved.label)) {
          setServerMode("local");
          if (saved.report) {
            loadReport(saved.report, saved.reportLabel ?? "report.json", false);
          } else {
            setReport(null);
            setReportSource(null);
            setReportError(null);
            setTab("file");
          }
          return;
        }
        clearProject();
      }

      const demoSnapshot = await fetchJson("demo.cc.json");
      if (demoSnapshot && !cancelled && !manualLoadRef.current) {
        loadSnapshot(demoSnapshot, "demo.cc.json");
      }
      const demoReport = await fetchJson("demo.report.json");
      if (demoReport && !cancelled && !manualLoadRef.current) {
        loadReport(demoReport, "demo.report.json");
      }
      if (!demoSnapshot && !cancelled) {
        setError("No se pudo cargar la demo. Abre un cc.json para empezar.");
        setLoading(false);
      }
    };

    boot().catch((cause: Error) => {
      if (!cancelled) {
        setError(cause.message);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadReport, loadSnapshot]);

  useEffect(() => {
    if (serverMode !== "live" || typeof EventSource === "undefined") return;

    const events = new EventSource("/events");
    events.addEventListener("update", async () => {
      const snapshot = await fetchJson("data/snapshot.cc.json");
      if (snapshot) loadSnapshot(snapshot, "servidor local", true);
      const report = await fetchJson("data/report.json");
      if (report) loadReport(report, "servidor local", false);
    });
    return () => events.close();
  }, [serverMode, loadReport, loadSnapshot]);

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
   * La pide al servidor, que la construye desde las fotos del historial ✓.
   */
  const openSymbolChain = useCallback(
    async (name: string, path: string) => {
      const file = view.model?.files.find((item) => item.path === path);
      if (file) selectIndex(file.index);

      const raw = await fetchJson(
        `data/chains.json?symbol=${encodeURIComponent(name)}`
      );
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

  /**
   * Aplica el estado de vista de la URL una sola vez, cuando ya hay modelo.
   *
   * Los parámetros que no encajan con el snapshot (métrica inexistente, carpeta
   * que no está, fichero borrado) se ignoran en silencio: el enlace es una
   * pista, no un contrato.
   */
  const [urlApplied, setUrlApplied] = useState(false);
  useEffect(() => {
    if (urlApplied || !view.model || !stats) return;
    const wanted = urlRef.current?.view;
    if (!wanted) {
      setUrlApplied(true);
      return;
    }
    const coverage = new Set(stats.metricCoverage.map((entry) => entry.name));
    if (wanted.areaMetric && coverage.has(wanted.areaMetric)) {
      setAreaMetric(wanted.areaMetric);
    }
    if (wanted.colorMode && isValidColorMode(wanted.colorMode, coverage, migration)) {
      setColorMode(wanted.colorMode);
    }
    if (wanted.focusPath && findFolder(view.model.roots, wanted.focusPath)) {
      setFocusPath(wanted.focusPath);
    }
    if (wanted.filePath) {
      const index = view.model.files.findIndex((file) => file.path === wanted.filePath);
      if (index >= 0) selectIndex(index);
    }
    if (wanted.tab) setTab(wanted.tab);
    // El símbolo se abre después, cuando ya se puede pedir su cadena.
    if (wanted.symbolName) {
      void openSymbolChain(wanted.symbolName, wanted.filePath ?? "");
    }
    setUrlApplied(true);
  }, [urlApplied, view.model, stats, migration, selectIndex, openSymbolChain]);

  // La URL refleja la vista actual: el enlace se puede compartir tal cual.
  useEffect(() => {
    if (!urlApplied || !view.model || typeof window === "undefined") return;
    const file = selectedIndex === null ? undefined : view.model.files[selectedIndex];
    const search = buildSearch(
      {
        areaMetric,
        colorMode,
        focusPath,
        filePath: file?.path ?? null,
        tab,
        symbolName: chain?.name ?? null
      },
      { snapshotUrl: sourceUrl, reportUrl }
    );
    if (search === window.location.search) return;
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${search}${window.location.hash}`
    );
  }, [urlApplied, view.model, areaMetric, colorMode, focusPath, selectedIndex, tab, chain, sourceUrl, reportUrl]);

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

  /** Las preferencias guardadas, para los ajustes. */
  const savedProjectLabel = useMemo(() => {
    if (!settingsOpen) return null;
    return readProject()?.label ?? null;
  }, [settingsOpen]);

  /** Si el almacenamiento local está disponible. */
  const storageAvailable = useMemo(() => {
    try {
      return typeof window !== "undefined" && !!window.localStorage;
    } catch {
      return false;
    }
  }, []);

  /** La versión de CodArch que está corriendo. */
  const appVersion = useMemo(() => {
    if (serverVersion) return serverVersion;
    return "web";
  }, [serverVersion]);

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

  const matches = useMemo(() => {
    if (!view.model || query.trim() === "") return view.model?.fileCount ?? 0;
    const needle = query.trim().toLowerCase();
    return view.model.files.filter((file) => file.path.toLowerCase().includes(needle))
      .length;
  }, [view.model, query]);

  const onFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      manualLoadRef.current = true;
      try {
        const raw = JSON.parse(await file.text()) as unknown;
        if (loadSnapshot(raw, file.name)) {
          setServerMode("local");
          setSourceUrl(null);
          setReportUrl(null);
          clearProject();
          writeProject({
            snapshot: raw,
            report: null,
            label: file.name,
            reportLabel: null
          });
          setReport(null);
          setReportSource(null);
          setReportError(null);
          setTab("file");
        }
      } catch (cause) {
        setError(`JSON inválido en ${file.name}: ${(cause as Error).message}`);
      }
    },
    [loadSnapshot]
  );

  const onDrop = useCallback(
    async (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragging(false);
      const file = event.dataTransfer.files?.[0];
      if (!file) return;
      manualLoadRef.current = true;
      try {
        const raw = JSON.parse(await file.text()) as unknown;
        if (loadSnapshot(raw, file.name)) {
          setServerMode("local");
          setSourceUrl(null);
          setReportUrl(null);
          clearProject();
          writeProject({
            snapshot: raw,
            report: null,
            label: file.name,
            reportLabel: null
          });
          setReport(null);
          setReportSource(null);
          setReportError(null);
          setTab("file");
        }
      } catch (cause) {
        setError(`JSON inválido en ${file.name}: ${(cause as Error).message}`);
      }
    },
    [loadSnapshot]
  );

  const onReportFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      try {
        const raw = JSON.parse(await file.text()) as unknown;
        if (loadReport(raw, file.name)) {
          const saved = readProject();
          if (saved) {
            writeProject({
              ...saved,
              report: raw,
              reportLabel: file.name
            });
          }
        }
      } catch (cause) {
        setReportError(`JSON inválido en ${file.name}: ${(cause as Error).message}`);
      }
    },
    [loadReport]
  );

  const closeOpenMenu = useCallback(() => {
    openMenuRef.current?.removeAttribute("open");
  }, []);

  const resetReport = useCallback(() => {
    setReport(null);
    setReportSource(null);
    setReportError(null);
    setTab("file");
  }, []);

  /** Carga un snapshot (y opcionalmente un reporte) desde una URL. */
  const loadFromUrl = useCallback(async () => {
    const snapshotUrl = urlInput.trim();
    if (!snapshotUrl) return;
    const reportTarget = reportUrlInput.trim();
    closeOpenMenu();
    manualLoadRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const raw = await fetchJsonStrict(snapshotUrl);
      if (!loadSnapshot(raw, snapshotUrl)) {
        setLoading(false);
        return;
      }
      setServerMode("local");
      setSourceUrl(snapshotUrl);
      clearProject();
      writeProject({
        snapshot: raw,
        report: null,
        label: snapshotUrl,
        reportLabel: null
      });
      if (reportTarget) {
        try {
          const report = await fetchJsonStrict(reportTarget);
          if (report) {
            loadReport(report, reportTarget);
            setReportUrl(reportTarget);
          }
        } catch (cause) {
          setReportError(`No se pudo cargar el reporte: ${(cause as Error).message}`);
        }
      } else {
        resetReport();
      }
    } catch (cause) {
      setError(`No se pudo cargar ${snapshotUrl}: ${(cause as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [closeOpenMenu, loadReport, loadSnapshot, reportUrlInput, resetReport, urlInput]);

  /**
   * Analiza la carpeta elegida en el navegador.
   *
   * No usa el CLI: lee los ficheros con File System Access API y los analiza
   * en un worker con la misma gramática, así que el snapshot tiene el mismo
   * checksum que el que haría el CLI (sin historial, como con `--no-git`).
   */
  const analyzeFolderInBrowser = useCallback(async () => {
    closeOpenMenu();
    const picker = directoryPicker();
    if (!picker) {
      setError(
        "Este navegador no permite seleccionar carpetas. Usa Chrome o Edge, o abre un cc.json."
      );
      return;
    }
    manualLoadRef.current = true;
    setLoading(true);
    setError(null);
    cancelRef.current = { aborted: false };
    setProgress("Seleccionando la carpeta…");
    try {
      const root = await picker({ mode: "read" });
      setProgress("Leyendo los ficheros…");
      const read = await readDirectoryToMemory(root, {
        signal: cancelRef.current,
        onProgress: (state) =>
          setProgress(`Leyendo ${state.read} ficheros… ${state.current}`)
      });
      if (cancelRef.current?.aborted) throw new AnalysisCancelled();

      setProgress("Analizando en el navegador…");
      const handle = analyzeInBrowser({
        files: read.fileSystem.entries(),
        projectName: root.name,
        onProgress: (message) => setProgress(message),
        onFileProgress: (state) =>
          setProgress(
            `Analizando ${state.done}/${state.total}… ${state.current}`
          )
      });
      analysisRef.current = handle;
      const result = await handle.result;
      analysisRef.current = null;
      if (loadSnapshot(result.snapshot, `${root.name} · navegador`)) {
        setServerMode("local");
        setSourceUrl(null);
        setReportUrl(null);
        resetReport();
      }
    } catch (cause) {
      if (cause instanceof AnalysisCancelled) {
        setProgress("Análisis cancelado");
      } else if ((cause as DOMException).name !== "AbortError") {
        setError((cause as Error).message);
      }
    } finally {
      analysisRef.current = null;
      setProgress(null);
      setLoading(false);
    }
  }, [closeOpenMenu, loadSnapshot, resetReport]);

  /** Corta el análisis en marcha, esté leyendo o analizando. */
  const cancelAnalysis = useCallback(() => {
    cancelRef.current = { aborted: true };
    analysisRef.current?.cancel();
  }, []);

  /** Copia el enlace de la vista actual al portapapeles. */
  const copyLink = useCallback(async () => {
    if (typeof window === "undefined") return;
    const link = window.location.href;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Sin permiso de portapapeles: el enlace sigue visible en la barra.
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }, []);

  const refreshFromServer = useCallback(async () => {
    const meta = (await fetchJson("data/meta.json")) as {
      watch?: boolean;
      rootPath?: string;
    } | null;
    const snapshot = await fetchJson("data/snapshot.cc.json");
    if (!snapshot) throw new Error("el servidor no devolvió el snapshot");
    loadSnapshot(snapshot, "servidor local");
    setServerMode(meta?.watch ? "live" : "served");
    setSourceUrl(null);
    setReportUrl(null);
    if (meta?.rootPath) setServerRootPath(meta.rootPath);
    const report = await fetchJson("data/report.json");
    if (report) loadReport(report, "servidor local", false);
    else resetReport();
  }, [loadReport, loadSnapshot, resetReport]);

  const selectFolder = useCallback(
    async (pathValue: string) => {
      setLoading(true);
      try {
        const response = await fetch("/api/root", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: pathValue })
        });
        const body = (await response.json()) as {
          error?: string;
          watch?: boolean;
        };
        if (!response.ok) {
          throw new Error(body.error ?? "no se pudo analizar la carpeta");
        }
        setFolderPickerOpen(false);
        await refreshFromServer();
      } finally {
        setLoading(false);
      }
    },
    [refreshFromServer]
  );

  const toggleWatch = useCallback(async () => {
    if (serverMode !== "live" && serverMode !== "served") return;
    const enabled = serverMode !== "live";
    try {
      const response = await fetch("/api/watch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled })
      });
      const body = (await response.json()) as {
        error?: string;
        watch?: boolean;
      };
      if (!response.ok) {
        throw new Error(body.error ?? "no se pudo cambiar el modo live");
      }
      if (enabled) {
        const snapshot = await fetchJson("data/snapshot.cc.json");
        if (snapshot) loadSnapshot(snapshot, "servidor local", true);
      }
      setServerMode(body.watch ? "live" : "served");
    } catch (cause) {
      setError((cause as Error).message);
    }
  }, [serverMode, loadSnapshot]);

  const openLiveFolder = useCallback(() => {
    closeOpenMenu();
    if (serverMode === "demo") {
      setError(
        "Para monitorizar carpetas hace falta el servidor local. Ejecuta `codarch serve` una vez y abre su URL."
      );
      return;
    }
    setFolderPickerOpen(true);
  }, [closeOpenMenu, serverMode]);

  const openRepository = useCallback(async () => {
    closeOpenMenu();
    manualLoadRef.current = true;
    setError(null);
    if (!("showDirectoryPicker" in window)) {
      repositoryInputRef.current?.click();
      return;
    }
    setLoading(true);
    try {
      const artifacts = await readRepositoryFromPicker();
      if (loadSnapshot(artifacts.snapshot, artifacts.label)) {
        setServerMode("local");
        setSourceUrl(null);
        setReportUrl(null);
        clearProject();
        writeProject({
          snapshot: artifacts.snapshot,
          report: artifacts.report,
          label: artifacts.label,
          reportLabel: artifacts.reportLabel
        });
        if (artifacts.report !== null) {
          loadReport(artifacts.report, artifacts.reportLabel ?? "report.json");
        } else {
          resetReport();
        }
      }
    } catch (cause) {
      if ((cause as DOMException).name !== "AbortError") {
        setError((cause as Error).message);
      }
      setLoading(false);
    }
  }, [closeOpenMenu, loadReport, loadSnapshot, resetReport]);

  const onRepositoryFiles = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      event.target.value = "";
      closeOpenMenu();
      if (files.length === 0) return;
      manualLoadRef.current = true;
      setLoading(true);
      setError(null);
      try {
        const artifacts = await readRepositoryFromFiles(files);
        if (loadSnapshot(artifacts.snapshot, artifacts.label)) {
          setServerMode("local");
          setSourceUrl(null);
          setReportUrl(null);
          clearProject();
          writeProject({
            snapshot: artifacts.snapshot,
            report: artifacts.report,
            label: artifacts.label,
            reportLabel: artifacts.reportLabel
          });
          if (artifacts.report !== null) {
            loadReport(artifacts.report, artifacts.reportLabel ?? "report.json");
          } else {
            resetReport();
          }
        }
      } catch (cause) {
        setError((cause as Error).message);
        setLoading(false);
      }
    },
    [closeOpenMenu, loadReport, loadSnapshot, resetReport]
  );

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

  const reloadDemo = useCallback(async () => {
    manualLoadRef.current = true;
    clearProject();
    setLoading(true);
    try {
      const [snapshotResponse, reportResponse] = await Promise.all([
        fetch("demo.cc.json"),
        fetch("demo.report.json")
      ]);
      if (!snapshotResponse.ok) {
        throw new Error(`no se pudo cargar la demo (${snapshotResponse.status})`);
      }
      loadSnapshot(await snapshotResponse.json(), "demo.cc.json");
      setServerMode("demo");
      setSourceUrl(null);
      setReportUrl(null);
      if (reportResponse.ok) {
        loadReport(await reportResponse.json(), "demo.report.json");
      } else {
        resetReport();
      }
    } catch (cause) {
      setError((cause as Error).message);
      setLoading(false);
    }
  }, [loadReport, loadSnapshot, resetReport]);

  return (
    <div
      className={`app${dragging ? " is-dragging" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
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
          <span
            className={`server-mode server-mode-${serverMode}`}
            title={
              serverMode === "demo"
                ? "Datos de ejemplo. Para tu repo: codarch serve <ruta>"
                : serverMode === "local"
                  ? "Archivo o carpeta cargada manualmente"
                  : serverMode === "live"
                    ? "Servidor local con watch activo"
                    : "Servidor local sin watch"
            }
          >
            <i />
            {serverMode === "live"
              ? "live"
              : serverMode === "served"
                ? "servido"
                : serverMode}
          </span>
        </div>
        <div className="topbar-actions">
          <button className="button ghost" type="button" onClick={reloadDemo}>
            Demo
          </button>
          <button
            className="button ghost"
            type="button"
            onClick={() => void copyLink()}
            title="Copia el enlace de la vista actual (área, color, carpeta y fichero)"
          >
            {copied ? "Copiado" : "Copiar enlace"}
          </button>
          <details className="open-menu" ref={openMenuRef}>
            <summary className="button">
              <span className="button-label-long">Abrir repositorio o archivo</span>
              <span className="button-label-short">Abrir</span>
            </summary>
            <div className="open-menu-panel">
              <button
                type="button"
                onClick={openLiveFolder}
                disabled={serverMode === "demo"}
                title={
                  serverMode === "demo"
                    ? "Arranca `codarch serve` para elegir carpetas locales"
                    : "Analiza y vigila una carpeta local"
                }
              >
                Monitorizar carpeta (live)…
              </button>
              <button type="button" onClick={openRepository}>
                Carpeta con .codarch…
              </button>
              <button
                type="button"
                onClick={() => void analyzeFolderInBrowser()}
                title="Analiza la carpeta en el navegador, sin ejecutar el CLI"
              >
                Analizar carpeta aquí…
              </button>
              <button
                type="button"
                onClick={() => {
                  closeOpenMenu();
                  inputRef.current?.click();
                }}
              >
                Archivo cc.json…
              </button>
              <div className="url-load">
                <label className="field">
                  <span>Snapshot por URL</span>
                  <input
                    type="text"
                    value={urlInput}
                    placeholder="https://…/snapshot.cc.json"
                    onChange={(event) => setUrlInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void loadFromUrl();
                    }}
                  />
                </label>
                <label className="field">
                  <span>Reporte por URL (opcional)</span>
                  <input
                    type="text"
                    value={reportUrlInput}
                    placeholder="https://…/report.json"
                    onChange={(event) => setReportUrlInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void loadFromUrl();
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void loadFromUrl()}
                  disabled={!urlInput.trim()}
                >
                  Cargar por URL
                </button>
              </div>
              <p>
                Monitorizar analiza una carpeta en el servidor local. .codarch carga
                artefactos ya generados. Para activarlo: <code>codarch serve</code>.
              </p>
            </div>
          </details>
          <input
            ref={inputRef}
            className="sr-only"
            type="file"
            accept=".json,application/json"
            onChange={onFile}
          />
          <input
            ref={repositoryInputRef}
            className="sr-only"
            type="file"
            multiple
            onChange={onRepositoryFiles}
            {...({ webkitdirectory: "true", directory: "true" } as Record<string, string>)}
          />
        </div>
      </header>

      <div className="shell">
        <aside className="rail">
          <button
            type="button"
            className="rail-settings"
            onClick={() => setSettingsOpen(true)}
            title="Ajustes"
            aria-label="Ajustes"
          >
            ⚙
          </button>

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

          {serverMode === "live" || serverMode === "served" ? (
            <section className="panel-block">
              <div className="eyebrow">Servidor local</div>
              <div className="live-row">
                <span className={`mono live-state${serverMode === "live" ? " is-live" : ""}`}>
                  {serverMode === "live" ? "live" : "servido"}
                </span>
                <button
                  className="button dark small"
                  type="button"
                  onClick={() => void toggleWatch()}
                >
                  {serverMode === "live" ? "Detener live" : "Activar live"}
                </button>
              </div>
              <p className="muted tiny">
                {serverMode === "live"
                  ? "Reanaliza al guardar y refresca por SSE."
                  : "Análisis inicial; sin refresco automático."}
              </p>
            </section>
          ) : null}

          <LanguageSample model={view.model} migration={migration} />

          <Legend colorMode={colorMode} migration={migration} model={view.model} />

          <HistoryPanel
            onOpenSnapshot={(url, label) => {
              void openHistorySnapshot(url, label);
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

          {serverMode === "demo" ? (
            <div className="demo-banner">
              <strong>Demo.</strong>
              <span>
                Para monitorizar tu repositorio, ejecuta <code>codarch serve .</code> en su
                raíz y abre la URL que imprime.
              </span>
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
              <MapCanvas
                model={view.model}
                roots={mapRoots}
                colorMode={colorMode}
                migration={migration}
                query={query.trim().toLowerCase()}
                selectedIndex={selectedIndex}
                onSelect={selectIndex}
                onFocusFolder={setFocusPath}
              />
            ) : (
              <div className="empty">Abre un cc.json para empezar.</div>
            )}
            {dragging ? <div className="drop-hint">Suelta un cc.json</div> : null}
          </div>

          <div className="stage-foot">
            <span>
              {view.model
                ? `${view.model.fileCount} ficheros · ${view.model.folderCount} carpetas · ${view.model.meta.apiVersion}`
                : "—"}
            </span>
            {progress ? (
              <span className="progress-cell">
                <span className="mono detail-note">{progress}</span>
                <button
                  className="button ghost small"
                  type="button"
                  onClick={cancelAnalysis}
                  title="Cortar el análisis"
                >
                  Cancelar
                </button>
              </span>
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
              onLoad={() => reportInputRef.current?.click()}
              onSelectPath={selectPath}
            />
          )}
          <input
            ref={reportInputRef}
            className="sr-only"
            type="file"
            accept=".json,application/json"
            onChange={onReportFile}
          />
        </aside>
      </div>

      <FolderPicker
        open={folderPickerOpen}
        initialPath={serverRootPath}
        onClose={() => setFolderPickerOpen(false)}
        onSelect={selectFolder}
      />

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
        savedProject={savedProjectLabel ? { label: savedProjectLabel } : null}
        onClearProject={() => {
          clearProject();
          setSettingsOpen(false);
        }}
        storageAvailable={storageAvailable}
        version={appVersion}
      />
    </div>
  );
}

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    // El servidor responde 204 cuando no hay reporte que enseñar.
    if (response.status === 204) return null;
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

/** Igual que `fetchJson`, pero explica por qué falló la carga por URL. */
async function fetchJsonStrict(url: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (cause) {
    throw new Error(
      `no se pudo contactar con ${url} (${(cause as Error).message}). Si el origen no permite CORS, sirve el fichero desde el mismo servidor.`
    );
  }
  if (!response.ok) {
    throw new Error(`respondió ${response.status}`);
  }
  try {
    return (await response.json()) as unknown;
  } catch (cause) {
    throw new Error(`el JSON no es válido (${(cause as Error).message})`);
  }
}

/** Un color es válido si es una lente fija o una métrica presente en el snapshot. */
function isValidColorMode(
  colorMode: string,
  coverage: ReadonlySet<string>,
  migration: CcMigrationLens | null
): boolean {
  if (colorMode === "risk" || colorMode === "structure") return true;
  if (colorMode === "status") return Boolean(migration);
  return coverage.has(colorMode);
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
  onOpenSnapshot
}: {
  onOpenSnapshot: (url: string, label: string) => void;
}) {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const raw = await fetchJson("data/history.json");
      if (cancelled) return;
      if (!raw || typeof raw !== "object") return;
      const list = (raw as { entries?: unknown }).entries;
      if (!Array.isArray(list)) return;
      setEntries(list as HistoryEntry[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
              onClick={() =>
                onOpenSnapshot(
                  `data/history/${fileNameFor(entry)}`,
                  entry.date
                )
              }
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

/** El nombre del fichero de una foto del historial. */
function fileNameFor(entry: { date: string; checksum: string }): string {
  const stamp = entry.date.replace(/[:.]/g, "-").replace("Z", "");
  return `${stamp}-${entry.checksum.slice(0, 8)}.cc.json`;
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

/**
 * Los símbolos más reescritos.
 *
 * A nivel de fichero no existe esta señal: un fichero con veinte funciones
 * quietas y otro con una que se reescribe cada semana pesan igual ✓. Aquí
 * no ✓.
 */
function HeatList({
  onSelectSymbol
}: {
  onSelectSymbol: (name: string, path: string) => void;
}) {
  const [heat, setHeat] = useState<SymbolHeat[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const raw = await fetchJson("data/chains.json");
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
  onFocusFolder
}: {
  model: RenderModel;
  roots: TreeNode[];
  colorMode: string;
  migration: CcMigrationLens | null;
  query: string;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onFocusFolder: (path: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: VIEW_WIDTH, height: VIEW_HEIGHT });
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

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);
      if (width > 0 && height > 0) setSize({ width, height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const metricIndex = useMemo(
    () => new Map(model.metrics.map((metric, index) => [metric.key, index])),
    [model.metrics]
  );

  const fillFor = (file: RenderFile): string => {
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
  };

  const renderNode = (placedNode: PlacedNode): ReactNode => {
    const { node, rect } = placedNode;

    if (node.kind === "file") {
      const file = node.fileIndex === undefined ? null : model.files[node.fileIndex];
      if (!file) return null;
      const fill = fillFor(file);
      const selected = selectedIndex === file.index;
      const matched = query === "" || file.path.toLowerCase().includes(query);
      const label =
        rect.w > 38 && rect.h > 14
          ? truncate(file.name, Math.max(4, Math.floor((rect.w - 10) / 6.1)))
          : "";
      const migrationNode = migration?.nodes[file.nodeId];
      // El tooltip solo en las celdas con área legible: en un mapa grande cada
      // nodo cuenta, y 20.000 <title> son 20.000 nodos DOM de más.
      const withTitle = rect.w > 24 && rect.h > 10;

      return (
        <rect
          key={node.key}
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
          {label ? (
            <text
              x={rect.x + 5}
              y={rect.y + 13}
              fill={inkFor(fill)}
              fontSize={10.5}
              fontFamily="IBM Plex Sans, system-ui, sans-serif"
              pointerEvents="none"
            >
              {label}
            </text>
          ) : null}
          {withTitle ? (
            <title>
              {`${file.path}\n${model.areaTitle}: ${formatCompact(file.actualArea)}` +
                (migrationNode
                  ? `\n${STATUS_LABEL[migrationNode.status]} · deuda ${migrationNode.debt ?? 0} · FFI ${migrationNode.crossings}`
                  : "")}
            </title>
          ) : null}
        </rect>
      );
    }

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
        >
          {placedNode.headerHeight > 0 && rect.w > 34 ? (
            <text
              x={rect.x + 4}
              y={rect.y + 11.5}
              fill="rgba(18,26,32,.58)"
              fontSize={9}
              letterSpacing=".08em"
              fontFamily="IBM Plex Mono, ui-monospace, monospace"
              pointerEvents="none"
            >
              {truncate(node.name.toUpperCase(), Math.floor((rect.w - 8) / 5.6))}
            </text>
          ) : null}
        </rect>
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
        viewBox={`0 0 ${size.width} ${size.height}`}
        role="group"
        aria-label={`Mapa de arquitectura de ${model.meta.project}`}
        onKeyDown={onKeyDown}
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

function truncate(value: string, max: number): string {
  if (max <= 0) return "";
  if (value.length <= max) return value;
  if (max === 1) return "…";
  return `${value.slice(0, max - 1)}…`;
}
