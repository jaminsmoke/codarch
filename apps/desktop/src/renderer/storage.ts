import {
  PROJECT_KEY,
  forgetKey,
  localStore,
  readSavedProject,
  type SavedProject
} from "@codarch/ui/storage";

/**
 * Lo que el escritorio recuerda en `localStorage`.
 *
 * El proyecto no vive aquí: vive en `.codarch/` del repo (ADR 0048). En la
 * máquina solo quedan la raíz del último repo abierto y el proyecto de la
 * versión anterior, que se lee una vez para migrarlo. Las preferencias y los
 * plugins son iguales en las dos apps y se leen del almacén compartido.
 */

export {
  readEnabledPlugins,
  readPreferences,
  writeEnabledPlugins,
  writePreferences
} from "@codarch/ui/storage";
export type { ViewPreferences, SavedProject } from "@codarch/ui/storage";

/** La raíz del último repo abierto: su snapshot vive en `.codarch/` (ADR 0048). */
const LAST_ROOT_KEY = "codarch.lastRoot.v1";
/** El proyecto que guardaba la versión anterior, solo para migrarlo una vez. */
const LEGACY_PROJECT_KEY = PROJECT_KEY;

/** El último repo abierto, para volver a leer su `.codarch/` al arrancar. */
export function readLastRoot(
  storage: Storage | null = localStore()
): string | null {
  if (!storage) return null;
  try {
    const root = storage.getItem(LAST_ROOT_KEY);
    return root && root.trim() !== "" ? root : null;
  } catch {
    return null;
  }
}

export function writeLastRoot(
  root: string,
  storage: Storage | null = localStore()
): void {
  if (!storage) return;
  try {
    storage.setItem(LAST_ROOT_KEY, root);
  } catch {
    // Sin almacenamiento no se recuerda el repo: se abre a mano.
  }
}

/** Olvida el último repo: al arrancar no se restaura nada. */
export function clearLastRoot(storage: Storage | null = localStore()): void {
  forgetKey(LAST_ROOT_KEY, storage);
}

/**
 * El proyecto que guardaba la versión anterior en `localStorage`.
 *
 * Solo se lee para migrarlo a `.codarch/` del repo y olvidarlo (ADR 0048).
 */
export function readLegacyProject(
  storage: Storage | null = localStore()
): SavedProject | null {
  const project = readSavedProject(LEGACY_PROJECT_KEY, storage);
  if (!project) return null;
  // Un proyecto guardado antes de los addons no los trae: no pasa nada.
  return { ...project, addons: project.addons ?? [] };
}

/** Olvida el proyecto de la versión anterior: ya vive en `.codarch/`. */
export function clearLegacyProject(storage: Storage | null = localStore()): void {
  forgetKey(LEGACY_PROJECT_KEY, storage);
}
