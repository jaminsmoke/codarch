import fs from "node:fs";
import path from "node:path";
import { LintError } from "./format";
import { detectLintSystems } from "./project";

/**
 * La escritura de una regla en la config del proyecto (ADR 0111 · ADR 0112).
 *
 * La config del proyecto es la fuente de verdad. Oxlint es JSON; ESLint es
 * código y se toca con un bloque gestionado entre marcas, sin reescribir el
 * resto del fichero.
 */
export interface LintRuleChange {
  system: string;
  rule: string;
  /** `null` desactiva la regla; `error` o `warn` la activan. */
  severity: "error" | "warn" | null;
}

export interface LintRuleWrite {
  /** Ruta relativa de la config, con `/`. */
  path: string;
  before: string;
  after: string;
}

const RULE = /^[A-Za-z0-9@/._-]+$/;
const START = "// codarch:lint-rules:start";
const END = "// codarch:lint-rules:end";

export function writeLintRule(
  root: string,
  change: LintRuleChange
): LintRuleWrite {
  if (!RULE.test(change.rule)) {
    throw new LintError(`regla inválida: "${change.rule}"`);
  }
  if (change.system === "oxlint") return writeOxlintRule(root, change);
  if (change.system === "eslint") return writeEslintRule(root, change);
  throw new LintError(
    `la escritura de reglas todavía no soporta "${change.system}"`
  );
}

/** Activa o desactiva una regla de oxlint en el JSON del proyecto. */
function writeOxlintRule(
  root: string,
  change: LintRuleChange
): LintRuleWrite {
  const system = detectLintSystems(root).find((item) => item.name === "oxlint");
  if (!system?.config) {
    throw new LintError("oxlint no declara archivo de configuración");
  }
  if (!/\.json$/i.test(system.config)) {
    throw new LintError(
      `la config de oxlint (${system.config}) no es JSON editable`
    );
  }
  return writeJsonRule(root, system.config, change);
}

/**
 * Activa o desactiva una regla de ESLint.
 *
 * Un `.eslintrc.json` se edita como JSON. Un flat config de JS recibe un bloque
 * gestionado con las marcas de CodArch; si no existe, se inserta una vez.
 */
function writeEslintRule(
  root: string,
  change: LintRuleChange
): LintRuleWrite {
  const system = detectLintSystems(root).find((item) => item.name === "eslint");
  if (!system?.config) {
    throw new LintError("ESLint no declara archivo de configuración");
  }
  if (/\.json$/i.test(system.config)) {
    return writeJsonRule(root, system.config, change);
  }

  const file = path.join(root, system.config);
  const before = readConfig(file, system.config);
  const cleaned =
    change.severity === null
      ? removeExplicitRule(before, change.rule)
      : { text: before, removed: false };
  const overrides = readManagedRules(cleaned.text);
  if (change.severity === null) overrides.set(change.rule, "off");
  else overrides.set(change.rule, change.severity);

  const block = renderManagedBlock(overrides);
  const after = hasManagedBlock(cleaned.text)
    ? replaceManagedBlock(cleaned.text, block)
    : insertManagedBlock(cleaned.text, block);
  writeAtomic(file, after);
  return { path: system.config, before, after };
}

/**
 * Quita una regla escrita explícitamente en un `rules: { … }` del fichero.
 *
 * Es una retirada de texto conservadora: solo toca objetos literales y claves
 * simples. Si la regla viene de un preset o de un valor calculado no aparece
 * aquí y se cubre con el bloque.
 */
function removeExplicitRule(
  text: string,
  rule: string
): { text: string; removed: boolean } {
  let removed = false;
  let result = "";
  let last = 0;
  for (const object of rulesObjects(text)) {
    const property = findRuleProperty(text, object.open, object.close, rule);
    if (!property) continue;
    result += text.slice(last, property.start);
    last = property.end;
    removed = true;
  }
  if (!removed) return { text, removed: false };
  result += text.slice(last);
  return { text: result, removed: true };
}

interface RulesObject {
  open: number;
  close: number;
}

function rulesObjects(text: string): RulesObject[] {
  const objects: RulesObject[] = [];
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] as string;
    if (char === '"' || char === "'" || char === "`") {
      index = skipString(text, index);
      continue;
    }
    if (char === "/" && text[index + 1] === "/") {
      index = skipLineComment(text, index);
      continue;
    }
    if (char === "/" && text[index + 1] === "*") {
      index = skipBlockComment(text, index);
      continue;
    }
    if (
      text.startsWith("rules", index) &&
      !isWord(text[index - 1]) &&
      !isWord(text[index + 5])
    ) {
      let cursor = skipSpaceAndComments(text, index + 5);
      if (text[cursor] !== ":") continue;
      cursor = skipSpaceAndComments(text, cursor + 1);
      if (text[cursor] !== "{") continue;
      const close = matchingClose(text, cursor, "{", "}");
      objects.push({ open: cursor, close });
      index = close;
    }
  }
  return objects;
}

