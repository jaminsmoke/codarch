import {
  ADDON_NAME,
  ConfigError,
  parseProfileEntry,
  parseRuleList
} from "@codarch/metrics";
import type {
  DomainProfile,
  LayerConfig,
  RuleConfigAddon,
  RuleConfigEntry
} from "@codarch/metrics";

/**
 * Los addons: conocimiento declarativo (ADR 0029).
 *
 * Un addon es **datos**, no código: un manifiesto (`addon.json`) que apunta a
 * perfiles, reglas y vistas guardadas. Ni se ejecuta ni toca el snapshot: el
 * checksum depende del código, no de lo que tengas instalado.
 *
 * Aquí vive el contrato: qué es válido y qué no. Leer del disco es cosa de
 * `@codarch/addons/node`, para que la web pueda usar este módulo en el
 * navegador.
 */

/** Lo que no cumple el contrato de un addon. */
export class AddonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AddonError";
  }
}

/** Las piezas que un addon puede aportar: rutas dentro de su carpeta. */
export interface AddonContributions {
  /** Perfiles de arquitectura (capas y reglas). */
  profiles: string[];
  /** Reglas sueltas, además de las de los perfiles. */
  rules: string[];
  /** Vistas guardadas: un estado de vista con nombre. */
  views: string[];
}

/** El manifiesto de un addon: su `addon.json`. */
export interface AddonManifest {
  /** El identificador: el nombre de su carpeta. */
  name: string;
  version: string;
  /** El nombre que se ve. */
  title: string;
  /** Una frase de qué aporta. */
  description?: string;
  /** Dónde está su documentación. */
  homepage?: string;
  contributes: AddonContributions;
}

/**
 * El estado de una vista guardada.
 *
 * Son las mismas claves cortas que la URL (ADR 0018), para que una vista
 * guardada y un enlace compartido sean lo mismo.
 */
export interface AddonViewState {
  /** Métrica que decide el área. */
  area?: string;
  /** Modo de color: `risk`, `structure`, `status` o una métrica. */
  color?: string;
  /** Carpeta enfocada. */
  focus?: string;
  /** Fichero seleccionado. */
  file?: string;
  /** Pestaña del panel derecho. */
  tab?: "file" | "lenses" | "pr";
  /** Símbolo abierto. */
  symbol?: string;
  /** Si los bloques enseñan su nombre. */
  labels?: boolean;
}

/** Una vista guardada: un estado de vista con nombre. */
export interface AddonView {
  id: string;
  title: string;
  description?: string;
  state: AddonViewState;
}

/** Un addon cargado: el manifiesto y lo que aporta. */
export interface Addon {
  manifest: AddonManifest;
  profiles: DomainProfile[];
  rules: RuleConfigEntry[];
  views: AddonView[];
}

/**
 * Un addon del repo, resumido para las apps.
 *
 * Es lo que la web y el escritorio necesitan para enseñar las vistas
 * guardadas, sin cargar el addon entero.
 */
export interface RepoAddon {
  name: string;
  title: string;
  version: string;
  description: string | null;
  profiles: Array<{ id: string; title: string }>;
  rules: number;
  views: AddonView[];
}

/** Los addons que el repo declara, con lo que aportan cada uno. */
export interface RepoAddons {
  addons: RepoAddon[];
  /** Los addons que no se pudieron cargar, con su motivo. */
  errors: string[];
}

/** Las piezas tal y como llegan del disco o de un JSON, sin validar. */
export interface AddonPieces {
  manifest: unknown;
  profiles: unknown[];
  rules: unknown[];
  views: unknown[];
}

const MANIFEST_KEYS = [
  "name",
  "version",
  "title",
  "description",
  "homepage",
  "contributes"
] as const;

const CONTRIBUTION_KEYS = ["profiles", "rules", "views"] as const;

const VIEW_KEYS = ["id", "title", "description", "state"] as const;

const STATE_KEYS = [
  "area",
  "color",
  "focus",
  "file",
  "tab",
  "symbol",
  "labels"
] as const;

/**
 * Valida el manifiesto.
 *
 * Una clave desconocida es un **error** y no se ignora: un `profiles` mal
 * escrito no puede pasar por bueno en silencio.
 */
export function parseAddonManifest(input: unknown): AddonManifest {
  const manifest = asObject(input, "addon.json");
  rejectUnknown(manifest, MANIFEST_KEYS, "addon.json");

  const name = asString(manifest.name, "addon.json.name");
  if (!ADDON_NAME.test(name)) {
    throw new AddonError(
      `addon.json.name no es un nombre de addon: ${name} (minúsculas, números y guiones)`
    );
  }

  const contributes = asObject(
    manifest.contributes ?? {},
    "addon.json.contributes"
  );
  rejectUnknown(contributes, CONTRIBUTION_KEYS, "addon.json.contributes");

  return {
    name,
    version: asString(manifest.version, "addon.json.version"),
    title: asString(manifest.title, "addon.json.title"),
    description: optionalString(manifest.description, "addon.json.description"),
    homepage: optionalString(manifest.homepage, "addon.json.homepage"),
    contributes: {
      profiles: parsePathList(contributes.profiles, "addon.json.contributes.profiles"),
      rules: parsePathList(contributes.rules, "addon.json.contributes.rules"),
      views: parsePathList(contributes.views, "addon.json.contributes.views")
    }
  };
}

