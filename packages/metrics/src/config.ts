import fs from "node:fs";
import { CONFIG_VERSION } from "@codarch/versions";
import { parse as parseYaml } from "yaml";
import { findDomainProfile, domainProfileIds, type DomainProfile } from "./profiles";
import {
  ConfigError,
  asObject,
  asString,
  parseIgnoreConfig,
  parseIgnoreList
} from "./scope";

export type Severity = "info" | "warn" | "error";

export interface LayerConfig {
  name: string;
  /** Patrones glob relativos al root del proyecto. */
  patterns: string[];
}

export interface ForbiddenRuleConfig {
  type: "forbidden";
  name: string;
  from: string;
  to: string;
  severity: Severity;
  message?: string;
  /** De dónde sale la regla. */
  source?: RuleSource;
}

export interface ThresholdRuleConfig {
  type: "threshold";
  name: string;
  metric: string;
  min?: number;
  max?: number;
  severity: Severity;
  message?: string;
  /** De dónde sale la regla. */
  source?: RuleSource;
}

export interface CyclesRuleConfig {
  type: "cycles";
  name: string;
  severity: Severity;
  message?: string;
  /** De dónde sale la regla. */
  source?: RuleSource;
}

export type RuleConfigEntry =
  | ForbiddenRuleConfig
  | ThresholdRuleConfig
  | CyclesRuleConfig;

/**
 * De dónde sale una regla.
 *
 * `config` es el equipo, `profile` el perfil que elige el equipo y
 * `addon:<nombre>` un addon del repo (ADR 0029).
 */
export type RuleSource = "config" | "profile" | `addon:${string}`;

/**
 * Un addon ya cargado, con lo que aporta al análisis.
 *
 * Se pasa como piezas neutras (capas y reglas) para que este paquete no sepa
 * qué es un addon: quien los lee es `@codarch/addons`.
 */
export interface RuleConfigAddon {
  /** El nombre del addon: entra en el `source` de sus reglas. */
  name: string;
  layers: LayerConfig[];
  rules: RuleConfigEntry[];
}

export interface RuleConfig {
  version: typeof CONFIG_VERSION;
  /** Perfil del catálogo que se ha aplicado, si hubo alguno. */
  profile: string | null;
  /** Los addons que aportaron algo, en el orden en que se declaran. */
  addons: string[];
  layers: LayerConfig[];
  rules: RuleConfigEntry[];
  /** Patrones de exclusión del análisis, con sintaxis de `.gitignore`. */
  ignore: string[];
}

const SEVERITIES = new Set<Severity>(["info", "warn", "error"]);

/**
 * Valida y normaliza `.codarch.yml`. No depende del filesystem: sirve para
 * tests y para configuraciones inline.
 *
 * Si el archivo elige un `profile` del catálogo, sus capas y sus reglas se
 * añaden a las del equipo. Las del perfil entran **como aviso** (`warn`): son
 * una consulta hasta que el equipo las sube a `error` (ADR 0023).
 */
export function parseRuleConfig(
  input: unknown,
  available: readonly RuleConfigAddon[] = []
): RuleConfig {
  const root = asObject(input, "config");
  if (root.version !== CONFIG_VERSION) {
    throw new ConfigError(`config.version debe ser ${CONFIG_VERSION}`);
  }

  const own = parseInlineProfiles(root.profiles);
  const profile = parseProfile(root.profile, own);
  const profileSeverity = parseProfileSeverity(root.profile_severity);
  const addons = resolveAddons(root.addons, available);
  const layers = mergeLayers(profile, addons, parseLayerList(root.layers));
  const layerNames = new Set(layers.map((layer) => layer.name));
  const rules = mergeRules(
    profile,
    profileSeverity,
    addons,
    parseRuleList(root.rules, layerNames),
    layerNames
  );

  return {
    version: CONFIG_VERSION,
    profile: profile?.id ?? null,
    addons: addons.map((addon) => addon.name),
    layers,
    rules,
    ignore: parseIgnoreList(root.ignore)
  };
}