function findRuleProperty(
  text: string,
  open: number,
  close: number,
  rule: string
): { start: number; end: number } | null {
  let index = open + 1;
  while (index < close) {
    index = skipSpaceAndComments(text, index);
    if (text[index] === ",") {
      index += 1;
      continue;
    }
    if (text.startsWith("...", index)) {
      index = skipPropertyValue(text, index + 3, close);
      continue;
    }

    const start = index;
    let key: string | null = null;
    const char = text[index] as string;
    if (char === '"' || char === "'") {
      const end = skipString(text, index);
      key = text.slice(index + 1, end);
      index = end + 1;
    } else if (isWord(char) || char === "@") {
      while (index < close && (isWord(text[index]) || text[index] === "@")) {
        index += 1;
      }
      key = text.slice(start, index);
    }
    if (!key) {
      index = skipPropertyValue(text, index, close);
      continue;
    }

    index = skipSpaceAndComments(text, index);
    if (text[index] !== ":") {
      index = skipPropertyValue(text, index, close);
      continue;
    }
    index = skipSpaceAndComments(text, index + 1);
    const valueEnd = skipPropertyValue(text, index, close);
    if (key === rule) {
      const end =
        text[valueEnd] === "," ? valueEnd + 1 : valueEnd;
      return { start, end };
    }
    index = valueEnd;
  }
  return null;
}

/** Índice del final del valor: la coma de su nivel o el cierre del objeto. */
function skipPropertyValue(text: string, start: number, close: number): number {
  let depth = 0;
  for (let index = start; index < close; index += 1) {
    const char = text[index] as string;
    if (char === '"' || char === "'" || char === "`") {
      index = skipString(text, index);
      continue;
    }
    if (char === "/" && text[index + 1] === "/") {
      index = skipLineComment(text, index);
      continue;
    }
    if (char === "/" && text[index + 1] === "*") {
      index = skipBlockComment(text, index);
      continue;
    }
    if (char === "{" || char === "[" || char === "(") depth += 1;
    else if (char === "}" || char === "]" || char === ")") {
      if (depth === 0) return index;
      depth -= 1;
    } else if (char === "," && depth === 0) return index;
  }
  return close;
}

function skipSpaceAndComments(text: string, start: number): number {
  let index = start;
  while (index < text.length) {
    const char = text[index] as string;
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (char === "/" && text[index + 1] === "/") {
      index = skipLineComment(text, index) + 1;
      continue;
    }
    if (char === "/" && text[index + 1] === "*") {
      index = skipBlockComment(text, index) + 1;
      continue;
    }
    break;
  }
  return index;
}

function isWord(char: string | undefined): boolean {
  return typeof char === "string" && /[A-Za-z0-9_$]/.test(char);
}

/** El JSON de ESLint (`eslintrc.json`) o de oxlint. */
function writeJsonRule(
  root: string,
  relative: string,
  change: LintRuleChange
): LintRuleWrite {
  const file = path.join(root, relative);
  const before = readConfig(file, relative);
  let document: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(before);
    if (!isRecord(parsed)) throw new Error("no es un objeto");
    document = parsed;
  } catch (error) {
    throw new LintError(
      `${relative} no es un JSON válido: ${(error as Error).message}`
    );
  }

  const rules = isRecord(document.rules) ? { ...document.rules } : {};
  if (change.severity === null) {
    const explicit = Object.prototype.hasOwnProperty.call(rules, change.rule);
    if (explicit && !categoriesOn(document.categories)) delete rules[change.rule];
    else rules[change.rule] = "off";
  } else {
    rules[change.rule] = change.severity;
  }

  const after = `${JSON.stringify({ ...document, rules }, null, 2)}\n`;
  writeAtomic(file, after);
  return { path: relative, before, after };
}

function readConfig(file: string, relative: string): string {
  try {
    return fs.readFileSync(file, "utf8");
  } catch (error) {
    throw new LintError(
      `no se pudo leer ${relative}: ${(error as Error).message}`
    );
  }
}

