import type { SavedProject } from "@codarch/ui";

/**
 * De dónde saca el escritorio el proyecto al arrancar (ADR 0048).
 *
 * Todo entra inyectado para poder probar la migración sin Electron.
 */
export interface RestauracionDeps {
  /** El proyecto que guardaba la versión anterior en `localStorage`. */
  leerLegado: () => SavedProject | null;
  /** Lo escribe en `.codarch/` del repo; `false` si no se pudo. */
  persistir: (project: SavedProject) => Promise<boolean>;
  leerUltimaRaiz: () => string | null;
  escribirUltimaRaiz: (root: string) => void;
  olvidarLegado: () => void;
  /** Lee `.codarch/` de un repo: snapshot, reporte y addons. */
  restaurar: (root: string) => Promise<SavedProject | null>;
}

/**
 * Restaura el proyecto del escritorio desde `.codarch/` del repo.
 *
 * Si hay un proyecto de la versión anterior en `localStorage`, se escribe una
 * vez en el `.codarch/` de su repo y se olvida. Si no se puede escribir (el repo
 * se movió, no hay permisos), se devuelve tal cual: nada se pierde y se
 * reintenta en el siguiente arranque.
 */
export async function restaurarSesion(
  deps: RestauracionDeps
): Promise<SavedProject | null> {
  const legado = deps.leerLegado();
  if (legado) {
    if (!(await deps.persistir(legado))) return legado;
    deps.escribirUltimaRaiz(legado.label);
    deps.olvidarLegado();
  }

  const root = deps.leerUltimaRaiz();
  if (!root) return null;
  return deps.restaurar(root);
}