/** El nombre de un addon: minúsculas, números y guiones. */
export const ADDON_NAME = /^[a-z0-9][a-z0-9-]*$/;

/** Los addons que declara el equipo, en orden. */
function parseAddonNames(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new ConfigError("config.addons debe ser una lista");
  }

  const names: string[] = [];
  value.forEach((raw, index) => {
    const name = asString(raw, `config.addons[${index}]`);
    if (!ADDON_NAME.test(name)) {
      throw new ConfigError(
        `config.addons[${index}] no es un nombre de addon: ${name}`
      );
    }
    if (names.includes(name)) {
      throw new ConfigError(`addon repetido: ${name}`);
    }
    names.push(name);
  });
  return names;
}

/**
 * Los addons declarados, ya cargados.
 *
 * Un addon declarado que no está en `addons/` es un error: callar dejaría el
 * análisis sin las reglas que el repo cree tener.
 */
function resolveAddons(
  value: unknown,
  available: readonly RuleConfigAddon[]
): RuleConfigAddon[] {
  return parseAddonNames(value).map((name) => {
    const addon = available.find((entry) => entry.name === name);
    if (!addon) {
      const known = available.map((entry) => entry.name).join(", ") || "ninguno";
      throw new ConfigError(
        `config.addons: no se encontró "${name}" en addons/ (hay: ${known})`
      );
    }
    return addon;
  });
}

/**
 * Los perfiles que define el propio equipo, en el archivo de reglas.
 *
 * Un perfil propio tiene la misma forma que los del catálogo: capas y reglas.
 * Se escribe para reutilizar unas convenciones que no son de nadie más.
 */
function parseInlineProfiles(value: unknown): Map<string, DomainProfile> {
  const profiles = new Map<string, DomainProfile>();
  if (value === undefined || value === null) return profiles;
  if (!Array.isArray(value)) {
    throw new ConfigError("config.profiles debe ser una lista");
  }

  value.forEach((raw, index) => {
    const profile = parseProfileEntry(raw, `config.profiles[${index}]`);
    if (profiles.has(profile.id)) {
      throw new ConfigError(`perfil duplicado: ${profile.id}`);
    }
    profiles.set(profile.id, {
      ...profile,
      // El `when` de un perfil propio no lo elige nadie en un catálogo: se dice.
      when:
        profile.when || "Perfil propio del equipo, definido en el archivo de reglas."
    });
  });

  return profiles;
}

/**
 * Un perfil escrito como datos: capas y reglas.
 *
 * Es el mismo dialecto en el catálogo, en `.codarch.yml` y en un addon
 * (ADR 0029), así que se valida en un solo sitio. `when` es opcional porque
 * solo tiene sentido cuando alguien **elige** el perfil de una lista.
 */
export function parseProfileEntry(value: unknown, path: string): DomainProfile {
  const entry = asObject(value, path);
  const id = asString(entry.id, `${path}.id`);
  const title = asString(entry.title, `${path}.title`);
  const description =
    entry.description === undefined
      ? ""
      : asString(entry.description, `${path}.description`);
  const when =
    entry.when === undefined ? "" : asString(entry.when, `${path}.when`);

  const layers = parseLayerList(entry.layers, `${path}.layers`);
  if (layers.length === 0) {
    throw new ConfigError(`${path} necesita al menos una capa`);
  }

  const layerNames = new Set(layers.map((layer) => layer.name));
  const rules = parseRuleList(entry.rules, layerNames, `${path}.rules`).filter(
    (rule): rule is ForbiddenRuleConfig => rule.type === "forbidden"
  );

  return { id, title, description, when, layers, rules };
}

/**
 * El perfil elegido: del equipo si lo define, del catálogo si no.
 */
function parseProfile(
  value: unknown,
  own: Map<string, DomainProfile>
): DomainProfile | null {
  if (value === undefined || value === null) return null;
  const id = asString(value, "config.profile");
  const profile = own.get(id) ?? findDomainProfile(id);
  if (!profile) {
    const available = [...own.keys(), ...domainProfileIds()].join(", ");
    throw new ConfigError(
      `config.profile desconocido: ${id}. Disponibles: ${available}`
    );
  }
  return profile;
}

