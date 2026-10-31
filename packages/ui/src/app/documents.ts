import { useCallback, type MutableRefObject } from "react";
import {
  getStats,
  parseCcJson,
  snapshotRelation,
  type CcJson
} from "@codarch/schema/browser";
import type { DiffReport } from "@codarch/metrics/browser";
import { readLintArtifact, type LintArtifact } from "@codarch/lint/browser";
import type { RepoAddon } from "@codarch/addons";
import type { Platform } from "../platform";
import type { ViewPreferences } from "../storage";
import type { InspectorTab } from "../viewState";
import { readMigration, readReport } from "../data";
import {
  keepArea,
  keepColor,
  metricCoverage,
  planSnapshotView
} from "./snapshotView";

/** Todo lo que un documento cargado escribe en el estado de la app. */
export interface DocumentSetters {
  setCc: (cc: CcJson | null) => void;
  setRest: (rest: CcJson | null) => void;
  setLint: (lint: LintArtifact | null) => void;
  setMap: (map: "code" | "rest") => void;
  setSource: (source: string) => void;
  setAreaMetric: (value: string | null | ((current: string | null) => string | null)) => void;
  setColorMode: (value: string | ((current: string) => string)) => void;
  setQuery: (query: string) => void;
  setSelectedIndex: (index: number | null) => void;
  setSelectedFolder: (path: string | null) => void;
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
  platform: Platform;
  preferencesRef: MutableRefObject<ViewPreferences | null | undefined>;
  /** El checksum del snapshot que hay en pantalla: distingue refresco de apertura. */
  checksumRef: MutableRefObject<string | null>;
  /** El checksum del historial de ese snapshot: el calor puede cambiar solo (ADR 0103). */
  historyChecksumRef: MutableRefObject<string | null>;
  /** La pestaña en la que está el usuario, para no moverla sin motivo. */
  tabRef: MutableRefObject<InspectorTab>;
  selectedPathRef: MutableRefObject<string | null>;
  cc: CcJson | null;
  /**
   * El mapa que ocupa el escenario, para no tocar su vista al refrescar.
   *
   * Va por referencia y no como valor a propósito: `loadSnapshot` tiene que
   * conservar su identidad entre renders. Si cambiara al cambiar de mapa, el
   * arranque de la web —que depende de ella— volvería a correr y tiraría el
   * resto que se acaba de abrir (ADR 0093).
   */
  mapRef: MutableRefObject<"code" | "rest">;
  source: string;
}

/**
 * Abrir, cargar y guardar documentos: el snapshot, su reporte y el proyecto.
 *
 * Un snapshot entra por cuatro puertas —«Abrir cc.json», soltar un fichero,
 * una URL y analyze una carpeta— y las cuatro hacen lo mismo: parsearlo,
 * decidir con qué vista se abre y dejarlo guardado como proyecto. Está aquí
 * junto para que esa igualdad se vea, en vez de repartida por el hook.
 *
 * Un refresco del live entra con `preserveView`: mismo proyecto con datos
 * nuevos, así que se avisa en la cabecera y no se mueve la vista. Es refresco
 * si cambió el código o el history: el calor es parte de los datos, y sin
 * su checksum un commit nuevo no avisaría de nada (ADR 0103).
 */
