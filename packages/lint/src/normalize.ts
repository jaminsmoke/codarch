import path from "node:path";
import {
  LintError,
  canonicalLintPath,
  type LintFileResult,
  type LintMessage,
  type LintSeverity
} from "./format";

/**
 * Los normalizadores del lint (ADR 0094).
 *
 * Cada herramienta habla su dialecto: ESLint da una lista de ficheros con
 * severidades numéricas, oxlint diagnósticos con etiquetas, Biome categorías
 * como `lint/suspicious/noDoubleEquals` y Ruff hallazgos sin severidad. Aquí
 * se traducen todos al mismo mensaje, sin decidir nada del producto: el
 * artefacto y sus cuentas se construyen después con `createLintArtifact`.
 */

export interface NormalizeLintOptions {
  /**
   * Raíz del repo. Las rutas absolutas —ESLint las da así— se hacen relativas
   * a ella; las que caen fuera se descartan. Sin raíz, una ruta absoluta no
   * puede entrar en el artefacto.
   */
  root?: string;
}

/** El JSON de `eslint --format json`, que es una lista de ficheros. */
export function normalizeEslintJson(
  raw: unknown,
  options: NormalizeLintOptions = {}
): LintFileResult[] {
  if (!Array.isArray(raw)) {
    throw new LintError("el JSON de ESLint tiene que ser una lista de ficheros");
  }

  const files: LintFileResult[] = [];
  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    const filePath = relativeLintPath(entry.filePath, options.root);
    if (!filePath) continue;

    const messages: LintMessage[] = [];
    for (const item of Array.isArray(entry.messages) ? entry.messages : []) {
      if (!isRecord(item)) continue;
      const text = textOf(item.message);
      if (!text) continue;
      messages.push({
        rule: ruleName(item.ruleId, "(parser)"),
        severity: eslintSeverity(item.severity),
        ...positionOf(item.line, item.column),
        message: text
      });
    }
    files.push({ path: filePath, messages });
  }
  return files;
}

/**
 * El JSON de `oxlint --format json`.
 *
 * Oxlint envuelve los diagnósticos en `{ diagnostics }`; se acepta también la
 * lista suelta para no atarse a la envoltura de una versión.
 */
export function normalizeOxlintJson(
  raw: unknown,
  options: NormalizeLintOptions = {}
): LintFileResult[] {
  const list = Array.isArray(raw)
    ? raw
    : isRecord(raw) && Array.isArray(raw.diagnostics)
      ? raw.diagnostics
      : null;
  if (!list) {
    throw new LintError("el JSON de oxlint no trae diagnósticos");
  }

  const byPath = new Map<string, LintMessage[]>();
  for (const item of list) {
    if (!isRecord(item)) continue;
    const filePath = relativeLintPath(item.filename, options.root);
    if (!filePath) continue;
    const text = textOf(item.message);
    if (!text) continue;

    const label = Array.isArray(item.labels)
      ? item.labels.find((entry) => isRecord(entry))
      : undefined;
    const span = isRecord(label) ? label.span : undefined;

    const messages = byPath.get(filePath) ?? [];
    messages.push({
      rule: ruleName(item.code, "oxlint"),
      severity: oxlintSeverity(item.severity),
      ...(isRecord(span) ? positionOf(span.line, span.column) : {}),
      message: text
    });
    byPath.set(filePath, messages);
  }

  return [...byPath].map(([filePath, messages]) => ({
    path: filePath,
    messages
  }));
}

/**
 * El JSON de `biome lint --reporter=json`.
 *
 * Biome da diagnósticos con su categoría (`lint/suspicious/noDoubleEquals`),
 * una severidad de texto y la ruta del fichero, pero **no** línea ni columna:
 * su `span` son desplazamientos de bytes. Se deja sin posición en vez de
 * inventarla a partir del código fuente.
 */
export function normalizeBiomeJson(
  raw: unknown,
  options: NormalizeLintOptions = {}
): LintFileResult[] {
  const list = Array.isArray(raw)
    ? raw
    : isRecord(raw) && Array.isArray(raw.diagnostics)
      ? raw.diagnostics
      : null;
  if (!list) {
    throw new LintError("el JSON de Biome no trae diagnósticos");
  }

  const byPath = new Map<string, LintMessage[]>();
  for (const item of list) {
    if (!isRecord(item)) continue;
    const location = isRecord(item.location) ? item.location : null;
    const file = location && isRecord(location.path) ? location.path.file : null;
    const filePath = relativeLintPath(file, options.root);
    if (!filePath) continue;
    const text = biomeText(item);
    if (!text) continue;

    const messages = byPath.get(filePath) ?? [];
    messages.push({
      rule: biomeRule(item.category),
      severity: biomeSeverity(item.severity),
      message: text
    });
    byPath.set(filePath, messages);
  }

  return [...byPath].map(([filePath, messages]) => ({
    path: filePath,
    messages
  }));
}

