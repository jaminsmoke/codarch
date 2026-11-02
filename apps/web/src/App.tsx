import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent
} from "react";
import type { RepoAddon } from "@codarch/addons";
import FolderPicker from "./FolderPicker";
import Settings from "./Settings";
import WebTopbar from "./WebTopbar";
import {
  AppShell,
  historyFileName,
  localStore,
  parseSourceRequest,
  parseViewState,
  useCodarchApp,
  useTheme,
  type SourceRequest,
  type ViewState as UrlViewState
} from "@codarch/ui";
import {
  readRepositoryFromFiles,
  readRepositoryFromPicker,
  type RepositoryArtifacts
} from "./repository";
import { clearProject, readProject } from "./storage";
import { analyzeInBrowser, AnalysisCancelled } from "./analysis/client";
import type { AnalysisHandle } from "./analysis/client";
import { readDirectoryToMemory } from "./analysis/reader";
import { directoryPicker } from "./fs-access";
import { fetchJson } from "./http";
import {
  loadServedProject,
  runBoot,
  useServerSession,
  useWatchSync,
  type SessionHandlers
} from "./session";
import { selectRoot, setWatch as setServerWatch } from "./server-control";
import { platformWeb } from "./platform";
import { useApplyUrlOnce, useSyncUrl } from "./urlView";
import { WEB_VERSION } from "@codarch/versions";

