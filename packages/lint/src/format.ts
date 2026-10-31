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

/**
 * La versión del formato del artefacto.
 *
 * 1.2 (ADR 0098) añade la procedencia de la medida: `meta.tree`, el checksum
 * del árbol que se midió, y `summary.measured`, cuántos ficheros llegaron a
 * mirarse. Sin ellos, «0 hallazgos» y «no se miró nada» eran el mismo fichero.
 */
export const LINT_ARTIFACT_VERSION = "1.2";

/**
 * El nombre del artefacto: un **módulo del reporte** (ADR 0100).
 *
 * `repmod` de *report module*: se lee junto al `report.json` y comparte su
 * árbol. No lleva `cc.json` porque no es un cc.json —el sufijo es del formato,
 * no de la propiedad— y no lleva un nombre llano porque no es estado local.
 */
export const LINT_ARTIFACT_FILE = "lint.repmod.json";

/** Una regla activa de un sistema de lint, con la severidad que le da su config. */
export interface LintRule {
  /** El identificador de la regla, tal y como lo usa su herramienta. */
  id: string;
  severity: LintSeverity;
}

/**
 * Un sistema de lint que el proyecto declara (ADR 0096).
 *
 * Es lo que el repo tiene, no lo que CodArch trae: su config, las reglas
 * activas si se pudieron resolver y, cuando no se pudo medir o enumerar, el
 * motivo. `meta.tools` dice cuáles llegaron a medir; este dice cuáles existen.
 */
export interface LintSystem {
  /** `eslint`, `oxlint`, `biome`, `ruff`, `checkstyle`, `go-vet`, `dotnet`… */
  name: string;
  /** El fichero de configuración del repo, relativo y con `/`; `null` si no tiene. */
  config: string | null;
  /** Las reglas activas, si se pudieron resolver. */
  rules?: LintRule[];
  /** Por qué no se midió o no se pudieron enumerar sus reglas. */
  note?: string;
}

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
  /** Ficheros con al menos un mensaje. */
  files: number;
  errors: number;
  warnings: number;
  messages: number;
  /**
   * Ficheros que la herramienta llegó a mirar, con o sin hallazgos.
   *
   * Es lo que distingue «medido y limpio» de «no se midió»: un artefacto con
   * 494 medidos y 0 hallazgos dice que el repo está limpio. Falta en los
   * artefactos 1.1 y anteriores, donde esa cifra no se guardaba.
   */
  measured?: number;
}

export interface LintArtifact {
  schemaVersion: typeof LINT_ARTIFACT_VERSION;
  meta: {
    /** MD5 canónico de `tools` + `systems` + `files`. */
    checksum: string;
    /** Nombres de las herramientas que midieron, ordenados y sin repetir. */
    tools: string[];
    /** Los sistemas que el proyecto declara, ordenados por nombre. */
    systems: LintSystem[];
    /**
     * El checksum del snapshot que se midió (ADR 0098).
     *
     * `undefined` en `codarch lint` suelto, que no analiza el repo: entonces no
     * hay árbol con el que comparar y la app no puede decir si está al día.
     */
    tree?: string;
  };
  /** Por ruta relativa con `/`; los ficheros limpios no aparecen. */
  files: Record<string, LintFile>;
  summary: LintSummary;
}

/**
 * Un artefacto leído de disco, o `null` si no es uno.
 *
 * El lector es de la app y por eso no lanza: un artefacto de otra versión o
 * escrito a mano no puede tumbar el mapa. Se comprueba la forma
 * entera y se devuelve una copia con los campos conocidos, para que quien lo
 * consuma no tenga que volver a mirar si lo que tiene delante es un objeto.
 */
export function readLintArtifact(input: unknown): LintArtifact | null {
  if (!isRecord(input)) return null;
  // Un artefacto 1.0 es anterior a los sistemas (ADR 0096): se lee y se sube,
  // con los nombres de las herramientas como únicos sistemas conocidos.
  const legacy = input.schemaVersion === "1.0";
  if (input.schemaVersion !== "1.0" && input.schemaVersion !== "1.1" && input.schemaVersion !== LINT_ARTIFACT_VERSION) {
    return null;
  }

  const meta = input.meta;
  if (!isRecord(meta) || typeof meta.checksum !== "string") return null;
  if (!Array.isArray(meta.tools) || !meta.tools.every(isText)) return null;
  const systems = legacy
    ? [...new Set(meta.tools)].sort().map((name) => ({ name, config: null }))
    : readSystems(meta.systems);
  if (systems === null) return null;

  const files = input.files;
  if (!isRecord(files)) return null;
  const parsedFiles: Record<string, LintFile> = {};
  for (const [file, value] of Object.entries(files)) {
    const parsed = readLintFile(value);
    if (!parsed) return null;
    parsedFiles[file] = parsed;
  }

  const summary = input.summary;
  if (
    !isRecord(summary) ||
    !isCount(summary.files) ||
    !isCount(summary.errors) ||
    !isCount(summary.warnings) ||
    !isCount(summary.messages)
  ) {
    return null;
  }
  if (summary.measured !== undefined && !isCount(summary.measured)) return null;
  if (meta.tree !== undefined && !isText(meta.tree)) return null;

  return {
    schemaVersion: LINT_ARTIFACT_VERSION,
    meta: {
      checksum: meta.checksum,
      tools: [...meta.tools],
      systems,
      ...(meta.tree === undefined ? {} : { tree: meta.tree })
    },
    files: parsedFiles,
    summary: {
      files: summary.files,
      errors: summary.errors,
      warnings: summary.warnings,
      messages: summary.messages,
      ...(summary.measured === undefined ? {} : { measured: summary.measured })
    }
  };
}