/**
 * El JSON de `ruff check --output-format=json`.
 *
 * Ruff da una lista de hallazgos con su código (`F401`), la ruta y el sitio.
 * No lleva severidad en el JSON: todos sus hallazgos cuentan como error, que
 * es como los trata la propia herramienta al salir con código distinto de
 * cero.
 */
export function normalizeRuffJson(
  raw: unknown,
  options: NormalizeLintOptions = {}
): LintFileResult[] {
  if (!Array.isArray(raw)) {
    throw new LintError("el JSON de Ruff tiene que ser una lista de hallazgos");
  }

  const byPath = new Map<string, LintMessage[]>();
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const filePath = relativeLintPath(item.filename, options.root);
    if (!filePath) continue;
    const text = textOf(item.message);
    if (!text) continue;
    const location = isRecord(item.location) ? item.location : null;

    const messages = byPath.get(filePath) ?? [];
    messages.push({
      rule: ruleName(item.code, "ruff"),
      severity: "error",
      ...(location ? positionOf(location.row, location.column) : {}),
      message: text
    });
    byPath.set(filePath, messages);
  }

  return [...byPath].map(([filePath, messages]) => ({
    path: filePath,
    messages
  }));
}

/**
 * El XML de `checkstyle -c <config> -f xml`.
 *
 * Checkstyle escribe un `<file>` por fichero y dentro un `<error>` por hallazgo,
 * con la línea, la columna, la severidad y el nombre completo de la clase que
 * lo produce (`…checks.coding.EmptyStatementCheck`). Se lee el XML tal y como
 * lo escribe: no hay JSON que pedirle a su CLI.
 */
export function normalizeCheckstyleXml(
  xml: string,
  options: NormalizeLintOptions = {}
): LintFileResult[] {
  const files: LintFileResult[] = [];
  for (const block of xml.matchAll(/<file\b([^>]*)>([\s\S]*?)<\/file>/g)) {
    const filePath = relativeLintPath(
      parseXmlAttributes(block[1] ?? "").name,
      options.root
    );
    if (!filePath) continue;

    const messages: LintMessage[] = [];
    for (const error of (block[2] ?? "").matchAll(/<error\b([^>]*?)\/?>/g)) {
      const fields = parseXmlAttributes(error[1] ?? "");
      const severity = checkstyleSeverity(fields.severity);
      const text = fields.message ?? "";
      if (!severity || !text) continue;
      messages.push({
        rule: checkstyleRule(fields.source),
        severity,
        ...positionOf(Number(fields.line), Number(fields.column)),
        message: text
      });
    }
    files.push({ path: filePath, messages });
  }

  if (files.length === 0 && !xml.includes("<checkstyle")) {
    throw new LintError("la salida no es el XML de Checkstyle");
  }
  return files;
}

/**
 * El texto de `go vet ./...`: `./pkg/a.go:12:3: mensaje`.
 *
 * go vet no firma cada hallazgo con su analizador, así que entran todos como
 * `go vet`: inventar el nombre del analizador a partir del texto sería peor
 * que un hueco. Las cabeceras `# paquete` y los errores del propio comando no
 * son hallazgos.
 */
export function normalizeGoVetText(
  text: string,
  options: NormalizeLintOptions = {}
): LintFileResult[] {
  const byPath = new Map<string, LintMessage[]>();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith("vet:")) continue;
    const match = /^(.+?):(\d+):(?:(\d+):)?\s*(.+)$/.exec(line);
    if (!match) continue;
    const filePath = relativeLintPath(
      (match[1] ?? "").replace(/^\.\//, ""),
      options.root
    );
    if (!filePath) continue;

    const messages = byPath.get(filePath) ?? [];
    messages.push({
      rule: "go vet",
      severity: "error",
      ...positionOf(Number(match[2]), Number(match[3])),
      message: (match[4] ?? "").trim()
    });
    byPath.set(filePath, messages);
  }
  return [...byPath].map(([filePath, messages]) => ({
    path: filePath,
    messages
  }));
}

/**
 * El texto de los diagnósticos de MSBuild: `ruta(12,5): warning CA1822: mensaje [proyecto]`.
 *
 * Es lo que escribe `dotnet format` al verificar: el código del diagnóstico
 * (`CA1822`, `CS0168`) es la regla, y la severidad viene en la propia línea.
 * El `[proyecto]` del final no es parte del mensaje.
 */
export function normalizeDotnetText(
  text: string,
  options: NormalizeLintOptions = {}
): LintFileResult[] {
  const byPath = new Map<string, LintMessage[]>();
  for (const raw of text.split(/\r?\n/)) {
    const match =
      /^\s*(.+?)\((\d+),(\d+)\):\s*(warning|error)\s+([A-Za-z]+[0-9]+):\s*(.+)$/.exec(
        raw
      );
    if (!match) continue;
    const filePath = relativeLintPath(match[1], options.root);
    if (!filePath) continue;
    const message = (match[6] ?? "").replace(/\s*\[[^\]]+\]\s*$/, "").trim();
    if (!message) continue;

    const messages = byPath.get(filePath) ?? [];
    messages.push({
      rule: match[5] ?? "dotnet",
      severity: match[4] === "error" ? "error" : "warn",
      ...positionOf(Number(match[2]), Number(match[3])),
      message
    });
    byPath.set(filePath, messages);
  }
  return [...byPath].map(([filePath, messages]) => ({
    path: filePath,
    messages
  }));
}