/**
 * La severidad de las reglas del perfil.
 *
 * Por defecto son avisos: consultan, no bloquean. Subirlas a `error` es la
 * decisión del equipo cuando el código está preparado (ADR 0023).
 */
function parseProfileSeverity(value: unknown): Severity {
  if (value === undefined || value === null) return "warn";
  if (typeof value !== "string" || !SEVERITIES.has(value as Severity)) {
    throw new ConfigError(
      "config.profile_severity debe ser info, warn o error"
    );
  }
  return value as Severity;
}

/** Las capas: del perfil, luego los addons en orden, y el equipo al final. */
function mergeLayers(
  profile: DomainProfile | null,
  addons: readonly RuleConfigAddon[],
  own: LayerConfig[]
): LayerConfig[] {
  const layers = new Map<string, LayerConfig>();
  for (const layer of profile?.layers ?? []) layers.set(layer.name, layer);
  for (const addon of addons) {
    for (const layer of addon.layers) layers.set(layer.name, layer);
  }
  for (const layer of own) layers.set(layer.name, layer);
  return [...layers.values()];
}

/**
 * Las reglas de todas las fuentes juntas.
 *
 * Manda el equipo, luego el último addon declarado, luego los addons
 * anteriores y por último el perfil (ADR 0029). Una regla con el mismo nombre
 * sustituye a la anterior, y así el equipo puede subir una regla de `warn` a
 * `error` sin tocar el addon.
 */
function mergeRules(
  profile: DomainProfile | null,
  profileSeverity: Severity,
  addons: readonly RuleConfigAddon[],
  own: RuleConfigEntry[],
  layerNames: Set<string>
): RuleConfigEntry[] {
  const rules = new Map<string, RuleConfigEntry>();
  for (const rule of profile?.rules ?? []) {
    rules.set(rule.name, {
      ...rule,
      severity: profileSeverity,
      source: "profile"
    });
  }
  for (const addon of addons) {
    for (const rule of addon.rules) {
      rules.set(rule.name, { ...rule, source: `addon:${addon.name}` });
    }
  }
  for (const rule of own) {
    rules.set(rule.name, { ...rule, source: "config" });
  }

  // Una regla de fuera puede apuntar a una capa que el equipo sustituyó por
  // otra: si la capa ya no existe, la regla no aplica y se avisa.
  for (const rule of rules.values()) {
    if (rule.type !== "forbidden") continue;
    if (layerNames.has(rule.from) && layerNames.has(rule.to)) continue;
    if (rule.source === "profile") {
      throw new ConfigError(
        `la regla "${rule.name}" del perfil apunta a una capa que no existe: ${rule.from} → ${rule.to}`
      );
    }
    if (rule.source?.startsWith("addon:")) {
      throw new ConfigError(
        `la regla "${rule.name}" del addon ${rule.source.slice("addon:".length)} apunta a una capa que no existe: ${rule.from} → ${rule.to}`
      );
    }
  }

  return [...rules.values()];
}

/**
 * Lee un `.codarch.yml` del disco.
 *
 * `available` son los addons ya cargados de `addons/` (ADR 0029): el archivo
 * dice **cuáles** usa, y aquí se resuelven por nombre.
 */
export function loadRuleConfig(
  file: string,
  available: readonly RuleConfigAddon[] = []
): RuleConfig {
  return withFile(file, (value) => parseRuleConfig(value, available));
}

/** Solo el alcance: para quien analiza antes de tener reglas o addons. */
export function loadIgnoreConfig(file: string): string[] {
  return withFile(file, parseIgnoreConfig);
}

function withFile<T>(file: string, read: (value: unknown) => T): T {
  let text: string;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch (error) {
    throw new ConfigError(
      `no se pudo leer ${file}: ${(error as Error).message}`
    );
  }

  let value: unknown;
  try {
    value = parseYaml(text);
  } catch (error) {
    throw new ConfigError(
      `YAML inválido en ${file}: ${(error as Error).message}`
    );
  }

  try {
    return read(value);
  } catch (error) {
    if (error instanceof ConfigError) {
      throw new ConfigError(`${file}: ${error.message}`);
    }
    throw error;
  }
}

