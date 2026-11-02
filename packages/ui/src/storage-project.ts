import { localStore } from "./storage-local";
import type { ViewPreferences } from "./storage-preferences";

export interface SavedProject {
  snapshot: unknown;
  /** El mapa de lo que no es código, si el proyecto lo traía (ADR 0093). */
  rest?: unknown;
  /**
   * El lint del repo, si el proyecto lo traía (ADR 0094).
   *
   * En el escritorio vive en `.codarch/lint.repmod.json`; la web lo guarda aquí porque
   * no tiene un `.codarch/` donde dejarlo.
   */
  lint?: unknown;
  /**
   * Las reglas del resto, si el proyecto las traía (ADR 0105).
   *
   * En el escritorio viven en `.codarch/lint-rest.repmod.json`; la web las guarda
   * aquí junto al resto.
   */
  restLint?: unknown;
  report: unknown | null;
  label: string;
  reportLabel: string | null;
  addons?: unknown[];
  /** Las preferencias de vista del repo, si las guarda (ADR 0053). */
  preferences?: ViewPreferences;
}

/**
 * Un proyecto guardado, o `null` si no se entiende.
 *
 * Los `addons` se conservan si vienen: son de quien los guardó, y cada app
 * decide si los usa.
 */
export function parseSavedProject(value: unknown): SavedProject | null {
  if (typeof value !== "object" || value === null) return null;
  const parsed = value as Partial<SavedProject>;
  if (
    typeof parsed.label !== "string" ||
    typeof parsed.snapshot !== "object" ||
    parsed.snapshot === null
  ) {
    return null;
  }

  const project: SavedProject = {
    snapshot: parsed.snapshot,
    report:
      parsed.report === null || parsed.report === undefined ? null : parsed.report,
    label: parsed.label,
    reportLabel: typeof parsed.reportLabel === "string" ? parsed.reportLabel : null
  };
  if (Array.isArray(parsed.addons)) project.addons = parsed.addons;
  // El resto es opcional: un proyecto guardado antes de tenerlo sigue valiendo.
  if (typeof parsed.rest === "object" && parsed.rest !== null) {
    project.rest = parsed.rest;
  }
  // El lint también: un proyecto sin él no está roto, está sin medir.
  if (typeof parsed.lint === "object" && parsed.lint !== null) {
    project.lint = parsed.lint;
  }
  // Las reglas del resto: opcional, como el lint (ADR 0105).
  if (typeof parsed.restLint === "object" && parsed.restLint !== null) {
    project.restLint = parsed.restLint;
  }
  return project;
}

/** Lee un proyecto de una clave del almacén local. */
export function readSavedProject(
  key: string,
  storage: Storage | null = localStore()
): SavedProject | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return parseSavedProject(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}
