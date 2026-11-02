import { useCallback, useEffect, useMemo } from "react";
import type { HistoryEntry } from "@codarch/schema/browser";
import { AppShell, OpenMenu, useCodarchApp, useTheme } from "@codarch/ui";
import { desktop } from "./bridge";
import { desktopPlatform } from "./platform";
import type { CodarchDesktop } from "../preload";
import { documentTitle } from "../title";
import Settings from "./Settings";

export default function App() {
  const platform = useMemo(() => desktopPlatform(), []);
  const app = useCodarchApp(platform);
  // El tema es de la máquina y lo comparten todos los ajustes (ADR 0084).
  const { theme, setTheme } = useTheme();
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
    loadRest,
    loadLint,
    loadRestLint,
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

  // El título del documento: gestores de ventanas en Linux lo prefieren.
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
   * El proceso principal ya hizo el trabajo (analyze o leer): aquí solo se
   * pinta el resultado.
   */
  useEffect(() => {
    const api = (window as unknown as { codarch?: CodarchDesktop }).codarch;
    if (!api?.onTarget) return;
    return api.onTarget((target) => {
      if (target.kind === "snapshot") {
        // Refresco live: misma vista; el resto, el lint y las reglas llegan
        // con el snapshot (ADR 0093, ADR 0105).
        const paint = (refresh: boolean) => {
          if (!loadSnapshot(target.snapshot, target.label, refresh)) return false;
          loadRest(target.rest ?? null);
          loadLint(target.lint ?? null);
          loadRestLint(target.restLint ?? null);
          return true;
        };
        if (target.refresh) {
          paint(true);
          return;
        }
        if (paint(false)) {
          setAddons([]);
          // El proceso principal ya lo escribió (ADR 0048): solo se recuerda.
          void platform.writeProject({
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
  }, [
    loadLint,
    loadReport,
    loadRest,
    loadRestLint,
    loadSnapshot,
    platform,
    resetReport,
    setAddons,
    setError
  ]);

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
          theme={theme}
          onTheme={setTheme}
          areaMetric={areaMetric}
          onAreaMetric={(value) => setAreaMetric(value)}
          colorMode={colorMode}
          onColorMode={(value) => setColorMode(value)}
          areaOptions={areaOptions}
          colorOptions={colorOptions}
          model={view.model}
          savedProject={cc ? { label: source } : null}
          onClearProject={() => {
            platform.clearProject();
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
