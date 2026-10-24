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
  /** Las preferencias de vista del repo, si las guarda (ADR 0053). */
  preferences?: ViewPreferences;
}

/**
 * Valida y normaliza unas preferencias guardadas.
 *
 * Lo usan los dos almacenes de la máquina y el `.codarch/preferences.json` del
 * repo: una sola forma de leer lo que se escribió.
 */
export function parsePreferences(value: unknown): ViewPreferences | null {
  if (typeof value !== "object" || value === null) return null;
  const parsed = value as Partial<ViewPreferences>;
  if (typeof parsed.colorMode !== "string") return null;
  return {
    areaMetric: typeof parsed.areaMetric === "string" ? parsed.areaMetric : null,
    colorMode: parsed.colorMode,
    showLabels: parsed.showLabels !== false
  };
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
