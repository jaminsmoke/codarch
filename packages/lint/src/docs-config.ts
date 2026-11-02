import { parse as parseYaml } from "yaml";
import { LintError } from "./format";
import type { LintSeverity } from "./format";
import { DOC_RULES, type DocRule, type DocsRulesConfig } from "./rest";

/**
 * El bloque `docs:` de `.codarch.yml` (ADR 0105).
 *
 * Declara entradas, gemelas, frontmatter y severidades de las reglas del resto.
 * Sin bloque, o con listas vacías, las reglas quedan apagadas: un repo que no
 * pide avisos no los recibe. Un bloque mal formado sí es un error —igual que
 * `lint:`— y quien analiza no puede seguir con una configuración inventada.
 */

const DOC_RULE_IDS = new Set<string>(Object.values(DOC_RULES));
const SEVERITIES = new Set<LintSeverity>(["error", "warn", "info"]);
const DOCS_KEYS = new Set(["entries", "twins", "frontmatter", "severity"]);

/**
 * Valida el documento YAML y devuelve la configuración de docs.
 *
 * Sin bloque `docs:` devuelve un objeto vacío: todas las reglas quedan
 * apagadas. Un valor que no es un objeto, una clave desconocida o una pareja
 * sin `from`/`to` sí son errores.
 */
export function parseDocsConfig(input: unknown): DocsRulesConfig {
  if (input === null || input === undefined) return {};
  if (!isRecord(input)) {
    throw new LintError("el .codarch.yml tiene que ser un objeto");
  }

  const raw = input.docs;
  if (raw === undefined) return {};
  if (!isRecord(raw)) {
    throw new LintError("config.docs tiene que ser un objeto");
  }

  for (const key of Object.keys(raw)) {
    if (!DOCS_KEYS.has(key)) {
      throw new LintError(
        `config.docs lleva una clave desconocida: "${key}". Son entries, twins, frontmatter y severity.`
      );
    }
  }

  const config: DocsRulesConfig = {};

  if (raw.entries !== undefined) {
    config.entries = stringList(raw.entries, "config.docs.entries");
  }

  if (raw.twins !== undefined) {
    if (!Array.isArray(raw.twins)) {
      throw new LintError("config.docs.twins tiene que ser una lista");
    }
    config.twins = raw.twins.map((entry, index) => {
      if (!isRecord(entry)) {
        throw new LintError(
          `config.docs.twins[${index}] tiene que ser un objeto`
        );
      }
      const from = text(entry.from);
      const to = text(entry.to);
      if (!from) {
        throw new LintError(`config.docs.twins[${index}] no lleva from`);
      }
      if (!to) {
        throw new LintError(`config.docs.twins[${index}] no lleva to`);
      }
      for (const key of Object.keys(entry)) {
        if (key !== "from" && key !== "to") {
          throw new LintError(
            `config.docs.twins[${index}] lleva una clave desconocida: "${key}"`
          );
        }
      }
      return { from, to };
    });
  }

  if (raw.frontmatter !== undefined) {
    if (!Array.isArray(raw.frontmatter)) {
      throw new LintError("config.docs.frontmatter tiene que ser una lista");
    }
    config.frontmatter = raw.frontmatter.map((entry, index) => {
      if (!isRecord(entry)) {
        throw new LintError(
          `config.docs.frontmatter[${index}] tiene que ser un objeto`
        );
      }
      const files = text(entry.files);
      if (!files) {
        throw new LintError(
          `config.docs.frontmatter[${index}] no lleva files`
        );
      }
      if (entry.required === undefined) {
        throw new LintError(
          `config.docs.frontmatter[${index}] no lleva required`
        );
      }
      const required = stringList(
        entry.required,
        `config.docs.frontmatter[${index}].required`
      );
      for (const key of Object.keys(entry)) {
        if (key !== "files" && key !== "required") {
          throw new LintError(
            `config.docs.frontmatter[${index}] lleva una clave desconocida: "${key}"`
          );
        }
      }
      return { files, required };
    });
  }

  if (raw.severity !== undefined) {
    if (!isRecord(raw.severity)) {
      throw new LintError("config.docs.severity tiene que ser un objeto");
    }
    const severity: Partial<Record<DocRule, LintSeverity>> = {};
    for (const [rule, value] of Object.entries(raw.severity)) {
      if (!DOC_RULE_IDS.has(rule)) {
        throw new LintError(
          `config.docs.severity lleva una regla desconocida: "${rule}"`
        );
      }
      if (typeof value !== "string" || !SEVERITIES.has(value as LintSeverity)) {
        throw new LintError(
          `config.docs.severity["${rule}"] tiene que ser error, warn o info`
        );
      }
      severity[rule as DocRule] = value as LintSeverity;
    }
    config.severity = severity;
  }

  return config;
}

/** El mismo bloque, desde el texto YAML que lee el navegador. */
export function parseDocsYaml(textValue: string): DocsRulesConfig {
  let document: unknown;
  try {
    document = parseYaml(textValue);
  } catch (cause) {
    throw new LintError(`YAML inválido: ${(cause as Error).message}`);
  }
  return parseDocsConfig(document);
}

function stringList(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) {
    throw new LintError(`${path} tiene que ser una lista`);
  }
  return value.map((entry, index) => {
    const item = text(entry);
    if (!item) {
      throw new LintError(`${path}[${index}] tiene que ser un texto no vacío`);
    }
    return item;
  });
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