/** Valida una vista guardada. */
export function parseAddonView(input: unknown, path: string): AddonView {
  const view = asObject(input, path);
  rejectUnknown(view, VIEW_KEYS, path);

  const state = asObject(view.state ?? {}, `${path}.state`);
  rejectUnknown(state, STATE_KEYS, `${path}.state`);

  const tab = optionalString(state.tab, `${path}.state.tab`);
  if (
    tab !== undefined &&
    tab !== "file" &&
    tab !== "lenses" &&
    tab !== "pr"
  ) {
    throw new AddonError(`${path}.state.tab debe ser file, lenses o pr`);
  }

  if (state.labels !== undefined && typeof state.labels !== "boolean") {
    throw new AddonError(`${path}.state.labels debe ser true o false`);
  }

  return {
    id: asString(view.id, `${path}.id`),
    title: asString(view.title, `${path}.title`),
    description: optionalString(view.description, `${path}.description`),
    state: {
      area: optionalString(state.area, `${path}.state.area`),
      color: optionalString(state.color, `${path}.state.color`),
      focus: optionalString(state.focus, `${path}.state.focus`),
      file: optionalString(state.file, `${path}.state.file`),
      tab: tab as "file" | "lenses" | "pr" | undefined,
      symbol: optionalString(state.symbol, `${path}.state.symbol`),
      labels: state.labels as boolean | undefined
    }
  };
}

/**
 * Valida un addon entero.
 *
 * Las reglas se comprueban contra **las capas del propio addon**: un addon es
 * autocontenido, así que las prohibiciones que escribe solo pueden hablar de
 * las capas que trae. Las capas del equipo se fusionan después por nombre.
 */
export function parseAddon(pieces: AddonPieces): Addon {
  const manifest = parseAddonManifest(pieces.manifest);
  const name = manifest.name;

  const profiles = pieces.profiles.map((raw, index) =>
    parseProfileEntry(raw, `${name}: profiles[${index}]`)
  );

  const profileIds = new Set<string>();
  for (const profile of profiles) {
    if (profileIds.has(profile.id)) {
      throw new AddonError(`${name}: perfil duplicado: ${profile.id}`);
    }
    profileIds.add(profile.id);
  }

  const layerNames = new Set<string>();
  for (const profile of profiles) {
    for (const layer of profile.layers) layerNames.add(layer.name);
  }

  const views = pieces.views.map((raw, index) =>
    parseAddonView(raw, `${name}: views[${index}]`)
  );

  const viewIds = new Set<string>();
  for (const view of views) {
    if (viewIds.has(view.id)) {
      throw new AddonError(`${name}: vista duplicada: ${view.id}`);
    }
    viewIds.add(view.id);
  }

  return {
    manifest,
    profiles,
    rules: parseRuleList(pieces.rules, layerNames, `${name}: rules`),
    views
  };
}

/** Las capas que aporta un addon: las de todos sus perfiles, en orden. */
export function addonLayers(addon: Addon): LayerConfig[] {
  const layers = new Map<string, LayerConfig>();
  for (const profile of addon.profiles) {
    for (const layer of profile.layers) layers.set(layer.name, layer);
  }
  return [...layers.values()];
}

/** El addon tal y como lo entiende el análisis: capas y reglas. */
export function ruleConfigAddon(addon: Addon): RuleConfigAddon {
  // Las reglas de los perfiles primero y las sueltas después: una regla suelta
  // con el mismo nombre ajusta la del perfil.
  const rules = new Map<string, RuleConfigEntry>();
  for (const profile of addon.profiles) {
    for (const rule of profile.rules) rules.set(rule.name, rule);
  }
  for (const rule of addon.rules) rules.set(rule.name, rule);

  return {
    name: addon.manifest.name,
    layers: addonLayers(addon),
    rules: [...rules.values()]
  };
}

/** El error de un addon con su nombre delante, para que se sepa cuál es. */
export function addonError(name: string, error: unknown): AddonError {
  if (error instanceof AddonError) {
    return new AddonError(`addons/${name}: ${error.message}`);
  }
  if (error instanceof ConfigError) {
    return new AddonError(`addons/${name}: ${error.message}`);
  }
  return new AddonError(`addons/${name}: ${(error as Error).message}`);
}

function rejectUnknown(
  value: Record<string, unknown>,
  known: readonly string[],
  path: string
): void {
  const allowed = new Set(known);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw new AddonError(
        `${path}: clave desconocida "${key}" (se admite: ${known.join(", ")})`
      );
    }
  }
}

function parsePathList(value: unknown, path: string): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new AddonError(`${path} debe ser una lista`);
  }
  return value.map((raw, index) => {
    const file = asString(raw, `${path}[${index}]`);
    if (file.startsWith("/") || /^[A-Za-z]:[\\/]/.test(file) || file.startsWith("\\")) {
      throw new AddonError(
        `${path}[${index}] debe ser relativo a la carpeta del addon: ${file}`
      );
    }
    if (file.split(/[\\/]/).includes("..")) {
      throw new AddonError(
        `${path}[${index}] no puede salirse de la carpeta del addon: ${file}`
      );
    }
    return file.replaceAll("\\", "/");
  });
}

function asObject(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new AddonError(`${path} debe ser un objeto`);
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new AddonError(`${path} debe ser un texto no vacío`);
  }
  return value.trim();
}

function optionalString(value: unknown, path: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  return asString(value, path);
}
