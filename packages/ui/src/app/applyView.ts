import type { CcMigrationLens } from "@codarch/schema/browser";
import type { RenderModel } from "@codarch/render/browser";
import { findFolder } from "../tree";
import {
  isColorModeAvailable,
  type InspectorTab,
  type ViewState as AppViewState
} from "../viewState";
import { indexOfPath } from "./selection";

/**
 * Qué de un estado de vista se puede aplicar a este mapa.
 *
 * Un enlace compartido y la vista guardada de un addon hablan el mismo dialecto
 * (ADR 0029, ADR 0088): área, color, carpeta enfocada, carpeta seleccionada,
 * fichero, fichero abierto, pestaña, etiquetas y símbolo. Lo que no encaja con
 * el snapshot —una métrica que no está, una carpeta que ya no existe— se ignora
 * en silencio: es una pista, no un contrato.
 *
 * Decidirlo aquí, y no dentro del hook, deja la regla en una función que se
 * puede leer y probar sin montar la app; el hook solo obedece el plan.
 */
export interface ViewPlan {
  /** El área que se puede aplicar, o `null` si no hay que tocarla. */
  areaMetric: string | null;
  colorMode: string | null;
  focusPath: string | null;
  folderPath: string | null;
  /** El índice del fichero a seleccionar; `null` si no hay que tocar nada. */
  fileIndex: number | null;
  openFilePath: string | null;
  tab: InspectorTab | null;
  showLabels: boolean | null;
  /** El símbolo cuya cadena hay que pedir, cuando ya se sabe la ruta. */
  symbol: { name: string; path: string } | null;
}

/** Lo que el mapa de ahora mismo puede conceder. */
export interface ViewTargets {
  model: RenderModel;
  /** Las métricas que el snapshot trae. */
  coverage: ReadonlySet<string>;
  /** La lente de migración, si existe: decide si `status` se puede pintar. */
  migration: CcMigrationLens | null;
}

const NOTHING: ViewPlan = {
  areaMetric: null,
  colorMode: null,
  focusPath: null,
  folderPath: null,
  fileIndex: null,
  openFilePath: null,
  tab: null,
  showLabels: null,
  symbol: null
};

/** El plan de una vista pedida, con lo que este mapa puede conceder. */
export function planViewState(
  wanted: AppViewState,
  targets: ViewTargets
): ViewPlan {
  const { model, coverage } = targets;
  const plan: ViewPlan = { ...NOTHING };

  if (wanted.areaMetric && coverage.has(wanted.areaMetric)) {
    plan.areaMetric = wanted.areaMetric;
  }
  if (
    wanted.colorMode &&
    isColorModeAvailable(wanted.colorMode, coverage, targets.migration)
  ) {
    plan.colorMode = wanted.colorMode;
  }
  if (wanted.focusPath && findFolder(model.roots, wanted.focusPath)) {
    plan.focusPath = wanted.focusPath;
  }
  if (wanted.folderPath && findFolder(model.roots, wanted.folderPath)) {
    plan.folderPath = wanted.folderPath;
  }
  if (wanted.filePath) {
    const index = indexOfPath(model.files, wanted.filePath);
    if (index >= 0) plan.fileIndex = index;
  }
  if (
    wanted.openFilePath &&
    model.files.some((file) => file.path === wanted.openFilePath)
  ) {
    plan.openFilePath = wanted.openFilePath;
  }
  if (wanted.tab) plan.tab = wanted.tab;
  if (wanted.showLabels !== null) plan.showLabels = wanted.showLabels;
  // El símbolo se abre después, cuando ya se puede pedir su cadena.
  if (wanted.symbolName) {
    plan.symbol = { name: wanted.symbolName, path: wanted.filePath ?? "" };
  }
  return plan;
}
