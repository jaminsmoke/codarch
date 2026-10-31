import { useEffect } from "react";
import type { RepoAddon } from "@codarch/addons";
import type { CodarchAppState, CodarchAppActions } from "./types";
import type { Plataforma } from "../platform";

/**
 * El último proyecto, al montar.
 *
 * Solo lo hace la plataforma que guarda en disco: el escritorio abre donde se
 * quedó y la web lleva su propio arranque —servidor, URL, demo—. Si el proyecto
 * guardado ya no se puede abrir, se borra en vez de dejar un error en pantalla.
 * El proyecto puede traer su mapa del resto (ADR 0093), su lint (ADR 0094) y su
 * reporte.
 */

export interface RestoreProjectDeps {
  plataforma: Plataforma;
  loadSnapshot: CodarchAppActions["loadSnapshot"];
  loadRest: CodarchAppActions["loadRest"];
  loadLint: CodarchAppActions["loadLint"];
  loadReport: CodarchAppActions["loadReport"];
  setAddons: (addons: RepoAddon[]) => void;
  setLoading: (loading: boolean) => void;
}

export function useRestoreProject(deps: RestoreProjectDeps): void {
  const {
    plataforma,
    loadSnapshot,
    loadRest,
    loadLint,
    loadReport,
    setAddons,
    setLoading
  } = deps;

  useEffect(() => {
    if (!plataforma.restaurarProyecto) return;
    let cancelled = false;
    void (async () => {
      const saved = await plataforma.restaurarProyecto?.();
      if (cancelled) return;
      if (saved && loadSnapshot(saved.snapshot, saved.label, false, saved.preferences)) {
        setAddons((saved.addons ?? []) as RepoAddon[]);
        // El proyecto guardado puede traer su resto (ADR 0093).
        if (saved.rest) loadRest(saved.rest);
        // Y su lint (ADR 0094); sin él, el proyecto está sin medir.
        loadLint(saved.lint ?? null);
        if (saved.report) {
          loadReport(saved.report, saved.reportLabel ?? "report.json", false);
        }
        return;
      }
      if (saved) plataforma.borrarProyecto();
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadSnapshot, loadRest, loadLint, loadReport, plataforma, setAddons, setLoading]);
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