export default function App() {
  const platform = useMemo(() => platformWeb(), []);
  const app = useCodarchApp(platform, { initialSource: "sin proyecto" });
  // El tema es de la máquina y lo comparten todos los ajustes (ADR 0084).
  const { theme, setTheme } = useTheme();
  const {
    areaMetric,
    colorMode,
    selectedIndex,
    selectedFolder,
    focusPath,
    openFile,
    tab,
    chain,
    settingsOpen,
    showLabels,
    addons
  } = app.state;
  const {
    loadSnapshot,
    loadRest,
    loadLint,
    loadRestLint,
    loadReport,
    resetReport,
    openSnapshot,
    openReport,
    setAreaMetric,
    setColorMode,
    setSettingsOpen,
    setShowLabels,
    setError,
    setReportError,
    setAddons,
    setLoading,
    setProgress,
    setWatch
  } = app.actions;
  const {
    view,
    stats,
    plugins,
    areaOptions,
    colorOptions,
    applyView
  } = app;
  const [dragging, setDragging] = useState(false);
  const [serverMode, setServerMode] = useState<
    "static" | "local" | "served" | "live"
  >("static");
  const [serverRootPath, setServerRootPath] = useState("");
  /** La versión de CodArch que está sirviendo el servidor local. */
  const [serverVersion, setServerVersion] = useState<string | null>(null);
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  /** El análisis en marcha, para poder cortarlo. */
  const analysisRef = useRef<AnalysisHandle | null>(null);
  /** Se pone a `true` al cancelar: corta la lectura de ficheros. */
  const cancelRef = useRef<{ aborted: boolean } | null>(null);
  useWatchSync(serverMode, setWatch);
  const inputRef = useRef<HTMLInputElement>(null);
  const reportInputRef = useRef<HTMLInputElement>(null);
  const repositoryInputRef = useRef<HTMLInputElement>(null);
  const openMenuRef = useRef<HTMLDetailsElement>(null);
  const manualLoadRef = useRef(false);
  // La URL se lee una sola vez: al arrancar decide qué se carga y qué vista se aplica.
  const [urlRequest] = useState<{ view: UrlViewState; source: SourceRequest }>(
    () => {
      const search =
        typeof window === "undefined" ? "" : window.location.search;
      return {
        view: parseViewState(search),
        source: parseSourceRequest(search)
      };
    }
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
    [loadSnapshot, setError]
  );

  /**
   * Los addons que el repo declara (ADR 0029).
   *
   * Solo los cuenta el servidor local: con un fichero suelto no
   * hay repo del que sacarlos, así que no hay vistas guardadas que ofrecer.
   */
  const loadAddons = useCallback(async (): Promise<void> => {
    const payload = (await fetchJson("data/addons.json")) as {
      addons?: RepoAddon[];
    } | null;
    setAddons(Array.isArray(payload?.addons) ? payload.addons : []);
  }, [setAddons]);

  // De dónde sale el mapa y qué se refresca al guardar: la sesión de la web.
  //
  // Este contrato lo usan el arranque, el refresco tras cambiar de carpeta y
  // la vigilancia; antes cada uno tenía su copia de los manejadores.
  const sessionHandlers: SessionHandlers = useMemo(
    () => ({
      snapshot: loadSnapshot,
      rest: loadRest,
      lint: loadLint,
      restLint: loadRestLint,
      report: loadReport,
      resetReport,
      addons: loadAddons,
      mode: setServerMode,
      sourceUrl: setSourceUrl,
      reportUrl: setReportUrl,
      rootPath: setServerRootPath,
      version: setServerVersion,
      error: setError,
      reportError: setReportError,
      loading: setLoading
    }),
    [
      loadSnapshot,
      loadRest,
      loadLint,
      loadRestLint,
      loadReport,
      resetReport,
      loadAddons,
      setServerMode,
      setSourceUrl,
      setReportUrl,
      setServerRootPath,
      setServerVersion,
      setError,
      setReportError,
      setLoading
    ]
  );

  useServerSession({
    mode: serverMode,
    requested: urlRequest.source,
    manual: manualLoadRef,
    handlers: sessionHandlers
  });

  const urlApplied = useApplyUrlOnce({
    view,
    stats,
    urlView: urlRequest.view,
    applyView
  });

  useSyncUrl({
    urlApplied,
    view,
    areaMetric,
    colorMode,
    focusPath,
    selectedIndex,
    selectedFolder,
    openFile,
    tab,
    chain,
    showLabels,
    sourceUrl,
    reportUrl
  });

  /** Las preferencias guardadas, para los ajustes. */
  const savedProjectLabel = useMemo(() => {
    if (!settingsOpen) return null;
    return readProject()?.label ?? null;
  }, [settingsOpen]);

  /** Si el almacenamiento local está disponible. */
  const storageAvailable = useMemo(() => localStore() !== null, []);

  /**
   * La versión que se enseña.
   *
   * Con servidor, la que sirve el CLI; sin él, la de la web (ADR 0065).
   */
  const appVersion = useMemo(
    () => serverVersion ?? WEB_VERSION,
    [serverVersion]
  );

  /** Abre un cc.json local y lo deja como proyecto (sin URL de origen). */
  const openLocalFile = useCallback(
    async (file: File) => {
      manualLoadRef.current = true;
      try {
        const raw = JSON.parse(await file.text()) as unknown;
        if (openSnapshot(raw, file.name)) {
          setServerMode("local");
          setSourceUrl(null);
          setReportUrl(null);
        }
      } catch (cause) {
        setError(`JSON inválido en ${file.name}: ${(cause as Error).message}`);
      }
    },
    [openSnapshot, setError]
  );

  const onFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (file) await openLocalFile(file);
    },
    [openLocalFile]
  );

  const onDrop = useCallback(
    async (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragging(false);
      const file = event.dataTransfer.files?.[0];
      if (file) await openLocalFile(file);
    },
    [openLocalFile]
  );

  const onReportFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      try {
        openReport(JSON.parse(await file.text()) as unknown, file.name);
      } catch (cause) {
        setReportError(
          `JSON inválido en ${file.name}: ${(cause as Error).message}`
        );
      }
    },
    [openReport, setReportError]
  );

  /** Deja en el mapa lo que trajo una carpeta con `.codarch/`. */
  const showArtifacts = useCallback(
    (artifacts: RepositoryArtifacts) => {
      if (
        !openSnapshot(
          artifacts.snapshot,
          artifacts.label,
          artifacts.rest ?? null,
          artifacts.lint ?? null,
          artifacts.restLint ?? null
        )
      )
        return;
      setServerMode("local");
      setSourceUrl(null);
      setReportUrl(null);
      if (artifacts.report !== null) {
        openReport(artifacts.report, artifacts.reportLabel ?? "report.json");
      }
    },
    [openSnapshot, openReport]
  );

  const closeOpenMenu = useCallback(() => {
    openMenuRef.current?.removeAttribute("open");
  }, []);

  /** El cc.json del menú: abre el diálogo del fichero suelto. */
  const pickCcJson = useCallback(() => {
    closeOpenMenu();
    inputRef.current?.click();
  }, [closeOpenMenu]);

  /** Carga un snapshot (y opcionalmente un reporte) desde una URL. */
  const loadFromUrl = useCallback(
    async (snapshotUrlInput: string, reportUrlInput: string) => {
      const snapshotUrl = snapshotUrlInput.trim();
      if (!snapshotUrl) return;
      const reportUrl = reportUrlInput.trim();
      closeOpenMenu();
      manualLoadRef.current = true;
      setError(null);
      setLoading(true);
      try {
        // El mismo camino que el arranque por URL: una sola forma de abrir un
        // enlace y los mismos mensajes cuando falla (ADR 0034).
        await runBoot({
          requested: { snapshotUrl, reportUrl: reportUrl || null },
          manual: manualLoadRef,
          isCancelled: () => false,
          handlers: sessionHandlers
        });
      } finally {
        setLoading(false);
      }
    },
    [closeOpenMenu, sessionHandlers, setError, setLoading]
  );

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
        // El análisis en el navegador mide también lo que no es código: los
        // dos mapas salen de la misma pasada (ADR 0093).
        loadRest(result.rest ?? null);
        loadRestLint(result.restLint ?? null);
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
  }, [
    closeOpenMenu,
    loadSnapshot,
    loadRest,
    loadRestLint,
    resetReport,
    setError,
    setLoading,
    setProgress
  ]);

  /** Corta el análisis en marcha, esté leyendo o analizando. */
  const cancelAnalysis = useCallback(() => {
    cancelRef.current = { aborted: true };
    analysisRef.current?.cancel();
  }, []);

  /** Copia el enlace de la vista actual al portapapeles. */
  const copyLink = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // Sin permiso de portapapeles: el enlace sigue visible en la barra.
      return false;
    }
    return true;
  }, []);

  /** Relee del servidor lo que sirve, tras cambiar de carpeta. */
  const refreshFromServer = useCallback(async () => {
    // La misma lectura que hace el arranque con servidor: una sola versión.
    if (!(await loadServedProject(sessionHandlers))) {
      throw new Error("el servidor no devolvió el snapshot");
    }
    setSourceUrl(null);
    setReportUrl(null);
  }, [sessionHandlers, setSourceUrl, setReportUrl]);

  const selectFolder = useCallback(
    async (pathValue: string) => {
      setLoading(true);
      try {
        await selectRoot(pathValue);
        setFolderPickerOpen(false);
        await refreshFromServer();
      } finally {
        setLoading(false);
      }
    },
    [refreshFromServer, setLoading]
  );

  const toggleWatch = useCallback(async () => {
    if (serverMode !== "live" && serverMode !== "served") return;
    const enabled = serverMode !== "live";
    try {
      const info = await setServerWatch(enabled);
      // Al encender, el mapa se pone al día sin perder la vista abierta.
      if (enabled) {
        await loadServedProject(sessionHandlers, { preserveView: true });
      }
      setServerMode(info?.watch ? "live" : "served");
    } catch (cause) {
      setError((cause as Error).message);
    }
  }, [serverMode, sessionHandlers, setError, setServerMode]);

  const openLiveFolder = useCallback(() => {
    closeOpenMenu();
    if (serverMode === "static") {
      setError(
        "Para monitorizar carpetas hace falta el servidor local. Ejecuta `codarch serve` una vez y abre su URL."
      );
      return;
    }
    setFolderPickerOpen(true);
  }, [closeOpenMenu, serverMode, setError]);

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
      showArtifacts(await readRepositoryFromPicker());
    } catch (cause) {
      if ((cause as DOMException).name !== "AbortError") {
        setError((cause as Error).message);
      }
      setLoading(false);
    }
  }, [closeOpenMenu, showArtifacts, setError, setLoading]);

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
        showArtifacts(await readRepositoryFromFiles(files));
      } catch (cause) {
        setError((cause as Error).message);
        setLoading(false);
      }
    },
    [closeOpenMenu, showArtifacts, setError, setLoading]
  );

  return (
    <>
      <AppShell
        app={app}
        className={dragging ? "is-dragging" : ""}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        topbarTrailing={
          <>
            <WebTopbar
              liveDisabled={serverMode === "static"}
              onLiveFolder={openLiveFolder}
              onPickRepository={() => void openRepository()}
              onAnalyzeFolder={() => void analyzeFolderInBrowser()}
              onPickCcJson={pickCcJson}
              onLoadUrl={loadFromUrl}
              onCopyLink={copyLink}
              menuRef={openMenuRef}
            />
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
              {...({
                webkitdirectory: "true",
                directory: "true"
              } as Record<string, string>)}
            />
          </>
        }
        overlay={dragging ? <div className="drop-hint">Suelta un cc.json</div> : null}
        onCancelAnalysis={cancelAnalysis}
        onOpenHistory={(entry) => {
          void openHistorySnapshot(
            `data/history/${historyFileName(entry)}`,
            entry.date
          );
        }}
        onLoadReport={() => reportInputRef.current?.click()}
        settings={
          <Settings
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            theme={theme}
            onTheme={setTheme}
            areaMetric={areaMetric}
            onAreaMetric={(value) => setAreaMetric(value)}
            colorMode={colorMode}
            onColorMode={(value) => setColorMode(value)}
            areaOptions={areaOptions}
            colorOptions={colorOptions}
            model={view.model}
            savedProject={savedProjectLabel ? { label: savedProjectLabel } : null}
            onClearProject={() => {
              clearProject();
              setSettingsOpen(false);
            }}
            storageAvailable={storageAvailable}
            watch={
              serverMode === "live" || serverMode === "served"
                ? {
                    state: serverMode === "live" ? "live" : "paused",
                    onToggle: () => void toggleWatch()
                  }
                : undefined
            }
            version={appVersion}
            plugins={plugins.descriptors}
            enabledPlugins={plugins.enabled}
            onTogglePlugin={plugins.toggle}
            failedPlugins={plugins.failed}
            addons={addons}
            showLabels={showLabels}
            onShowLabels={setShowLabels}
          />
        }
      />
      <FolderPicker
        open={folderPickerOpen}
        initialPath={serverRootPath}
        onClose={() => setFolderPickerOpen(false)}
        onSelect={selectFolder}
      />
      <input
        ref={reportInputRef}
        className="sr-only"
        type="file"
        accept=".json,application/json"
        onChange={onReportFile}
      />
    </>
  );
}
