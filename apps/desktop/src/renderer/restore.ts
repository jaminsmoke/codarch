import type { SavedProject } from "@codarch/ui";

/**
 * De dónde saca el escritorio el proyecto al arrancar (ADR 0048).
 *
 * Todo entra inyectado para poder probar la migración sin Electron.
 */
export interface RestoreDeps {
  /** El proyecto que guardaba la versión anterior en `localStorage`. */
  readLegacy: () => SavedProject | null;
  /** Lo escribe en `.codarch/` del repo; `false` si no se pudo. */
  persist: (project: SavedProject) => Promise<boolean>;
  readLastRoot: () => string | null;
  writeLastRoot: (root: string) => void;
  clearLegacy: () => void;
  /** Lee `.codarch/` de un repo: snapshot, reporte y addons. */
  restore: (root: string) => Promise<SavedProject | null>;
}

/**
 * Restaura el proyecto del escritorio desde `.codarch/` del repo.
 *
 * Si hay un proyecto de la versión anterior en `localStorage`, se escribe una
 * vez en el `.codarch/` de su repo y se olvida. Si no se puede escribir (el repo
 * se movió, no hay permisos), se devuelve tal cual: nada se pierde y se
 * reintenta en el siguiente arranque.
 */
export async function restoreSession(
  deps: RestoreDeps
): Promise<SavedProject | null> {
  const legacy = deps.readLegacy();
  if (legacy) {
    if (!(await deps.persist(legacy))) return legacy;
    deps.writeLastRoot(legacy.label);
    deps.clearLegacy();
  }

  const root = deps.readLastRoot();
  if (!root) return null;
  return deps.restore(root);
}
