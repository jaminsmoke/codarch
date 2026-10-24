import { useCallback, useEffect, useMemo } from "react";
import type { HistoryEntry } from "@codarch/schema/browser";
import { AppShell, OpenMenu, useCodarchApp } from "@codarch/ui";
import { desktop } from "./bridge";
import { plataformaEscritorio } from "./plataforma";
import type { CodarchDesktop } from "../preload";
import Settings from "./Settings";

export default function App() {
  const plataforma = useMemo(() => plataformaEscritorio(), []);
  const app = useCodarchApp(plataforma);
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
    setAddons
  } = app.actions;
  const {
    view,
    plugins,
    areaOptions,
    colorOptions
  } = app;

  // El menú nativo abre los ajustes ✓.
  useEffect(() => {
    return desktop().onOpenSettings(() => setSettingsOpen(true));
  }, [setSettingsOpen]);

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
      if (target.report === null) {
        setError(`No se pudo abrir ${target.label}`);
        return;
      }
      loadReport(target.report, target.label);
    });
  }, [loadReport, loadSnapshot, plataforma, resetReport]);

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
