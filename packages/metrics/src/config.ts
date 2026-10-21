import fs from "node:fs";
import { parse as parseYaml } from "yaml";
import { findDomainProfile, domainProfileIds, type DomainProfile } from "./profiles";

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

/** De dónde sale una regla: escrita por el equipo o traída por un perfil. */
export type RuleSource = "config" | "profile";

export interface RuleConfig {
  version: 1;
  /** Perfil del catálogo que se ha aplicado, si hubo alguno. */
  profile: string | null;
  layers: LayerConfig[];
  rules: RuleConfigEntry[];
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
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
export function parseRuleConfig(input: unknown): RuleConfig {
  const root = asObject(input, "config");
  if (root.version !== 1) {
    throw new ConfigError("config.version debe ser 1");
  }

  const own = parseInlineProfiles(root.profiles);
  const profile = parseProfile(root.profile, own);
  const profileSeverity = parseProfileSeverity(root.profile_severity);
  const layers = mergeLayers(profile, parseLayers(root.layers));
  const layerNames = new Set(layers.map((layer) => layer.name));
  const rules = mergeRules(
    profile,
    profileSeverity,
    parseRules(root.rules, layerNames),
    layerNames
  );

  return { version: 1, profile: profile?.id ?? null, layers, rules };
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
    const entry = asObject(raw, `config.profiles[${index}]`);
    const id = asString(entry.id, `config.profiles[${index}].id`);
    const title = asString(entry.title, `config.profiles[${index}].title`);
    const description =
      entry.description === undefined
        ? ""
        : asString(entry.description, `config.profiles[${index}].description`);

    const layers = parseLayers(entry.layers).map((layer) => ({
      name: layer.name,
      patterns: layer.patterns
    }));
    if (layers.length === 0) {
      throw new ConfigError(
        `config.profiles[${index}] necesita al menos una capa`
      );
    }
    const layerNames = new Set(layers.map((layer) => layer.name));
    const rules = parseRules(entry.rules, layerNames).filter(
      (rule): rule is ForbiddenRuleConfig => rule.type === "forbidden"
    );

    profiles.set(id, {
      id,
      title,
      description,
      when: `Perfil propio del equipo, definido en ${"el archivo de reglas"}.`,
      layers,
      rules
    });
  });

  return profiles;
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

/** Las capas del perfil primero; las del equipo sustituyen a las de su nombre. */
function mergeLayers(
  profile: DomainProfile | null,
  own: LayerConfig[]
): LayerConfig[] {
  const layers = new Map<string, LayerConfig>();
  for (const layer of profile?.layers ?? []) layers.set(layer.name, layer);
  for (const layer of own) layers.set(layer.name, layer);
  return [...layers.values()];
}

/**
 * Las reglas del perfil y las del equipo juntas.
 *
 * Una regla del equipo con el mismo nombre sustituye a la del perfil, y así
 * puede subirla de `warn` a `error` sin tocar el catálogo.
 */
function mergeRules(
  profile: DomainProfile | null,
  profileSeverity: Severity,
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
  for (const rule of own) {
    rules.set(rule.name, { ...rule, source: "config" });
  }

  // Una regla del perfil puede apuntar a una capa que el equipo sustituyó por
  // otra: si la capa ya no existe, la regla no aplica y se avisa.
  for (const rule of rules.values()) {
    if (rule.type !== "forbidden") continue;
    if (layerNames.has(rule.from) && layerNames.has(rule.to)) continue;
    if (rule.source === "profile") {
      throw new ConfigError(
        `la regla "${rule.name}" del perfil apunta a una capa que no existe: ${rule.from} → ${rule.to}`
      );
    }
  }

  return [...rules.values()];
}

export function loadRuleConfig(file: string): RuleConfig {
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
    return parseRuleConfig(value);
  } catch (error) {
    if (error instanceof ConfigError) {
      throw new ConfigError(`${file}: ${error.message}`);
    }
    throw error;
  }
}

function parseLayers(value: unknown): LayerConfig[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new ConfigError("config.layers debe ser una lista");
  }

  const layers: LayerConfig[] = [];
  const names = new Set<string>();

  value.forEach((raw, index) => {
    const layer = asObject(raw, `config.layers[${index}]`);
    const name = asString(layer.name, `config.layers[${index}].name`);
    if (names.has(name)) {
      throw new ConfigError(`capa duplicada: ${name}`);
    }
    names.add(name);

    if (layer.patterns !== undefined && layer.paths !== undefined) {
      throw new ConfigError(
        `config.layers[${index}] no puede tener patterns y paths a la vez`
      );
    }
    const rawPatterns = layer.patterns ?? layer.paths;
    if (!Array.isArray(rawPatterns) || rawPatterns.length === 0) {
      throw new ConfigError(
        `config.layers[${index}].patterns debe ser una lista no vacía`
      );
    }

    const patterns = rawPatterns.map((rawPattern, patternIndex) => {
      const pattern = asString(
        rawPattern,
        `config.layers[${index}].patterns[${patternIndex}]`
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

function parseRules(
  value: unknown,
  layerNames: Set<string>
): RuleConfigEntry[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new ConfigError("config.rules debe ser una lista");
  }

  const rules: RuleConfigEntry[] = [];
  const names = new Set<string>();

  value.forEach((raw, index) => {
    const rule = asObject(raw, `config.rules[${index}]`);
    const name = asString(rule.name, `config.rules[${index}].name`);
    if (names.has(name)) {
      throw new ConfigError(`regla duplicada: ${name}`);
    }
    names.add(name);

    const type = asString(rule.type, `config.rules[${index}].type`);
    const severity = parseSeverity(
      rule.severity,
      `config.rules[${index}].severity`
    );
    const message =
      rule.message === undefined
        ? undefined
        : asString(rule.message, `config.rules[${index}].message`);

    if (type === "forbidden") {
      const from = asString(rule.from, `config.rules[${index}].from`);
      const to = asString(rule.to, `config.rules[${index}].to`);
      if (!layerNames.has(from)) {
        throw new ConfigError(
          `config.rules[${index}].from apunta a una capa inexistente: ${from}`
        );
      }
      if (!layerNames.has(to)) {
        throw new ConfigError(
          `config.rules[${index}].to apunta a una capa inexistente: ${to}`
        );
      }
      rules.push({ type, name, from, to, severity, message });
      return;
    }

    if (type === "threshold") {
      const metric = asString(
        rule.metric,
        `config.rules[${index}].metric`
      );
      const min = optionalNumber(rule.min, `config.rules[${index}].min`);
      const max = optionalNumber(rule.max, `config.rules[${index}].max`);
      if (min === undefined && max === undefined) {
        throw new ConfigError(
          `config.rules[${index}] necesita min o max`
        );
      }
      if (min !== undefined && max !== undefined && min > max) {
        throw new ConfigError(
          `config.rules[${index}]: min no puede ser mayor que max`
        );
      }
      rules.push({ type, name, metric, min, max, severity, message });
      return;
    }

    if (type === "cycles") {
      rules.push({ type, name, severity, message });
      return;
    }

    throw new ConfigError(
      `config.rules[${index}].type desconocido: ${type}`
    );
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

function asObject(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ConfigError(`${path} debe ser un objeto`);
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ConfigError(`${path} debe ser un texto no vacío`);
  }
  return value.trim();
}
