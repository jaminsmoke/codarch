export interface ViewPreferences {
  areaMetric: string | null;
  colorMode: string;
}

export interface SavedProject {
  snapshot: unknown;
  report: unknown | null;
  label: string;
  reportLabel: string | null;
}

const PREFERENCES_KEY = "codarch.preferences.v1";
const PLUGINS_KEY = "codarch.plugins.v1";
const PROJECT_KEY = "codarch.project.v1";
const MAX_PROJECT_CHARS = 2_500_000;

export function readPreferences(
  storage: Storage | null = getStorage()
): ViewPreferences | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(PREFERENCES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ViewPreferences>;
    if (typeof parsed.colorMode !== "string") return null;
    return {
      areaMetric:
        typeof parsed.areaMetric === "string" ? parsed.areaMetric : null,
      colorMode: parsed.colorMode
    };
  } catch {
    return null;
  }
}

export function writePreferences(
  preferences: ViewPreferences,
  storage: Storage | null = getStorage()
): void {
  if (!storage) return;
  try {
    storage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // localStorage lleno o bloqueado: las preferencias son opcionales.
  }
}

/**
 * Los plugins activados en esta máquina ✓.
 *
 * Es local ✓: el repo declara los que existen ✓ y cada quien activa los que
 * quiere ✓. El análisis no depende de esto ✓.
 */
export function readEnabledPlugins(
  storage: Storage | null = getStorage()
): string[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(PLUGINS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((name): name is string => typeof name === "string");
  } catch {
    return [];
  }
}

export function writeEnabledPlugins(
  names: readonly string[],
  storage: Storage | null = getStorage()
): void {
  if (!storage) return;
  try {
    storage.setItem(PLUGINS_KEY, JSON.stringify([...names]));
  } catch {
    // localStorage lleno o bloqueado: los plugins son opcionales.
  }
}

export function readProject(
  storage: Storage | null = getStorage()
): SavedProject | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(PROJECT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedProject>;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.label !== "string" ||
      typeof parsed.snapshot !== "object" ||
      parsed.snapshot === null
    ) {
      storage.removeItem(PROJECT_KEY);
      return null;
    }
    return {
      snapshot: parsed.snapshot,
      report:
        parsed.report === null || parsed.report === undefined
          ? null
          : parsed.report,
      label: parsed.label,
      reportLabel:
        typeof parsed.reportLabel === "string" ? parsed.reportLabel : null
    };
  } catch {
    storage.removeItem(PROJECT_KEY);
    return null;
  }
}

export function writeProject(
  project: SavedProject,
  storage: Storage | null = getStorage()
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

export function clearProject(storage: Storage | null = getStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(PROJECT_KEY);
  } catch {
    // Sin storage no hay nada que limpiar.
  }
}

function getStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
