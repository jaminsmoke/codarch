import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent
} from "react";
import {
  symbolsOf,
  type CcMigrationLens,
  type HistoryEntry,
  type SymbolHeat
} from "@codarch/schema/browser";
import type { AddonView as SavedView, RepoAddon } from "@codarch/addons";
import FolderPicker from "./FolderPicker";
import Settings from "./Settings";
import type { PluginContext } from "@codarch/plugin-api";
import {
  DebtList,
  findFolder,
  HeatList,
  HistoryPanel,
  historyFileName,
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
import {
  readRepositoryFromFiles,
  readRepositoryFromPicker
} from "./repository";
import { clearProject, readProject, writeProject } from "./storage";
import {
  buildSearch,
  parseSourceRequest,
  parseViewState,
  viewStateFromSaved,
  type SourceRequest,
  type ViewState as UrlViewState
} from "./viewState";
import { analyzeInBrowser, AnalysisCancelled } from "./analysis/client";
import type { AnalysisHandle } from "./analysis/client";
import { readDirectoryToMemory } from "./analysis/reader";
import { directoryPicker } from "./fs-access";
import { fetchJson, fetchJsonStrict } from "./http";
import { plataformaWeb } from "./plataforma";

export default function App() {
  const plataforma = useMemo(() => plataformaWeb(), []);
  const app = useCodarchApp(plataforma, { sourceInicial: "demo.cc.json" });
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
    setReportError,
    setAddons,
    setSelectedIndex,
    setLoading,
    setProgress
  } = app.actions;
  const { view, detail, stats, migration, hasChurn, plugins, selectedPathRef } =
    app;
  const [dragging, setDragging] = useState(false);
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
  const viewsMenuRef = useRef<HTMLDetailsElement>(null);
  const manualLoadRef = useRef(false);
  // La URL se lee una sola vez: al arrancar decide qué se carga y qué vista se aplica.
  const urlRef = useRef<{ view: UrlViewState; source: SourceRequest } | null>(null);
  if (urlRef.current === null) {
    const search = typeof window === "undefined" ? "" : window.location.search;
    urlRef.current = { view: parseViewState(search), source: parseSourceRequest(search) };
  }

  /** Los addons que traen vistas guardadas: los únicos que dan un menú. */
  const addonsWithViews = useMemo(
    () => addons.filter((addon) => addon.views.length > 0),
    [addons]
  );

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

  /**
   * Los addons que el repo declara (ADR 0029).
   *
   * Solo los cuenta el servidor local: en la demo y con un fichero suelto no
   * hay repo del que sacarlos, así que no hay vistas guardadas que ofrecer.
   */
  const loadAddons = useCallback(async (): Promise<void> => {
    const payload = (await fetchJson("data/addons.json")) as {
      addons?: RepoAddon[];
    } | null;
    setAddons(Array.isArray(payload?.addons) ? payload.addons : []);
  }, []);

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
        await loadAddons();
        return;
      }

      const saved = readProject();
      if (saved && !cancelled && !manualLoadRef.current) {
        if (loadSnapshot(saved.snapshot, saved.label)) {
          setServerMode("local");
          if (saved.report) {
            loadReport(saved.report, saved.reportLabel ?? "report.json", false);
          } else {
            resetReport();
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
  }, [loadReport, loadSnapshot, loadAddons]);

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


  const mapRoots = useMemo(() => detail?.roots ?? [], [detail]);



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
   * Aplica un estado de vista al mapa.
   *
   * Lo usan el enlace de la URL y las vistas guardadas de un addon (ADR 0029):
   * los dos hablan el mismo dialecto. Los parámetros que no encajan con el
   * snapshot (métrica inexistente, carpeta que no está, fichero borrado) se
   * ignoran en silencio: es una pista, no un contrato.
   */
  const applyWanted = useCallback(
    (wanted: UrlViewState) => {
      if (!view.model || !stats) return;
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
      if (wanted.showLabels !== null) setShowLabels(wanted.showLabels);
      // El símbolo se abre después, cuando ya se puede pedir su cadena.
      if (wanted.symbolName) {
        void openSymbolChain(wanted.symbolName, wanted.filePath ?? "");
      }
    },
    [view.model, stats, migration, selectIndex, openSymbolChain]
  );

  /** La URL decide la vista una sola vez, cuando ya hay modelo. */
  const [urlApplied, setUrlApplied] = useState(false);

  useEffect(() => {
    if (urlApplied || !view.model || !stats) return;
    const wanted = urlRef.current?.view;
    if (wanted) applyWanted(wanted);
    setUrlApplied(true);
  }, [urlApplied, view.model, stats, applyWanted]);

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
        symbolName: chain?.name ?? null,
        showLabels
      },
      { snapshotUrl: sourceUrl, reportUrl }
    );
    if (search === window.location.search) return;
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${search}${window.location.hash}`
    );
  }, [
    urlApplied,
    view.model,
    areaMetric,
    colorMode,
    focusPath,
    selectedIndex,
    tab,
    chain,
    showLabels,
    sourceUrl,
    reportUrl
  ]);

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
          resetReport();
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
          resetReport();
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

  /** Aplica una vista guardada de un addon (ADR 0029). */
  const applySavedView = useCallback(
    (saved: SavedView) => {
      viewsMenuRef.current?.removeAttribute("open");
      applyWanted(viewStateFromSaved(saved.state));
    },
    [applyWanted]
  );

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
    await loadAddons();
  }, [loadReport, loadSnapshot, resetReport, loadAddons]);

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
          {serverMode === "live" || serverMode === "served" ? (
            <button
              className={`button ghost live-toggle${
                serverMode === "live" ? " is-live" : ""
              }`}
              type="button"
              onClick={() => void toggleWatch()}
              title={
                serverMode === "live"
                  ? "El servidor reanaliza al guardar. Pulsa para detenerlo."
                  : "El servidor no reanaliza solo. Pulsa para activarlo."
              }
            >
              <i />
              {serverMode === "live" ? "Live" : "Servido"}
            </button>
          ) : null}
          <button className="button ghost" type="button" onClick={reloadDemo}>
            Demo
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
            className="button ghost"
            type="button"
            onClick={() => void copyLink()}
            title="Copia el enlace de la vista actual (área, color, carpeta y fichero)"
          >
            {copied ? "Copiado" : "Copiar enlace"}
          </button>
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
              void openHistorySnapshot(
                `data/history/${historyFileName(entry)}`,
                entry.date
              );
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

          {serverMode === "demo" ? (
            <div className="demo-banner">
              <strong>Demo.</strong>
              <span>
                Para monitorizar tu repositorio, ejecuta <code>codarch serve .</code> en su
                raíz y abre la URL que imprime.
              </span>
            </div>
          ) : null}

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
            {dragging ? <div className="drop-hint">Suelta un cc.json</div> : null}
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

/** El almacenamiento local, si el navegador lo deja. */
function readStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** La línea del tiempo que sirve el CLI junto a la app ✓. */
async function loadHistory(): Promise<HistoryEntry[] | null> {
  const raw = await fetchJson("data/history.json");
  if (!raw || typeof raw !== "object") return null;
  const list = (raw as { entries?: unknown }).entries;
  return Array.isArray(list) ? (list as HistoryEntry[]) : null;
}

/** El calor de los símbolos que sirve el CLI junto a la app ✓. */
async function loadHeat(): Promise<SymbolHeat[] | null> {
  const raw = await fetchJson("data/chains.json");
  if (!raw || typeof raw !== "object") return null;
  const list = (raw as { heat?: unknown }).heat;
  return Array.isArray(list) ? (list as SymbolHeat[]) : null;
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