export function parseLayerList(
  value: unknown,
  path = "config.layers"
): LayerConfig[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new ConfigError(`${path} debe ser una lista`);
  }

  const layers: LayerConfig[] = [];
  const names = new Set<string>();

  value.forEach((raw, index) => {
    const layer = asObject(raw, `${path}[${index}]`);
    const name = asString(layer.name, `${path}[${index}].name`);
    if (names.has(name)) {
      throw new ConfigError(`capa duplicada: ${name}`);
    }
    names.add(name);

    if (layer.patterns !== undefined && layer.paths !== undefined) {
      throw new ConfigError(
        `${path}[${index}] no puede tener patterns y paths a la vez`
      );
    }
    const rawPatterns = layer.patterns ?? layer.paths;
    if (!Array.isArray(rawPatterns) || rawPatterns.length === 0) {
      throw new ConfigError(
        `${path}[${index}].patterns debe ser una lista no vacía`
      );
    }

    const patterns = rawPatterns.map((rawPattern, patternIndex) => {
      const pattern = asString(
        rawPattern,
        `${path}[${index}].patterns[${patternIndex}]`
      )
        .replaceAll("\\", "/")
        .replace(/^\.\//, "");
      if (pattern.startsWith("/") || /^[A-Za-z]:\//.test(pattern)) {
        throw new ConfigError(
          `el patrón "${pattern}" debe ser relativo al root del proyecto`
        );
      }
      return pattern;
    });

    layers.push({ name, patterns });
  });

  return layers;
}

export function parseRuleList(
  value: unknown,
  layerNames: Set<string>,
  path = "config.rules"
): RuleConfigEntry[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new ConfigError(`${path} debe ser una lista`);
  }

  const rules: RuleConfigEntry[] = [];
  const names = new Set<string>();

  value.forEach((raw, index) => {
    const at = `${path}[${index}]`;
    const rule = asObject(raw, at);
    const name = asString(rule.name, `${at}.name`);
    if (names.has(name)) {
      throw new ConfigError(`regla duplicada: ${name}`);
    }
    names.add(name);

    const type = asString(rule.type, `${at}.type`);
    const severity = parseSeverity(rule.severity, `${at}.severity`);
    const message =
      rule.message === undefined
        ? undefined
        : asString(rule.message, `${at}.message`);

    if (type === "forbidden") {
      const from = asString(rule.from, `${at}.from`);
      const to = asString(rule.to, `${at}.to`);
      if (!layerNames.has(from)) {
        throw new ConfigError(`${at}.from apunta a una capa inexistente: ${from}`);
      }
      if (!layerNames.has(to)) {
        throw new ConfigError(`${at}.to apunta a una capa inexistente: ${to}`);
      }
      rules.push({ type, name, from, to, severity, message });
      return;
    }

    if (type === "threshold") {
      const metric = asString(rule.metric, `${at}.metric`);
      const min = optionalNumber(rule.min, `${at}.min`);
      const max = optionalNumber(rule.max, `${at}.max`);
      if (min === undefined && max === undefined) {
        throw new ConfigError(`${at} necesita min o max`);
      }
      if (min !== undefined && max !== undefined && min > max) {
        throw new ConfigError(`${at}: min no puede ser mayor que max`);
      }
      rules.push({ type, name, metric, min, max, severity, message });
      return;
    }

    if (type === "cycles") {
      rules.push({ type, name, severity, message });
      return;
    }

    throw new ConfigError(`${at}.type desconocido: ${type}`);
  });

  return rules;
}

function parseSeverity(value: unknown, path: string): Severity {
  if (value === undefined) return "error";
  if (typeof value !== "string" || !SEVERITIES.has(value as Severity)) {
    throw new ConfigError(`${path} debe ser info, warn o error`);
  }
  return value as Severity;
}

function optionalNumber(value: unknown, path: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ConfigError(`${path} debe ser un número`);
  }
  return value;
}
