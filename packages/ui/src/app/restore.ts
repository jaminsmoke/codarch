import { useEffect } from "react";
import type { RepoAddon } from "@codarch/addons";
import type { CodarchAppState, CodarchAppActions } from "./types";
import type { Platform } from "../platform";

/**
 * El último proyecto, al montar.
 *
 * Solo lo hace la plataforma que guarda en disco: el escritorio abre donde se
 * quedó y la web lleva su propio arranque —servidor, URL, demo—. Si el proyecto
 * guardado ya no se puede abrir, se borra en vez de dejar un error en pantalla.
 * El proyecto puede traer su mapa del resto (ADR 0093), su lint (ADR 0094),
 * sus reglas del resto (ADR 0105) y su reporte.
 */

export interface RestoreProjectDeps {
  platform: Platform;
  loadSnapshot: CodarchAppActions["loadSnapshot"];
  loadRest: CodarchAppActions["loadRest"];
  loadLint: CodarchAppActions["loadLint"];
  loadRestLint: CodarchAppActions["loadRestLint"];
  loadReport: CodarchAppActions["loadReport"];
  setAddons: (addons: RepoAddon[]) => void;
  setLoading: (loading: boolean) => void;
}

export function useRestoreProject(deps: RestoreProjectDeps): void {
  const {
    platform,
    loadSnapshot,
    loadRest,
    loadLint,
    loadRestLint,
    loadReport,
    setAddons,
    setLoading
  } = deps;

  useEffect(() => {
    if (!platform.restoreProject) return;
    let cancelled = false;
    void (async () => {
      const saved = await platform.restoreProject?.();
      if (cancelled) return;
      if (saved && loadSnapshot(saved.snapshot, saved.label, false, saved.preferences)) {
        setAddons((saved.addons ?? []) as RepoAddon[]);
        // El proyecto guardado puede traer su resto (ADR 0093).
        if (saved.rest) loadRest(saved.rest);
        // Y su lint (ADR 0094); sin él, el proyecto está sin medir.
        loadLint(saved.lint ?? null);
        // Las reglas del resto (ADR 0105).
        loadRestLint(saved.restLint ?? null);
        if (saved.report) {
          loadReport(saved.report, saved.reportLabel ?? "report.json", false);
        }
        return;
      }
      if (saved) platform.clearProject();
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    loadSnapshot,
    loadRest,
    loadLint,
    loadRestLint,
    loadReport,
    platform,
    setAddons,
    setLoading
  ]);
}

/** El estado del mapa activo, que se corrige cuando su snapshot deja de estar. */
export function useExistingMap({
  map,
  rest,
  changeMap
}: {
  map: CodarchAppState["map"];
  rest: CodarchAppState["rest"];
  changeMap: (map: CodarchAppState["map"]) => void;
}): void {
  // Si el resto desaparece (otro proyecto, un refresco sin él), no se puede
  // seguir en un mapa que ya no existe.
  useEffect(() => {
    if (map === "rest" && !rest) changeMap("code");
  }, [map, rest, changeMap]);
}
