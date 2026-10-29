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
 * severidades numéricas y oxlint da diagnósticos con etiquetas y códigos como
 * `eslint(no-debugger)`. Aquí se traducen los dos al mismo mensaje, sin decidir
 * nada del producto: el artefacto y sus cuentas se construyen después con
 * `createLintArtifact`.
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
