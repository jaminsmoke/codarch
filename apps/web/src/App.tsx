import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent
} from "react";
import type { RepoAddon } from "@codarch/addons";
import FolderPicker from "./FolderPicker";
import Settings from "./Settings";
import {
  AppShell,
  buildSearch,
  historyFileName,
  localStore,
  OpenMenu,
  parseSourceRequest,
  parseViewState,
  useCodarchApp,
  useTema,
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
import { fetchJson, fetchJsonStrict } from "./http";
import { HEAD_REPORT_URL, servedReportUrl } from "./reports";
import { plataformaWeb } from "./plataforma";
import { WEB_VERSION } from "@codarch/versions";

export default function App() {
  const plataforma = useMemo(() => plataformaWeb(), []);
  const app = useCodarchApp(plataforma, { sourceInicial: "sin proyecto" });
  // El tema es de la máquina y lo comparten todos los ajustes (ADR 0084).
  const { tema, setTema } = useTema();
  const {
    areaMetric,
    colorMode,
    selectedIndex,
    focusPath,
    tab,
    chain,
    settingsOpen,
    showLabels,
    addons
  } = app.state;
  const {
    loadSnapshot,
    loadReport,
    resetReport,
    abrirSnapshot,
    abrirReporte,
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
  const [urlInput, setUrlInput] = useState("");
  const [reportUrlInput, setReportUrlInput] = useState("");
  /** El análisis en marcha, para poder cortarlo. */
  const analysisRef = useRef<AnalysisHandle | null>(null);
  /** Se pone a `true` al cancelar: corta la lectura de ficheros. */
  const cancelRef = useRef<{ aborted: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  // La cabecera dice si el repo se vigila (ADR 0050): la web lo sabe por el
  // servidor; el escritorio dirá «sin vigilancia» hasta M34.
  useEffect(() => {
    setWatch(
      serverMode === "live"
        ? "live"
        : serverMode === "served"
          ? "paused"
          : "none"
    );
  }, [serverMode, setWatch]);
  const inputRef = useRef<HTMLInputElement>(null);
  const reportInputRef = useRef<HTMLInputElement>(null);
  const repositoryInputRef = useRef<HTMLInputElement>(null);
  const openMenuRef = useRef<HTMLDetailsElement>(null);
  const manualLoadRef = useRef(false);
  // La URL se lee una sola vez: al arrancar decide qué se carga y qué vista se aplica.
  const urlRef = useRef<{ view: UrlViewState; source: SourceRequest } | null>(null);
  if (urlRef.current === null) {
    const search = typeof window === "undefined" ? "" : window.location.search;
    urlRef.current = { view: parseViewState(search), source: parseSourceRequest(search) };
  }

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
   * Solo los cuenta el servidor local: con un fichero suelto no
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
      // Una URL explícita manda sobre el servidor local y sobre lo guardado.
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
          // No se cae al servidor ni a lo guardado: la URL pedida es explícita.
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
        // Con servidor, Cambios es del repo y lo compara el servidor con HEAD
        // (ADR 0075): `report.json` de dos fotos viejas no entra, porque
        // enseñaría cambios de hace semanas como si fueran de ahora. Un
        // artefacto estático sí trae su `report.json` como único cambio.
        const servedReport = await fetchJson(servedReportUrl(meta !== null));
        if (!cancelled) {
          if (servedReport) {
            loadReport(servedReport, meta !== null ? "HEAD" : "report.json", false);
          } else {
            resetReport();
          }
        }
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

      // Sin servidor y sin proyecto guardado no hay nada que enseñar: se queda
      // el estado vacío del mapa ("Abre un cc.json para empezar").
      if (!cancelled) setLoading(false);
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
  }, [loadReport, loadSnapshot, loadAddons, resetReport]);

  useEffect(() => {
    if (serverMode !== "live" || typeof EventSource === "undefined") return;

    const events = new EventSource("/events");
    events.addEventListener("update", async () => {
      const snapshot = await fetchJson("data/snapshot.cc.json");
      if (snapshot) loadSnapshot(snapshot, "servidor local", true);
      // El repo cambió: el reporte HEAD es lo que se ve en Cambios, y el
      // servidor lo acaba de tirar de la caché (ADR 0075).
      const report = await fetchJson(HEAD_REPORT_URL);
      if (report) loadReport(report, "HEAD", false);
    });
    return () => events.close();
  }, [serverMode, loadReport, loadSnapshot]);

  /** La URL decide la vista una sola vez, cuando ya hay modelo. */
  const [urlApplied, setUrlApplied] = useState(false);

  useEffect(() => {
    if (urlApplied || !view.model || !stats) return;
    const wanted = urlRef.current?.view;
    if (wanted) applyView(wanted);
    // El flag es del arranque: la URL se aplica una sola vez.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- aplicar la URL es un efecto externo
    setUrlApplied(true);
  }, [urlApplied, view.model, stats, applyView]);

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

  /** Las preferencias guardadas, para los ajustes. */
  const savedProjectLabel = useMemo(() => {
    if (!settingsOpen) return null;
    return readProject()?.label ?? null;
  }, [settingsOpen]);

  /** Si el almacenamiento local está disponible. */
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
        if (abrirSnapshot(raw, file.name)) {
          setServerMode("local");
          setSourceUrl(null);
          setReportUrl(null);
        }
      } catch (cause) {
        setError(`JSON inválido en ${file.name}: ${(cause as Error).message}`);
      }
    },
    [abrirSnapshot]
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
        abrirReporte(JSON.parse(await file.text()) as unknown, file.name);
      } catch (cause) {
        setReportError(
          `JSON inválido en ${file.name}: ${(cause as Error).message}`
        );
      }
    },
    [abrirReporte]
  );

  /** Deja en el mapa lo que trajo una carpeta con `.codarch/`. */
  const showArtifacts = useCallback(
    (artifacts: RepositoryArtifacts) => {
      if (!abrirSnapshot(artifacts.snapshot, artifacts.label)) return;
      setServerMode("local");
      setSourceUrl(null);
      setReportUrl(null);
      if (artifacts.report !== null) {
        abrirReporte(artifacts.report, artifacts.reportLabel ?? "report.json");
      }
    },
    [abrirSnapshot, abrirReporte]
  );

  const closeOpenMenu = useCallback(() => {
    openMenuRef.current?.removeAttribute("open");
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
      if (!abrirSnapshot(raw, snapshotUrl)) {
        setLoading(false);
        return;
      }
      setServerMode("local");
      setSourceUrl(snapshotUrl);
      setReportUrl(reportTarget || null);
      if (reportTarget) {
        try {
          const report = await fetchJsonStrict(reportTarget);
          if (report) abrirReporte(report, reportTarget);
        } catch (cause) {
          setReportError(
            `No se pudo cargar el reporte: ${(cause as Error).message}`
          );
        }
      }
    } catch (cause) {
      setError(`No se pudo cargar ${snapshotUrl}: ${(cause as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [
    closeOpenMenu,
    abrirSnapshot,
    abrirReporte,
    reportUrlInput,
    urlInput
  ]);

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
    if (serverMode === "static") {
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
      showArtifacts(await readRepositoryFromPicker());
    } catch (cause) {
      if ((cause as DOMException).name !== "AbortError") {
        setError((cause as Error).message);
      }
      setLoading(false);
    }
  }, [closeOpenMenu, showArtifacts]);

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
    [closeOpenMenu, showArtifacts]
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
            <OpenMenu
              ref={openMenuRef}
              items={[
                {
                  label: "Monitorizar carpeta (live)…",
                  onClick: openLiveFolder,
                  disabled: serverMode === "static",
                  title:
                    serverMode === "static"
                      ? "Arranca `codarch serve` para elegir carpetas locales"
                      : "Analiza y vigila una carpeta local"
                },
                {
                  label: "Carpeta con .codarch…",
                  onClick: () => void openRepository()
                },
                {
                  label: "Analizar carpeta aquí…",
                  onClick: () => void analyzeFolderInBrowser(),
                  title: "Analiza la carpeta en el navegador, sin ejecutar el CLI"
                },
                {
                  label: "Archivo cc.json…",
                  onClick: () => {
                    closeOpenMenu();
                    inputRef.current?.click();
                  }
                },
                {
                  label: copied ? "Enlace copiado" : "Copiar enlace de la vista",
                  onClick: () => void copyLink(),
                  keepOpen: true,
                  title:
                    "Copia el enlace de la vista actual (área, color, carpeta y fichero)"
                }
              ]}
            >
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
                Monitorizar analiza una carpeta en el servidor local. .codarch
                carga artefactos ya generados. Para activarlo:{" "}
                <code>codarch serve</code>.
              </p>
            </OpenMenu>
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
            tema={tema}
            onTema={setTema}
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
