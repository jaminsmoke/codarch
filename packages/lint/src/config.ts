import fs from "node:fs";
import { parse } from "yaml";
import { LintError } from "./format";

/**
 * El bloque `lint:` de `.codarch.yml` (ADR 0094).
 *
 * Es lo que declara el repo, no lo que trae CodArch: qué herramientas corren,
 * con qué comando y en qué dialecto hablan. La app no lo lee; solo lee el
 * artefacto que produce este bloque.
 */

/** Los dialectos que el normalizador sabe leer. */
export const LINT_FORMATS = ["eslint-json", "oxlint-json"] as const;

export type LintFormat = (typeof LINT_FORMATS)[number];

export interface LintTool {
  /** El nombre que va al artefacto y a los avisos. */
  name: string;
  /** El comando completo, tal y como se lanza en la raíz del repo. */
  command: string;
  format: LintFormat;
}

/**
 * Valida el documento YAML y devuelve sus herramientas.
 *
 * Sin bloque `lint:` devuelve una lista vacía: el repo no linta, y quien llama
 * decide si eso es un error. Un bloque mal formado sí es un error: una
 * herramienta sin comando o con un formato desconocido no se puede adivinar.
 */
export function parseLintConfig(input: unknown): LintTool[] {
  if (input === null || input === undefined) return [];
  if (!isRecord(input)) {
    throw new LintError("el .codarch.yml tiene que ser un objeto");
  }

  const raw = input.lint;
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    throw new LintError("config.lint tiene que ser una lista");
  }

  const tools: LintTool[] = [];
  const names = new Set<string>();
  raw.forEach((entry, index) => {
    if (!isRecord(entry)) {
      throw new LintError(`config.lint[${index}] tiene que ser un objeto`);
    }
    const name = text(entry.name);
    if (!name) {
      throw new LintError(`config.lint[${index}] no lleva name`);
    }
    if (names.has(name)) {
      throw new LintError(`config.lint repite la herramienta "${name}"`);
    }
    const command = text(entry.command);
    if (!command) {
      throw new LintError(`config.lint[${index}] (${name}) no lleva command`);
    }
    const format = entry.format;
    if (!isFormat(format)) {
      throw new LintError(
        `config.lint[${index}] (${name}) lleva un format desconocido: "${String(
          format
        )}". Son ${LINT_FORMATS.join(" y ")}.`
      );
    }
    names.add(name);
    tools.push({ name, command, format });
  });
  return tools;
}

/** Lee el `.codarch.yml` de una ruta y devuelve sus herramientas. */
export function loadLintConfig(file: string): LintTool[] {
  let textValue: string;
  try {
    textValue = fs.readFileSync(file, "utf8");
  } catch (cause) {
    throw new LintError(`no se pudo leer ${file}: ${(cause as Error).message}`);
  }

  let document: unknown;
  try {
    document = parse(textValue);
  } catch (cause) {
    throw new LintError(
      `configuración inválida en ${file}: ${(cause as Error).message}`
    );
  }
  return parseLintConfig(document);
}

function isFormat(value: unknown): value is LintFormat {
  return (
    typeof value === "string" &&
    (LINT_FORMATS as readonly string[]).includes(value)
  );
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
