import { useCallback, type MutableRefObject } from "react";
import {
  getStats,
  parseCcJson,
  type CcJson
} from "@codarch/schema/browser";
import type { DiffReport } from "@codarch/metrics/browser";
import type { RepoAddon } from "@codarch/addons";
import type { Plataforma } from "../platform";
import type { ViewPreferences } from "../storage";
import type { InspectorTab } from "../viewState";
import { readReport } from "../data";
import {
  keepArea,
  keepColor,
  metricCoverage,
  planSnapshotView
} from "./snapshotView";

/** Todo lo que un documento cargado escribe en el estado de la app. */
export interface DocumentSetters {
  setCc: (cc: CcJson | null) => void;
  setSource: (source: string) => void;
  setAreaMetric: (value: string | null | ((current: string | null) => string | null)) => void;
  setColorMode: (value: string | ((current: string) => string)) => void;
  setQuery: (query: string) => void;
  setSelectedIndex: (index: number | null) => void;
  setFocusPath: (path: string | null) => void;
  setOpenFile: (path: string | null) => void;
  setShowLabels: (show: boolean) => void;
  setError: (message: string | null) => void;
  setLoading: (loading: boolean) => void;
  setReport: (report: DiffReport | null) => void;
  setReportSource: (source: string | null) => void;
  setReportError: (message: string | null) => void;
  setTab: (tab: InspectorTab) => void;
  setAddons: (addons: RepoAddon[]) => void;
  setProgress: (message: string | null) => void;
  setRefreshedAt: (at: number | null) => void;
}

export interface DocumentDeps extends DocumentSetters {
  plataforma: Plataforma;
  preferencesRef: MutableRefObject<ViewPreferences | null | undefined>;
  /** El checksum del snapshot que hay en pantalla: distingue refresco de apertura. */
  checksumRef: MutableRefObject<string | null>;
  /** La pestaña en la que está el usuario, para no moverla sin motivo. */
  tabRef: MutableRefObject<InspectorTab>;
  selectedPathRef: MutableRefObject<string | null>;
  cc: CcJson | null;
  source: string;
}

/**
 * Abrir, cargar y guardar documentos: el snapshot, su reporte y el proyecto.
 *
 * Un snapshot entra por cuatro puertas —«Abrir cc.json», soltar un fichero,
 * una URL y analizar una carpeta— y las cuatro hacen lo mismo: parsearlo,
 * decidir con qué vista se abre y dejarlo guardado como proyecto. Está aquí
 * junto para que esa igualdad se vea, en vez de repartida por el hook.
 *
 * Un refresco del live entra con `preserveView`: mismo proyecto con datos
 * nuevos, así que se avisa en la cabecera y no se mueve la vista. Si el
 * checksum no cambió, no hay nada que avisar.
 */
export function useDocuments(deps: DocumentDeps) {
  const {
    plataforma,
    preferencesRef,
    checksumRef,
    tabRef,
    selectedPathRef,
    cc,
    source,
    setCc,
    setSource,
    setAreaMetric,
    setColorMode,
    setQuery,
    setSelectedIndex,
    setFocusPath,
    setOpenFile,
    setShowLabels,
    setError,
    setLoading,
    setReport,
    setReportSource,
    setReportError,
    setTab,
    setAddons,
    setProgress,
    setRefreshedAt
  } = deps;

  const loadSnapshot = useCallback(
    (
      raw: unknown,
      label: string,
      preserveView = false,
      preferences?: ViewPreferences | null
    ): boolean => {
      try {
        const parsed = parseCcJson(raw);
        const nextStats = getStats(parsed);
        const coverage = metricCoverage(nextStats);
        const plan = planSnapshotView(
          parsed,
          nextStats,
          preferences ?? preferencesRef.current
        );

        // Un refresco es el mismo proyecto con datos nuevos: se avisa en la
        // cabecera y no se toca la vista. Si el checksum es el mismo, no hay
        // nada nuevo que contar.
        const checksum = parsed.meta.checksum ?? null;
        const anterior = checksumRef.current;
        checksumRef.current = checksum;
        if (preserveView && anterior && checksum !== anterior) {
          setRefreshedAt(Date.now());
        }

        setCc(parsed);
        setSource(label);
        setAreaMetric((current) =>
          preserveView ? keepArea(current, coverage, plan.areaMetric) : plan.areaMetric
        );
        setColorMode((current) =>
          preserveView ? keepColor(current, coverage) : plan.colorMode
        );
        if (!preserveView) {
          setQuery("");
          selectedPathRef.current = null;
          setSelectedIndex(null);
          setFocusPath(null);
          setOpenFile(null);
          // Las preferencias del repo mandan sobre las de la máquina (ADR 0053).
          if (preferences) setShowLabels(preferences.showLabels);
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
    [
      checksumRef,
      preferencesRef,
      selectedPathRef,
      setAreaMetric,
      setCc,
      setColorMode,
      setError,
      setFocusPath,
      setLoading,
      setOpenFile,
      setQuery,
      setRefreshedAt,
      setSelectedIndex,
      setShowLabels,
      setSource
    ]
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
      // El reporte se enseña en Cambios (ADR 0075); si ya se está ahí, no se
      // mueve la pestaña.
      if (focus && tabRef.current !== "changes") setTab("changes");
      return true;
    },
    [setReport, setReportError, setReportSource, setTab, tabRef]
  );

  const resetReport = useCallback(() => {
    setReport(null);
    setReportSource(null);
    setReportError(null);
    setTab("file");
  }, [setReport, setReportError, setReportSource, setTab]);

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
    [loadSnapshot, plataforma, resetReport, setAddons]
  );

  /** Carga un reporte y lo guarda en el proyecto actual. */
  const abrirReporte = useCallback(
    (raw: unknown, label: string): boolean => {
      if (!loadReport(raw, label)) return false;
      const saved = plataforma.leerProyecto();
      if (saved) {
        // Si lo que se ve es el proyecto guardado (o su refresco del live), el
        // snapshot de la vista manda; una foto del historial no lo pisa.
        const snapshot = cc && source === saved.label ? cc : saved.snapshot;
        void plataforma.escribirProyecto({
          ...saved,
          snapshot,
          report: raw,
          reportLabel: label
        });
      }
      return true;
    },
    [cc, loadReport, plataforma, source]
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
      if (loadSnapshot(result.snapshot, root, false, result.preferences)) {
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
  }, [
    loadSnapshot,
    plataforma,
    resetReport,
    setAddons,
    setError,
    setLoading,
    setProgress
  ]);

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
  }, [abrirSnapshot, plataforma, setError, setLoading]);

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
  }, [abrirReporte, plataforma, setError]);

  return {
    loadSnapshot,
    loadReport,
    resetReport,
    abrirSnapshot,
    abrirReporte,
    analyzeFolder,
    openSnapshotFile,
    openReportFile
  };
}
