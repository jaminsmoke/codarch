import fs from "node:fs";
import { parse as parseYaml } from "yaml";

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
}

export interface ThresholdRuleConfig {
  type: "threshold";
  name: string;
  metric: string;
  min?: number;
  max?: number;
  severity: Severity;
  message?: string;
}

export interface CyclesRuleConfig {
  type: "cycles";
  name: string;
  severity: Severity;
  message?: string;
}

export type RuleConfigEntry =
  | ForbiddenRuleConfig
  | ThresholdRuleConfig
  | CyclesRuleConfig;

export interface RuleConfig {
  version: 1;
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
 */
export function parseRuleConfig(input: unknown): RuleConfig {
  const root = asObject(input, "config");
  if (root.version !== 1) {
    throw new ConfigError("config.version debe ser 1");
  }

  const layers = parseLayers(root.layers);
  const layerNames = new Set(layers.map((layer) => layer.name));
  const rules = parseRules(root.rules, layerNames);

  return { version: 1, layers, rules };
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
