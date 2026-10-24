/**
 * Tipos de almacenamiento compartidos entre la web y el escritorio.
 */

export interface ViewPreferences {
  areaMetric: string | null;
  colorMode: string;
  showLabels: boolean;
}

export interface SavedProject {
  snapshot: unknown;
  report: unknown | null;
  label: string;
  reportLabel: string | null;
  addons?: unknown[];
}

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
