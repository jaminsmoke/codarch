import { parse as parseYaml } from "yaml";

/**
 * El alcance del análisis (ADR 0038).
 *
 * Vive fuera de `config.ts` para que el navegador pueda leer el `ignore` de un
 * `.codarch.yml` sin arrastrar `node:fs` al bundle.
 */

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export function asObject(
  value: unknown,
  path: string
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ConfigError(`${path} debe ser un objeto`);
  }
  return value as Record<string, unknown>;
}

export function asString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ConfigError(`${path} debe ser un texto no vacío`);
  }
  return value.trim();
}

/** Patrones de alcance: misma sintaxis que `.gitignore`, normalizados a `/`. */
export function parseIgnoreList(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new ConfigError("config.ignore debe ser una lista");
  }

  return value.map((raw, index) => {
    const pattern = asString(raw, `config.ignore[${index}]`)
      .replace(/\\/g, "/")
      .replace(/^\.\//, "");
    if (pattern === "") {
      throw new ConfigError(`config.ignore[${index}] no puede quedar vacío`);
    }
    return pattern;
  });
}

/**
 * Los patrones de un `.codarch.yml` ya parseado, sin resolver reglas ni addons.
 *
 * `codarch analyze` y `serve` solo necesitan saber qué ficheros recorrer; no
 * deben fallar porque un addon o una regla no estén cargados.
 */
export function parseIgnoreConfig(input: unknown): string[] {
  const root = asObject(input, "config");
  if (root.version !== 1) {
    throw new ConfigError("config.version debe ser 1");
  }
  return parseIgnoreList(root.ignore);
}

/** El mismo alcance, desde el texto YAML que lee el navegador. */
export function parseIgnoreYaml(text: string): string[] {
  let value: unknown;
  try {
    value = parseYaml(text);
  } catch (error) {
    throw new ConfigError(
      `YAML inválido: ${(error as Error).message}`
    );
  }
  return parseIgnoreConfig(value);
}
