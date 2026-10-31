/**
 * El almacén local de la máquina: las claves, cómo se abre y cómo se olvida.
 *
 * Es la pieza que comparten las preferencias, los plugins y el proyecto
 * guardado; nadie más toca `localStorage` a mano.
 */

/** Las claves del almacén local. Una por cosa, no una por app. */
export const PREFERENCES_KEY = "codarch.preferences.v1";
export const PLUGINS_KEY = "codarch.plugins.v1";
/**
 * El proyecto en `localStorage`.
 *
 * La web lo usa como estado actual —no tiene `.codarch/` donde dejarlo—; el
 * escritorio solo lo lee una vez para migrarlo al repo (ADR 0048).
 */
export const PROJECT_KEY = "codarch.project.v1";

/**
 * El almacenamiento local del navegador, si lo deja.
 *
 * Las dos apps lo inyectan en el contexto de los plugins; cuando el navegador
 * lo bloquea, el plugin se queda sin él en vez de romper la app.
 */
export function localStore(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Borra una clave del almacén local, si se puede. */
export function forgetKey(
  key: string,
  storage: Storage | null = localStore()
): void {
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // Sin almacenamiento no hay nada que olvidar.
  }
}