/** Las reglas que ya gestiona CodArch dentro del bloque. */
function readManagedRules(text: string): Map<string, string> {
  const rules = new Map<string, string>();
  const block = managedBlock(text);
  if (!block) return rules;
  const inner = text.slice(block.start, block.end);
  for (const match of inner.matchAll(
    /["']([^"']+)["']\s*:\s*["'](off|warn|error)["']/g
  )) {
    rules.set(match[1] as string, match[2] as string);
  }
  return rules;
}

function managedBlock(text: string): { start: number; end: number } | null {
  const start = text.indexOf(START);
  const end = text.indexOf(END);
  if (start === -1 || end === -1 || end < start) return null;
  return { start, end };
}

function hasManagedBlock(text: string): boolean {
  return managedBlock(text) !== null;
}

function renderManagedBlock(rules: Map<string, string>): string {
  const entries = [...rules.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([id, severity]) => `"${id}": "${severity}"`)
    .join(", ");
  return [
    START,
    "// Gestionado por CodArch. No editar a mano.",
    `{ rules: { ${entries} } },`,
    END
  ].join("\n");
}

/** Sustituye el bloque entero, conservando la sangría de sus marcas. */
function replaceManagedBlock(text: string, block: string): string {
  const found = managedBlock(text);
  if (!found) return text;
  const lineStart = text.lastIndexOf("\n", found.start) + 1;
  const lineEnd = text.indexOf("\n", found.end + END.length);
  const indent = text.slice(lineStart, found.start);
  const rendered = block
    .split("\n")
    .map((line) => (line ? `${indent}${line}` : line))
    .join("\n");
  return `${text.slice(0, lineStart)}${rendered}${
    lineEnd === -1 ? "\n" : text.slice(lineEnd)
  }`;
}

/**
 * Inserta el bloque en el array exportado o como un argumento más de la
 * llamada que construye la config. No entiende un `export default { … }`.
 */
function insertManagedBlock(text: string, block: string): string {
  const exported = /export\s+default\s+/.exec(text);
  if (!exported) {
    throw new LintError("no se encontró `export default` en la config de ESLint");
  }

  let index = exported.index + exported[0].length;
  while (index < text.length && /\s/.test(text[index] as string)) index += 1;
  const rest = text.slice(index);

  let close: number;
  if (rest.startsWith("[")) {
    close = matchingClose(text, index, "[", "]");
  } else if (rest.startsWith("{")) {
    throw new LintError(
      "la config de ESLint exporta un objeto; no se puede añadir el bloque sin reescribirla"
    );
  } else {
    const open = text.indexOf("(", index);
    if (open === -1) {
      throw new LintError("no se encontró la llamada de la config de ESLint");
    }
    close = matchingClose(text, open, "(", ")");
  }

  const before = text.slice(0, close).trimEnd();
  const comma = before.endsWith("[") || before.endsWith("(") ? "" : ",";
  const rendered = block
    .split("\n")
    .map((line) => (line ? `  ${line}` : line))
    .join("\n");
  const head = text.slice(0, close);
  const trailing = head.match(/\s*$/)?.[0] ?? "";
  const body = head.slice(0, head.length - trailing.length);
  return `${body}${comma}\n${rendered}\n${text.slice(close)}`;
}

/** El cierre del corchete o paréntesis, saltando cadenas y comentarios. */
function matchingClose(
  text: string,
  openIndex: number,
  open: string,
  close: string
): number {
  let depth = 0;
  for (let index = openIndex; index < text.length; index += 1) {
    const char = text[index] as string;
    if (char === '"' || char === "'" || char === "`") {
      index = skipString(text, index);
      continue;
    }
    if (char === "/" && text[index + 1] === "/") {
      index = skipLineComment(text, index);
      continue;
    }
    if (char === "/" && text[index + 1] === "*") {
      index = skipBlockComment(text, index);
      continue;
    }
    if (char === open) depth += 1;
    else if (char === close) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  throw new LintError("la config de ESLint tiene los corchetes sin cerrar");
}

function skipString(text: string, start: number): number {
  const quote = text[start] as string;
  for (let index = start + 1; index < text.length; index += 1) {
    const char = text[index] as string;
    if (char === "\\") index += 1;
    else if (char === quote) return index;
  }
  throw new LintError("la config de ESLint tiene una cadena sin cerrar");
}

function skipLineComment(text: string, start: number): number {
  const end = text.indexOf("\n", start);
  return end === -1 ? text.length : end;
}

function skipBlockComment(text: string, start: number): number {
  const end = text.indexOf("*/", start + 2);
  if (end === -1) throw new LintError("la config de ESLint tiene un comentario sin cerrar");
  return end + 1;
}

/** Restaura el contenido anterior de una escritura, si se conserva. */
export function restoreLintRule(
  root: string,
  relative: string,
  before: string
): void {
  const file = path.join(root, relative);
  writeAtomic(file, before);
}

function writeAtomic(file: string, content: string): void {
  const temporary = `${file}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, content, "utf8");
    fs.renameSync(temporary, file);
  } catch (error) {
    try {
      fs.rmSync(temporary, { force: true });
    } catch {
      // El temporal es lo de menos; el error que importa es el de la escritura.
    }
    throw new LintError(
      `no se pudo escribir ${path.basename(file)}: ${(error as Error).message}`
    );
  }
}

/** Alguna categoría de oxlint enciende reglas además de `rules`. */
function categoriesOn(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return Object.values(value).some((entry) => {
    const first = Array.isArray(entry) ? entry[0] : entry;
    return first !== "off" && first !== "allow";
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
