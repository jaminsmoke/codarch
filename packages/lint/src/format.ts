import { md5Hex, stableStringify } from "@codarch/schema/browser";

/**
 * El artefacto del lint (ADR 0094).
 *
 * Es un fichero aparte de `cc.json` a propósito: el lint depende de las
 * herramientas instaladas y de su configuración, y el checksum del código no
 * puede depender de eso. Aquí solo hay datos ya normalizados, sin rutas
 * absolutas, sin timestamps y ordenados: dos pasadas iguales dan el mismo
 * fichero.
 *
 * Que el artefacto exista significa que el lint se midió, aunque no hubiera ni
 * un mensaje. Sin artefacto no es «limpio»: es «no medido», y la app lo dice.
 */

/** La versión del formato del artefacto. */
export const LINT_ARTIFACT_VERSION = "1.0";

export type LintSeverity = "error" | "warn" | "info";

/** Un mensaje de una herramienta, ya normalizado. */
export interface LintMessage {
  /** El nombre de la regla, sin el envoltorio de la herramienta. */
  rule: string;
  severity: LintSeverity;
  /** Línea 1-based, si la herramienta la da. */
  line?: number;
  /** Columna 1-based, si la herramienta la da. */
  column?: number;
  message: string;
}

/** Lo que el lint dice de un fichero. */
export interface LintFile {
  errors: number;
  warnings: number;
  messages: LintMessage[];
}

/** Un fichero tal y como lo devuelve un normalizador. */
export interface LintFileResult {
  path: string;
  messages: readonly LintMessage[];
}

export interface LintSummary {
  files: number;
  errors: number;
  warnings: number;
  messages: number;
}

export interface LintArtifact {
  schemaVersion: typeof LINT_ARTIFACT_VERSION;
  meta: {
    /** MD5 canónico de `tools` + `files`. */
    checksum: string;
    /** Nombres de las herramientas, ordenados y sin repetir. */
    tools: string[];
  };
  /** Por ruta relativa con `/`; los ficheros limpios no aparecen. */
  files: Record<string, LintFile>;
  summary: LintSummary;
}

/** Un artefacto mal formado: versión, ruta o forma. */
export class LintError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LintError";
  }
}

/**
 * Una ruta del artefacto: relativa, con `/` y sin segmentos que se salgan.
 *
 * Las herramientas dan rutas absolutas (ESLint) o relativas (oxlint), y el
 * artefacto no puede llevar ni la raíz de tu máquina ni `..`. Si una ruta no
 * encaja, es un error del llamador: se dice en vez de escribir un fichero con
 * rutas que no significan lo mismo en otra máquina.
 */
export function canonicalLintPath(input: string): string {
  const posix = input.trim().replace(/\\/g, "/").replace(/\/{2,}/g, "/");
  const text = posix.startsWith("./") ? posix.slice(2) : posix;
  if (text === "" || text.startsWith("/") || /^[A-Za-z]:/.test(text)) {
    throw new LintError(`la ruta del lint tiene que ser relativa: "${input}"`);
  }
  const segments = text.split("/").filter((segment) => segment !== ".");
  if (segments.length === 0 || segments.some((segment) => segment === "..")) {
    throw new LintError(`la ruta del lint se sale del repo: "${input}"`);
  }
  return segments.join("/");
}

/**
 * Construye el artefacto a partir de lo que devolvieron los normalizadores.
 *
 * - Las rutas se canonizan y los ficheros con la misma ruta se funden: dos
 *   herramientas pueden hablar del mismo fichero.
 * - Los mensajes idénticos se cuentan una vez. ESLint y oxlint se solapan en
 *   reglas a propósito, y sumar dos veces el mismo aviso inflaría el mapa.
 * - Todo se ordena: ficheros por ruta y mensajes por línea, columna, regla y
 *   texto. El orden de entrada no cambia el resultado.
 */
export function createLintArtifact(input: {
  tools: readonly string[];
  files: readonly LintFileResult[];
}): LintArtifact {
  const byPath = new Map<string, LintMessage[]>();

  for (const file of input.files) {
    const path = canonicalLintPath(file.path);
    const messages = byPath.get(path) ?? [];
    for (const message of file.messages) {
      messages.push(canonicalMessage(message));
    }
    byPath.set(path, messages);
  }

  const files: Record<string, LintFile> = {};
  for (const path of [...byPath.keys()].sort(compareStrings)) {
    const messages = dedupe(byPath.get(path) ?? []).sort(compareMessages);
    if (messages.length === 0) continue;
    files[path] = {
      errors: messages.filter((message) => message.severity === "error").length,
      warnings: messages.filter((message) => message.severity === "warn").length,
      messages
    };
  }

  const tools = [
    ...new Set(input.tools.map((tool) => tool.trim()).filter((tool) => tool))
  ].sort(compareStrings);

  return {
    schemaVersion: LINT_ARTIFACT_VERSION,
    meta: {
      checksum: md5Hex(stableStringify({ tools, files })),
      tools
    },
    files,
    summary: summarize(files)
  };
}

/** Un mensaje con sus campos en la forma del formato, o un error. */
function canonicalMessage(message: LintMessage): LintMessage {
  const rule = message.rule.trim();
  const text = message.message.trim();
  if (!rule) throw new LintError("un mensaje del lint no lleva regla");
  if (!text) throw new LintError("un mensaje del lint no lleva texto");
  if (!isSeverity(message.severity)) {
    throw new LintError(`severidad del lint desconocida: "${message.severity}"`);
  }
  return {
    rule,
    severity: message.severity,
    ...(message.line !== undefined ? { line: message.line } : {}),
    ...(message.column !== undefined ? { column: message.column } : {}),
    message: text
  };
}

function isSeverity(value: string): value is LintSeverity {
  return value === "error" || value === "warn" || value === "info";
}

function dedupe(messages: readonly LintMessage[]): LintMessage[] {
  const seen = new Set<string>();
  const unique: LintMessage[] = [];
  for (const message of messages) {
    const key = [
      message.severity,
      message.rule,
      message.line ?? "",
      message.column ?? "",
      message.message
    ].join("\u0000");
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(message);
  }
  return unique;
}

function summarize(files: Record<string, LintFile>): LintSummary {
  let errors = 0;
  let warnings = 0;
  let messages = 0;
  for (const file of Object.values(files)) {
    errors += file.errors;
    warnings += file.warnings;
    messages += file.messages.length;
  }
  return { files: Object.keys(files).length, errors, warnings, messages };
}

function compareMessages(left: LintMessage, right: LintMessage): number {
  return (
    (left.line ?? Number.MAX_SAFE_INTEGER) -
      (right.line ?? Number.MAX_SAFE_INTEGER) ||
    (left.column ?? Number.MAX_SAFE_INTEGER) -
      (right.column ?? Number.MAX_SAFE_INTEGER) ||
    compareStrings(left.rule, right.rule) ||
    compareStrings(left.severity, right.severity) ||
    compareStrings(left.message, right.message)
  );
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
