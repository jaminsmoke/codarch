/**
 * Almacenamiento local de la máquina, compartido entre la web y el escritorio.
 *
 * Aquí viven los tipos y lo que se guarda igual en las dos apps: las
 * preferencias de vista, los plugins activados y la forma de un proyecto
 * guardado en `localStorage`. Cada app pone lo suyo —dónde guarda el proyecto,
 * la raíz del último repo, la migración del formato viejo— en su propio módulo.
 */

export interface ViewPreferences {
  areaMetric: string | null;
  colorMode: string;
  showLabels: boolean;
}

export interface SavedProject {
  snapshot: unknown;
  /** El mapa de lo que no es código, si el proyecto lo traía (ADR 0093). */
  rest?: unknown;
  /**
   * El lint del repo, si el proyecto lo traía (ADR 0094).
   *
   * En el escritorio vive en `.codarch/lint.json`; la web lo guarda aquí porque
   * no tiene un `.codarch/` donde dejarlo.
   */
  lint?: unknown;
  report: unknown | null;
  label: string;
  reportLabel: string | null;
  addons?: unknown[];
  /** Las preferencias de vista del repo, si las guarda (ADR 0053). */
  preferences?: ViewPreferences;
}

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

/**
 * Los plugins activados en esta máquina ✓.
 *
 * Es local ✓: el repo declara los que existen ✓ y cada quien activa los que
 * quiere ✓. El análisis no depende de esto ✓.
 */
export function readEnabledPlugins(
  storage: Storage | null = localStore()
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
  storage: Storage | null = localStore()
): void {
  if (!storage) return;
  try {
    storage.setItem(PLUGINS_KEY, JSON.stringify([...names]));
  } catch {
    // localStorage lleno o bloqueado: los plugins son opcionales.
  }
}

/**
 * Un proyecto guardado, o `null` si no se entiende.
 *
 * Los `addons` se conservan si vienen: son de quien los guardó, y cada app
 * decide si los usa.
 */
export function parseSavedProject(value: unknown): SavedProject | null {
  if (typeof value !== "object" || value === null) return null;
  const parsed = value as Partial<SavedProject>;
  if (
    typeof parsed.label !== "string" ||
    typeof parsed.snapshot !== "object" ||
    parsed.snapshot === null
  ) {
    return null;
  }

  const project: SavedProject = {
    snapshot: parsed.snapshot,
    report:
      parsed.report === null || parsed.report === undefined ? null : parsed.report,
    label: parsed.label,
    reportLabel: typeof parsed.reportLabel === "string" ? parsed.reportLabel : null
  };
  if (Array.isArray(parsed.addons)) project.addons = parsed.addons;
  // El resto es opcional: un proyecto guardado antes de tenerlo sigue valiendo.
  if (typeof parsed.rest === "object" && parsed.rest !== null) {
    project.rest = parsed.rest;
  }
  // El lint también: un proyecto sin él no está roto, está sin medir.
  if (typeof parsed.lint === "object" && parsed.lint !== null) {
    project.lint = parsed.lint;
  }
  return project;
}

/** Lee un proyecto de una clave del almacén local. */
export function readSavedProject(
  key: string,
  storage: Storage | null = localStore()
): SavedProject | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return parseSavedProject(JSON.parse(raw) as unknown);
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
