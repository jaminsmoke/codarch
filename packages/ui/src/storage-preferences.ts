import { PREFERENCES_KEY, localStore } from "./storage-local";

export interface ViewPreferences {
  areaMetric: string | null;
  colorMode: string;
  showLabels: boolean;
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

export function readPreferences(
  storage: Storage | null = localStore()
): ViewPreferences | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(PREFERENCES_KEY);
    if (!raw) return null;
    return parsePreferences(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function writePreferences(
  preferences: ViewPreferences,
  storage: Storage | null = localStore()
): void {
  if (!storage) return;
  try {
    storage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // localStorage lleno o bloqueado: las preferencias son opcionales.
  }
}