function readLintFile(value: unknown): LintFile | null {
  if (!isRecord(value)) return null;
  if (!isCount(value.errors) || !isCount(value.warnings)) return null;
  if (!Array.isArray(value.messages)) return null;

  const messages: LintMessage[] = [];
  for (const item of value.messages) {
    const message = readLintMessage(item);
    if (!message) return null;
    messages.push(message);
  }
  return { errors: value.errors, warnings: value.warnings, messages };
}

function readLintMessage(value: unknown): LintMessage | null {
  if (!isRecord(value)) return null;
  if (!isText(value.rule) || !isText(value.message)) return null;
  if (!isSeverity(value.severity)) return null;
  if (value.line !== undefined && !isCount(value.line)) return null;
  if (value.column !== undefined && !isCount(value.column)) return null;
  return {
    rule: value.rule,
    severity: value.severity,
    ...(value.line !== undefined ? { line: value.line } : {}),
    ...(value.column !== undefined ? { column: value.column } : {}),
    message: value.message
  };
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
  /** Los sistemas que el proyecto declara; sin ellos, las herramientas. */
  systems?: readonly LintSystem[];
  /** El checksum del snapshot medido, cuando se sabe (ADR 0098). */
  tree?: string;
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
  const systems = canonicalSystems(
    input.systems ?? tools.map((name) => ({ name, config: null }))
  );

  return {
    schemaVersion: LINT_ARTIFACT_VERSION,
    meta: {
      checksum: md5Hex(stableStringify({ tools, systems, files })),
      tools,
      systems,
      ...(input.tree ? { tree: input.tree } : {})
    },
    files,
    // Los ficheros limpios no entran en `files`, pero sí se contaron: es la
    // cobertura de la medida, y va antes de fundirlos por ruta para no contar
    // dos veces el mismo fichero cuando lo miran dos herramientas.
    summary: summarize(files, byPath.size)
  };
}

/** Los sistemas ordenados y sin repetir; las reglas también se ordenan. */
function canonicalSystems(systems: readonly LintSystem[]): LintSystem[] {
  const byName = new Map<string, LintSystem>();
  for (const system of systems) {
    const name = system.name.trim();
    if (!name || byName.has(name)) continue;
    const rules = system.rules
      ? [...system.rules]
          .filter((rule) => rule.id.trim() !== "" && isSeverity(rule.severity))
          .map((rule) => ({ id: rule.id.trim(), severity: rule.severity }))
          .sort((left, right) => compareStrings(left.id, right.id) || compareStrings(left.severity, right.severity))
      : undefined;
    byName.set(name, {
      name,
      config: system.config ?? null,
      ...(rules && rules.length > 0 ? { rules } : {}),
      ...(system.note ? { note: system.note } : {})
    });
  }
  return [...byName.values()].sort((left, right) =>
    compareStrings(left.name, right.name)
  );
}

/** Los sistemas de un artefacto 1.1, o `null` si la forma no cuadra. */
function readSystems(value: unknown): LintSystem[] | null {
  if (!Array.isArray(value)) return null;
  const systems: LintSystem[] = [];
  for (const item of value) {
    const system = readSystem(item);
    if (!system) return null;
    systems.push(system);
  }
  return systems;
}

function readSystem(value: unknown): LintSystem | null {
  if (!isRecord(value) || !isText(value.name)) return null;
  const rawConfig = value.config;
  if (
    rawConfig !== null &&
    rawConfig !== undefined &&
    !isText(rawConfig)
  ) {
    return null;
  }
  const config = isText(rawConfig) ? rawConfig : null;

  const rules = value.rules === undefined ? undefined : readRules(value.rules);
  if (rules === null) return null;
  if (value.note !== undefined && !isText(value.note)) return null;

  return {
    name: value.name,
    config,
    ...(rules ? { rules } : {}),
    ...(value.note !== undefined ? { note: value.note as string } : {})
  };
}

function readRules(value: unknown): LintRule[] | null {
  if (!Array.isArray(value)) return null;
  const rules: LintRule[] = [];
  for (const item of value) {
    if (!isRecord(item) || !isText(item.id) || !isSeverity(item.severity)) {
      return null;
    }
    rules.push({ id: item.id, severity: item.severity });
  }
  return rules;
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

function isSeverity(value: unknown): value is LintSeverity {
  return value === "error" || value === "warn" || value === "info";
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function summarize(
  files: Record<string, LintFile>,
  measured: number
): LintSummary {
  let errors = 0;
  let warnings = 0;
  let messages = 0;
  for (const file of Object.values(files)) {
    errors += file.errors;
    warnings += file.warnings;
    messages += file.messages.length;
  }
  return {
    files: Object.keys(files).length,
    errors,
    warnings,
    messages,
    measured
  };
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
