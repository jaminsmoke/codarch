import {
  PROJECT_KEY,
  forgetKey,
  localStore,
  parseSavedProject,
  type SavedProject
} from "@codarch/ui/storage";

/**
 * El proyecto guardado de la web, en `localStorage`.
 *
 * La web no tiene `.codarch/` donde dejarlo (ADR 0048), así que el proyecto
 * vive aquí. Las preferencias y los plugins son iguales en las dos apps y se
 * leen del almacén compartido.
 */

export {
  readEnabledPlugins,
  readPreferences,
  writeEnabledPlugins,
  writePreferences
} from "@codarch/ui/storage";
export type { ViewPreferences, SavedProject } from "@codarch/ui/storage";

/** El proyecto es un `cc.json` con su reporte: no cabe cualquier cosa. */
const MAX_PROJECT_CHARS = 2_500_000;

export function readProject(
  storage: Storage | null = localStore()
): SavedProject | null {
  if (!storage) return null;
  let raw: string | null;
  try {
    raw = storage.getItem(PROJECT_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let value: unknown = null;
  try {
    value = JSON.parse(raw) as unknown;
  } catch {
    value = null;
  }

  const project = parseSavedProject(value);
  if (project) return project;
  // Un proyecto que no se entiende se olvida: no vuelve a fallar en cada
  // arranque, y el usuario solo ve el estado vacío.
  forgetKey(PROJECT_KEY, storage);
  return null;
}

export function writeProject(
  project: SavedProject,
  storage: Storage | null = localStore()
): boolean {
  if (!storage) return false;
  try {
    const serialized = JSON.stringify(project);
    if (serialized.length > MAX_PROJECT_CHARS) return false;
    storage.setItem(PROJECT_KEY, serialized);
    return true;
  } catch {
    return false;
  }
}

export function clearProject(storage: Storage | null = localStore()): void {
  forgetKey(PROJECT_KEY, storage);
}