export function useDocuments(deps: DocumentDeps) {
  const {
    platform,
    preferencesRef,
    checksumRef,
    historyChecksumRef,
    tabRef,
    selectedPathRef,
    cc,
    mapRef,
    source,
    setCc,
    setRest,
    setLint,
    setMap,
    setSource,
    setAreaMetric,
    setColorMode,
    setQuery,
    setSelectedIndex,
    setSelectedFolder,
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
        // cabecera y no se toca la vista. Si el código y el historial son los
        // mismos, no hay nada nuevo que contar; si solo cambió el historial,
        // los números de heat se refrescan igual (ADR 0103).
        const checksum = parsed.meta.checksum ?? null;
        const historyChecksum = parsed.meta.historyChecksum ?? null;
        const anterior = checksumRef.current;
        const anteriorHistory = historyChecksumRef.current;
        checksumRef.current = checksum;
        historyChecksumRef.current = historyChecksum;
        if (
          preserveView &&
          anterior &&
          snapshotRelation(
            { checksum: anterior, historyChecksum: anteriorHistory ?? undefined },
            {
              checksum: checksum ?? undefined,
              historyChecksum: historyChecksum ?? undefined
            }
          ) !== "same"
        ) {
          setRefreshedAt(Date.now());
        }

        setCc(parsed);
        setSource(label);
        // Un refresco con el mapa del resto delante no toca su área ni su
        // color: son del resto, y `rloc` o el riesgo no existen ahí (ADR 0093).
        if (!preserveView) {
          setAreaMetric(plan.areaMetric);
          setColorMode(plan.colorMode);
        } else if (mapRef.current === "code") {
          setAreaMetric((current) =>
            keepArea(current, coverage, plan.areaMetric)
          );
          setColorMode((current) =>
            keepColor(current, coverage, readMigration(parsed))
          );
        }
        if (!preserveView) {
          // Otro proyecto, otro resto: el mapa vuelve al código hasta que el
          // nuevo traiga su `rest.cc.json` (ADR 0093). El lint es del repo que
          // se abre; si el nuevo no lo trae, se queda sin medir (ADR 0094).
          setRest(null);
          setLint(null);
          setMap("code");
          setQuery("");
          selectedPathRef.current = null;
          setSelectedIndex(null);
          setSelectedFolder(null);
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
      historyChecksumRef,
      preferencesRef,
      selectedPathRef,
      setAreaMetric,
      setCc,
      setRest,
      setLint,
      setMap,
      mapRef,
      setColorMode,
      setError,
      setFocusPath,
      setLoading,
      setOpenFile,
      setQuery,
      setRefreshedAt,
      setSelectedIndex,
      setSelectedFolder,
      setShowLabels,
      setSource
    ]
  );

  /**
   * Carga el mapa del resto (ADR 0093).
   *
   * Se comprueba que trae su lente `rest`: un snapshot de código que llegue por
   * error no puede convertirse en un segundo mapa. Un fichero que no encaja se
   * descarta en silencio —el mapa del código sigue—, porque el resto es
   * opcional por diseño.
   */
  const loadRest = useCallback(
    (raw: unknown): boolean => {
      if (raw === null || raw === undefined) {
        setRest(null);
        return true;
      }
      try {
        const parsed = parseCcJson(raw);
        if (!parsed.lenses?.rest) {
          setRest(null);
          return false;
        }
        setRest(parsed);
        return true;
      } catch {
        setRest(null);
        return false;
      }
    },
    [setRest]
  );

  /**
   * Carga el artefacto del lint (ADR 0094).
   *
   * No lanza: un `lint.repmod.json` de otra versión o escrito a mano no puede tumbar
   * el mapa. `null` quita el lint y lo deja «sin medir», que no es lo mismo que
   * un artefacto sin mensajes.
   */
  const loadLint = useCallback(
    (raw: unknown): boolean => {
      const parsed = readLintArtifact(raw);
      setLint(parsed);
      return parsed !== null;
    },
    [setLint]
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
  const openSnapshot = useCallback(
    (raw: unknown, label: string, rest?: unknown, lint?: unknown): boolean => {
      if (!loadSnapshot(raw, label)) return false;
      setAddons([]);
      // El resto viaja con su snapshot: los dos salen de la misma pasada y se
      // cargan juntos, aunque el mapa abra en el código (ADR 0093).
      if (rest !== undefined && !loadRest(rest)) setRest(null);
      // El lint es otro artefacto del mismo repo (ADR 0094): viaja junto al
      // proyecto, y un fichero que no se entiende deja el lint sin medir.
      loadLint(lint ?? null);
      void platform.writeProject({
        snapshot: raw,
        ...(rest !== undefined ? { rest } : {}),
        ...(lint !== undefined ? { lint } : {}),
        report: null,
        label,
        reportLabel: null,
        addons: []
      });
      resetReport();
      return true;
    },
    [loadLint, loadRest, loadSnapshot, platform, resetReport, setAddons, setRest]
  );

  /** Carga un reporte y lo guarda en el proyecto actual. */
  const openReport = useCallback(
    (raw: unknown, label: string): boolean => {
      if (!loadReport(raw, label)) return false;
      const saved = platform.readProject();
      if (saved) {
        // Si lo que se ve es el proyecto guardado (o su refresco del live), el
        // snapshot de la vista manda; una foto del historial no lo pisa.
        const snapshot = cc && source === saved.label ? cc : saved.snapshot;
        void platform.writeProject({
          ...saved,
          snapshot,
          report: raw,
          reportLabel: label
        });
      }
      return true;
    },
    [cc, loadReport, platform, source]
  );

  const analyzeFolder = useCallback(async () => {
    const { pickFolder, analyze } = platform;
    if (!pickFolder || !analyze) return;
    const root = await pickFolder();
    if (!root) return;
    setLoading(true);
    setError(null);
    setProgress(`Analizando ${root}...`);
    try {
      const result = await analyze(root);
      if (loadSnapshot(result.snapshot, root, false, result.preferences)) {
        // El análisis trae el resto de la misma pasada (ADR 0093).
        if (result.rest !== undefined) loadRest(result.rest);
        // Analizar no linta (ADR 0094): se enseña el artefacto que ya había.
        loadLint(result.lint ?? null);
        setAddons(result.addons.addons);
        void platform.writeProject({
          snapshot: result.snapshot,
          ...(result.lint !== undefined ? { lint: result.lint } : {}),
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
    loadLint,
    loadRest,
    loadSnapshot,
    platform,
    resetReport,
    setAddons,
    setError,
    setLoading,
    setProgress
  ]);

  const openSnapshotFile = useCallback(async () => {
    const { pickFile, readJson } = platform;
    if (!pickFile || !readJson) return;
    const file = await pickFile();
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      openSnapshot(await readJson(file), file);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  }, [openSnapshot, platform, setError, setLoading]);

  const openReportFile = useCallback(async () => {
    const { pickFile, readJson } = platform;
    if (!pickFile || !readJson) return;
    const file = await pickFile();
    if (!file) return;
    try {
      openReport(await readJson(file), file);
    } catch (cause) {
      setError((cause as Error).message);
    }
  }, [openReport, platform, setError]);

  return {
    loadSnapshot,
    loadRest,
    loadLint,
    loadReport,
    resetReport,
    openSnapshot,
    openReport,
    analyzeFolder,
    openSnapshotFile,
    openReportFile
  };
}
