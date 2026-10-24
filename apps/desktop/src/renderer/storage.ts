import type { ViewPreferences, SavedProject } from "@codarch/ui";

export type { ViewPreferences, SavedProject };

const PREFERENCES_KEY = "codarch.preferences.v1";
const PLUGINS_KEY = "codarch.plugins.v1";
/** La raíz del último repo abierto: su snapshot vive en `.codarch/` (ADR 0048). */
const LAST_ROOT_KEY = "codarch.lastRoot.v1";
/** El proyecto que guardaba la versión anterior, solo para migrarlo una vez. */
const LEGACY_PROJECT_KEY = "codarch.project.v1";

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
      colorMode: parsed.colorMode,
      showLabels: parsed.showLabels !== false
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

/** El último repo abierto, para volver a leer su `.codarch/` al arrancar. */
export function readLastRoot(
  storage: Storage | null = getStorage()
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
  storage: Storage | null = getStorage()
): void {
  if (!storage) return;
  try {
    storage.setItem(LAST_ROOT_KEY, root);
  } catch {
    // Sin almacenamiento no se recuerda el repo: se abre a mano.
  }
}

/** Olvida el último repo: al arrancar no se restaura nada. */
export function clearLastRoot(storage: Storage | null = getStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(LAST_ROOT_KEY);
  } catch {
    // Sin storage no hay nada que olvidar.
  }
}

/**
 * El proyecto que guardaba la versión anterior en `localStorage`.
 *
 * Solo se lee para migrarlo a `.codarch/` del repo y olvidarlo (ADR 0048).
 */
export function readLegacyProject(
  storage: Storage | null = getStorage()
): SavedProject | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(LEGACY_PROJECT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedProject>;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.label !== "string" ||
      typeof parsed.snapshot !== "object" ||
      parsed.snapshot === null
    ) {
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
        typeof parsed.reportLabel === "string" ? parsed.reportLabel : null,
      // Un proyecto guardado antes de los addons no los trae: no pasa nada.
      addons: Array.isArray(parsed.addons) ? parsed.addons : []
    };
  } catch {
    return null;
  }
}

/** Olvida el proyecto de la versión anterior: ya vive en `.codarch/`. */
export function clearLegacyProject(storage: Storage | null = getStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(LEGACY_PROJECT_KEY);
  } catch {
    // Sin storage no hay nada que olvidar.
  }
}

function getStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
