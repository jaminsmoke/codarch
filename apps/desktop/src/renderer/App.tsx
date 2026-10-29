import { useCallback, useEffect, useMemo } from "react";
import type { HistoryEntry } from "@codarch/schema/browser";
import { AppShell, OpenMenu, useCodarchApp, useTema } from "@codarch/ui";
import { desktop } from "./bridge";
import { plataformaEscritorio } from "./plataforma";
import type { CodarchDesktop } from "../preload";
import { documentTitle } from "../title";
import Settings from "./Settings";

export default function App() {
  const plataforma = useMemo(() => plataformaEscritorio(), []);
  const app = useCodarchApp(plataforma);
  // El tema es de la máquina y lo comparten todos los ajustes (ADR 0084).
  const { tema, setTema } = useTema();
  const {
    cc,
    source,
    areaMetric,
    colorMode,
    settingsOpen,
    showLabels,
    addons
  } = app.state;
  const {
    loadSnapshot,
    loadReport,
    resetReport,
    analyzeFolder,
    openSnapshotFile,
    openReportFile,
    setAreaMetric,
    setColorMode,
    setSettingsOpen,
    setShowLabels,
    setError,
    setAddons,
    setWatch
  } = app.actions;
  const { view, plugins, areaOptions, colorOptions } = app;

  // El menú nativo abre los ajustes ✓.
  useEffect(() => {
    return desktop().onOpenSettings(() => setSettingsOpen(true));
  }, [setSettingsOpen]);

  // El título dice el proyecto abierto, no «CodArch» a secas. Se pone también
  // en el documento porque hay gestores de ventanas en Linux que prefieren
  // ese título al que fija el proceso principal.
  useEffect(() => {
    document.title = cc
      ? documentTitle(source, cc.meta.projectName ?? null)
      : "CodArch";
  }, [source, cc]);

  // La cabecera dice si el proceso principal vigila el repo (ADR 0050).
  useEffect(() => {
    return desktop().onWatch((live) => setWatch(live ? "live" : "none"));
  }, [setWatch]);

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
    [loadSnapshot, setError]
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
        // Un refresco es el mismo repo que cambió en disco (live): se mantiene
        // la vista y lo que se estaba mirando (área, color, foco, reporte).
        if (target.refresh) {
          loadSnapshot(target.snapshot, target.label, true);
          return;
        }
        if (loadSnapshot(target.snapshot, target.label)) {
          setAddons([]);
          // El proceso principal ya lo escribió en `.codarch/` (ADR 0048):
          // esto solo recuerda cuál es el último repo.
          void plataforma.escribirProyecto({
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
      if (target.kind === "head") {
        // Lo tocado desde el último commit (ADR 0072): va a Cambios sin mover
        // la pestaña, porque llega en segundo plano tras cada análisis.
        loadReport(target.report, target.label, false);
        return;
      }
      if (target.report === null) {
        setError(`No se pudo abrir ${target.label}`);
        return;
      }
      loadReport(target.report, target.label);
    });
  }, [loadReport, loadSnapshot, plataforma, resetReport, setAddons, setError]);

  return (
    <AppShell
      app={app}
      topbarTrailing={
        <OpenMenu
          items={[
            {
              label: "Analizar carpeta…",
              onClick: () => void analyzeFolder()
            },
            {
              label: "Archivo cc.json…",
              onClick: () => void openSnapshotFile()
            },
            {
              label: "Reporte JSON…",
              onClick: () => void openReportFile()
            }
          ]}
        />
      }
      onOpenHistory={(entry) => {
        void openHistorySnapshot(entry);
      }}
      onLoadReport={() => void openReportFile()}
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
          savedProject={cc ? { label: source } : null}
          onClearProject={() => {
            plataforma.borrarProyecto();
            setSettingsOpen(false);
          }}
          projectNote={
            <>
              Vive en <code>.codarch/</code> del repositorio y lo comparten el
              CLI y la web. Olvidarlo no borra ese directorio.
            </>
          }
          storageAvailable={true}
          version={desktop().version}
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
  );
}