/** La ruta relativa al repo, o `null` si no se puede escribir en el artefacto. */
function relativeLintPath(input: unknown, root?: string): string | null {
  const value = textOf(input);
  if (!value) return null;

  let relative = value;
  if (root && isAbsolutePath(value)) {
    relative = path.relative(root, value).split(path.sep).join("/");
  }
  try {
    return canonicalLintPath(relative);
  } catch {
    return null;
  }
}

function isAbsolutePath(value: string): boolean {
  return path.isAbsolute(value) || /^[A-Za-z]:[\\/]/.test(value);
}

/** La severidad de ESLint: 2 error, 1 aviso, 0 desactivada. */
function eslintSeverity(value: unknown): LintSeverity {
  if (value === 2) return "error";
  if (value === 1) return "warn";
  if (value === 0) return "info";
  return "warn";
}

/** La severidad de Biome; lo que no se reconoce cuenta como aviso. */
function biomeSeverity(value: unknown): LintSeverity {
  if (value === "fatal" || value === "error") return "error";
  if (value === "information" || value === "hint") return "info";
  return "warn";
}

/**
 * La regla de Biome sin el prefijo del producto.
 *
 * `lint/suspicious/noDoubleEquals` sale como `suspicious/noDoubleEquals`: el
 * grupo importa —la misma regla no significa lo mismo en `a11y` que en
 * `suspicious`— y el `lint/` solo dice de qué subsistema viene.
 */
function biomeRule(value: unknown): string {
  const text = textOf(value).replace(/^lint\//, "");
  return text || "biome";
}

/** El texto de un diagnóstico de Biome, que a veces viene como markup. */
function biomeText(item: Record<string, unknown>): string {
  const description = textOf(item.description);
  if (description) return description;
  if (Array.isArray(item.message)) {
    return item.message
      .map((node) => (isRecord(node) ? textOf(node.content) : ""))
      .join("")
      .trim();
  }
  return textOf(item.message);
}

/** La severidad de Checkstyle; `ignore` no entra. */
function checkstyleSeverity(value: string | undefined): LintSeverity | null {
  if (value === "error") return "error";
  if (value === "warning" || value === "warn") return "warn";
  if (value === "info") return "info";
  return null;
}

/**
 * La regla de Checkstyle: su clase, sin el `Check` del final.
 *
 * `com.puppycrawl.tools.checkstyle.checks.coding.EmptyStatementCheck` sale como
 * `EmptyStatement`, que es el nombre con el que su config declara el módulo.
 */
function checkstyleRule(value: string | undefined): string {
  const text = textOf(value);
  if (!text) return "checkstyle";
  const parts = text.split(".");
  const name = parts[parts.length - 1] ?? "";
  const stripped = name.replace(/Check$/, "");
  return stripped || name || "checkstyle";
}

/** Los atributos de una etiqueta XML, ya sin sus entidades. */
function parseXmlAttributes(text: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const match of text.matchAll(/([A-Za-z_:][\w:.-]*)\s*=\s*"([^"]*)"/g)) {
    const name = match[1];
    const value = match[2];
    if (name && value !== undefined) attributes[name] = unescapeXml(value);
  }
  return attributes;
}

function unescapeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code))
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(parseInt(code, 16))
    )
    .replace(/&amp;/g, "&");
}

/** La severidad de oxlint; lo que no se reconoce cuenta como aviso. */
function oxlintSeverity(value: unknown): LintSeverity {
  if (value === "error") return "error";
  if (value === "warning" || value === "warn") return "warn";
  if (value === "advice" || value === "info") return "info";
  return "warn";
}

/**
 * El nombre de la regla sin el envoltorio de la herramienta.
 *
 * Oxlint firma `eslint(no-debugger)` y ESLint `no-debugger`: la misma regla
 * tiene que agruparse igual en las dos. Un prefijo de plugin sin paréntesis
 * (`@typescript-eslint/no-unused-vars`) se queda como está.
 */
function ruleName(value: unknown, fallback: string): string {
  const text = textOf(value);
  if (!text) return fallback;
  const wrapped = /^[A-Za-z0-9_@/.-]+\((.+)\)$/.exec(text);
  return (wrapped?.[1] ?? text).trim() || fallback;
}

/** Línea y columna, solo si son enteros positivos. */
function positionOf(
  line: unknown,
  column: unknown
): { line?: number; column?: number } {
  const lineNumber = positiveInteger(line);
  const columnNumber = positiveInteger(column);
  return {
    ...(lineNumber !== undefined ? { line: lineNumber } : {}),
    ...(columnNumber !== undefined ? { column: columnNumber } : {})
  };
}

function positiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : undefined;
}

function textOf(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
