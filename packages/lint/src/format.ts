import { LINT_FILE, md5Hex, stableStringify } from "@codarch/schema/browser";
import {
  scopeHealth,
  summaryFromHealth,
  type LintCoverage,
  type LintDomain,
  type Reason,
  type ToolCoverage
} from "./health";
import { lintFileCounts } from "./rollup";

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
 *
 * 1.3 añade `domain` y `coverage`. 1.0–1.2 se siguen leyendo: al interpretarlos
 * la cobertura es `unknown` con `legacy-global`, y `summary.measured` solo se
 * emite si la cobertura nueva lo puede derivar. Las cuentas heredadas se
 * regeneran desde los mensajes y las rutas se canonizan (ADR 0106). El nombre
 * del fichero no cambia.
 */
export const LINT_ARTIFACT_VERSION = "1.3";

/**
 * Versiones que el lector acepta. `1.3` es el contrato de cobertura; 1.0–1.2
 * se siguen leyendo y, al interpretarlos, quedan en `unknown` (ADR 0107).
 */
export type LintArtifactVersion = "1.0" | "1.1" | "1.2" | "1.3";

/**
 * El nombre del artefacto, que declara el registro de `.codarch/` (ADR 0101).
 *
 * `lint.repmod.json`: un **módulo del reporte** (ADR 0100). Se lee junto al
 * `report.json` y comparte su árbol; no lleva `cc.json` porque no es un cc.json.
 */
export { LINT_FILE };

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

/**
 * Lo que el lint dice de un fichero.
 *
 * `errors` y `warnings` son cuentas heredadas (artefactos 1.0–1.2). Al leer se
 * regeneran desde `messages` (ADR 0106): un número declarado que no cuadra no
 * manda. Un `info` no suma a ninguna de las dos; sigue siendo un mensaje.
 */
export interface LintFile {
  /** Mensajes con severidad `error`. Derivado de `messages` al leer. */
  errors: number;
  /** Mensajes con severidad `warn`. Derivado de `messages` al leer. */
  warnings: number;
  messages: LintMessage[];
}

/** Un fichero tal y como lo devuelve un normalizador. */
export interface LintFileResult {
  path: string;
  messages: readonly LintMessage[];
}

export interface LintSummary {
  /**
   * Ficheros con al menos un mensaje, de cualquier severidad.
   *
   * Al leer sale de los mensajes, no del número declarado. Un fichero solo con
   * `info` cuenta. Un fichero sin mensajes no: los limpios no están en `files`.
   */
  files: number;
  /** Mensajes `error`. Derivado de los mensajes al leer. */
  errors: number;
  /** Mensajes `warn`. Derivado de los mensajes al leer. Un `info` no cuenta. */
  warnings: number;
  /**
   * Todos los mensajes: errores, avisos e info.
   *
   * Es el nombre heredado de lo que `lintTotals` llama `findings`. Al leer se
   * regenera; no es una cuarta severidad.
   */
  messages: number;
  /**
   * Ficheros que la pasada llegó a mirar, con o sin hallazgos.
   *
   * Es una cifra **global** de la pasada, no de una carpeta y no de los
   * mensajes: los limpios no están en `files`, así que no se puede reconstruir.
   * Al leer se conserva tal cual. Es lo que distingue «medido y limpio» de
   * «no se midió». Falta en los artefactos 1.1 y anteriores. La cobertura no
   * forma parte del contrato de cuentas (ADR 0106).
   */
  measured?: number;
}

export interface LintArtifact {
  schemaVersion: LintArtifactVersion;
  /**
   * `code` es el lint del repo; `docs` es el del resto. Ausente en 1.0–1.2:
   * entonces el dominio se toma como código al interpretar la cobertura.
   */
  domain?: LintDomain;
  meta: {
    /**
     * MD5 de `domain` + `tools` + `systems` + `files` + `coverage`, tal y como
     * los escribió quien creó el artefacto 1.3. En 1.0–1.2 era `tools` +
     * `systems` + `files`.
     *
     * `readLintArtifact` no lo recalcula. Si al leer se canonizan rutas o se
     * regeneran cuentas, este checksum sigue siendo el del fichero original y
     * puede no coincidir con el objeto devuelto.
     */
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
    /**
     * Huella de los ficheros de configuración del lint que produjeron esta
     * medida (ADR 0112). Es opcional y no cambia el contrato: un lector 1.3
     * anterior la ignora. Sirve para auditar y para no confundir una foto de
     * otra config con la actual.
     */
    config?: string;
  };
  /**
   * Por ruta canónica (`/`, NFC por segmento). Los ficheros limpios no aparecen.
   *
   * La ruta de cada mensaje es esta clave: al leer se canoniza, así que el
   * mensaje queda bajo la ruta canónica y no bajo la clave cruda.
   */
  files: Record<string, LintFile>;
  summary: LintSummary;
  /**
   * Cobertura por herramienta (contrato 1.3). Ausente en 1.0–1.2: no se
   * inventa. `files` sigue siendo solo hallazgos.
   */
  coverage?: LintCoverage;
  /**
   * Avisos de lectura. No son del esquema 1.0–1.2: `createLintArtifact` no
   * los escribe y un lector viejo los ignora. Al leer, si dos claves distintas
   * caen en la misma ruta, se anota aquí en vez de fundirlas en silencio. Si
   * el artefacto ya traía avisos bien formados, se conservan: así
   * `read(serialize(read(x)))` sigue siendo `read(x)`.
   */
  diagnostics?: readonly LintPathCollision[];
}

/**
 * Dos claves crudas distintas que, al canonizar, son la misma ruta.
 *
 * Los mensajes de todas se conservan, en el orden de las claves, bajo `path`,
 * sin deduplicar. La cuenta sale de esa lista. No es un fallo de lectura: el
 * artefacto se entiende, y el aviso dice que no había una sola clave.
 */
export interface LintPathCollision {
  kind: "path-collision";
  /** Ruta canónica en la que chocaron las claves. */
  path: string;
  /** Claves crudas, en el orden del artefacto. */
  keys: readonly string[];
}

/**
 * Un artefacto leído de disco, o `null` si no es uno.
 *
 * El lector es de la app y por eso no lanza: un artefacto de otra versión o
 * escrito a mano no puede tumbar el mapa. Se comprueba la forma
 * entera y se devuelve una copia con los campos conocidos, para que quien lo
 * consuma no tenga que volver a mirar si lo que tiene delante es un objeto.
 *
 * Los mensajes son la única fuente de las cuentas. `errors`, `warnings` y el
 * `summary` heredado se vuelven a calcular aquí. `summary.measured` solo se
 * rellena cuando la cobertura lo deriva; un 1.0–1.2 no lo deriva (`unknown`).
 * Las claves de fichero —la ruta de cada mensaje— se canonizan. Una ruta
 * absoluta o con `..` invalida el artefacto (el lector sigue sin lanzar). Dos
 * claves que caen en la misma ruta no se funden en silencio: quedan en
 * `diagnostics`. Leer dos veces el resultado da lo mismo.
 */
export function readLintArtifact(input: unknown): LintArtifact | null {
  if (!isRecord(input)) return null;
  // Un artefacto 1.0 es anterior a los sistemas (ADR 0096): se lee y se sube,
  // con los nombres de las herramientas como únicos sistemas conocidos.
  const version = input.schemaVersion;
  const legacy = version === "1.0" || version === "1.1" || version === "1.2";
  if (version !== "1.0" && version !== "1.1" && version !== "1.2" && version !== "1.3") {
    return null;
  }
  const preSystems = version === "1.0";

  const meta = input.meta;
  if (!isRecord(meta) || typeof meta.checksum !== "string") return null;
  if (!Array.isArray(meta.tools) || !meta.tools.every(isText)) return null;
  const systems = preSystems
    ? [...new Set(meta.tools)].sort().map((name) => ({ name, config: null }))
    : readSystems(meta.systems);
  if (systems === null) return null;

  const files = input.files;
  if (!isRecord(files)) return null;
  const parsedFiles = readLintFiles(files);
  if (!parsedFiles) return null;

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
  if (meta.config !== undefined && !isText(meta.config)) return null;

  const regenerated = withRegeneratedCounts(parsedFiles.files);
  const diagnostics = combineDiagnostics(
    readStoredDiagnostics(input.diagnostics),
    parsedFiles.collisions
  );
  const domain = legacy ? "code" : readDomain(input.domain);
  const coverage = legacy ? legacyCoverage(meta.tools) : readCoverage(input.coverage);
  if (!domain || !coverage) return null;

  const draft: LintArtifact = {
    schemaVersion: LINT_ARTIFACT_VERSION,
    domain,
    meta: {
      checksum: meta.checksum,
      tools: [...meta.tools],
      systems,
      ...(meta.tree === undefined ? {} : { tree: meta.tree }),
      ...(meta.config === undefined ? {} : { config: meta.config })
    },
    files: regenerated,
    coverage,
    summary: { files: 0, errors: 0, warnings: 0, messages: 0 },
    ...(diagnostics.length > 0 ? { diagnostics } : {})
  };

  return {
    ...draft,
    summary: summaryFromHealth(scopeHealth(draft, { kind: "project", path: "" }))
  };
}

/**
 * Los ficheros del artefacto, con las cuentas todavía sin regenerar.
 *
 * La clave cruda se canoniza: es la ruta del mensaje. Una ruta que no es del
 * repo invalida el artefacto entero, sin lanzar. Si dos claves distintas caen
 * en la misma ruta, sus mensajes se concatenan en el orden de las claves —no
 * se deduplican— y la colisión se devuelve aparte para avisarla.
 */
function readLintFiles(files: Record<string, unknown>): {
  files: Record<string, LintFile>;
  collisions: LintPathCollision[];
} | null {
  const groups = new Map<string, { keys: string[]; messages: LintMessage[] }>();
  for (const [rawKey, value] of Object.entries(files)) {
    let path: string;
    try {
      path = canonicalLintPath(rawKey);
    } catch (error) {
      if (error instanceof LintError) return null;
      throw error;
    }
    const parsed = readLintFile(value);
    if (!parsed) return null;
    const group = groups.get(path);
    if (group) {
      group.keys.push(rawKey);
      appendMessages(group.messages, parsed.messages);
    } else {
      groups.set(path, { keys: [rawKey], messages: parsed.messages.slice() });
    }
  }

  const collisions: LintPathCollision[] = [];
  const parsedFiles = emptyFiles();
  for (const path of [...groups.keys()].sort(compareStrings)) {
    const group = groups.get(path);
    if (!group) continue;
    if (new Set(group.keys).size > 1) {
      collisions.push({
        kind: "path-collision",
        path,
        keys: [...group.keys]
      });
    }
    parsedFiles[path] = {
      errors: 0,
      warnings: 0,
      messages: group.messages
    };
  }
  return { files: parsedFiles, collisions };
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
 * Una ruta del artefacto: relativa, con `/`, NFC por segmento y sin salirse.
 *
 * Las herramientas dan rutas absolutas (ESLint) o relativas (oxlint), y el
 * artefacto no puede llevar ni la raíz de tu máquina ni `..`. Cada segmento
 * se normaliza a NFC, igual que el nombre de un nodo (`normalizeName`): así
 * `Cafe\u0301` y `Café` son el mismo fichero. No se pasa a minúsculas: la
 * comparación es la de la cadena canónica, y `Foo.ts` no es `foo.ts`. Si una
 * ruta no encaja, es un error del llamador: se dice en vez de escribir un
 * fichero con rutas que no significan lo mismo en otra máquina.
 */
export function canonicalLintPath(input: string): string {
  const posix = input.trim().replace(/\\/g, "/").replace(/\/{2,}/g, "/");
  const text = posix.startsWith("./") ? posix.slice(2) : posix;
  if (text === "" || text.startsWith("/") || /^[A-Za-z]:/.test(text)) {
    throw new LintError(`la ruta del lint tiene que ser relativa: "${input}"`);
  }
  const segments = text
    .split("/")
    .map((segment) => segment.normalize("NFC"))
    .filter((segment) => segment !== "" && segment !== ".");
  if (segments.length === 0 || segments.some((segment) => segment === "..")) {
    throw new LintError(`la ruta del lint se sale del repo: "${input}"`);
  }
  return segments.join("/");
}

/**
 * Construye el artefacto a partir de lo que devolvieron los normalizadores.
 *
 * - Las rutas se canonizan (NFC por segmento, sin cambiar mayúsculas) y los
 *   ficheros con la misma ruta se funden: dos herramientas pueden hablar del
 *   mismo fichero. Fundir aquí es el contrato de escritura, con los mensajes
 *   repetidos contados una vez y sin `diagnostics`. Al leer, dos claves crudas
 *   que caen en la misma ruta no se funden en silencio: se avisa.
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
  /** Huella de los ficheros de configuración del lint (ADR 0112). */
  config?: string;
  /** `code` por defecto. El resto pasa `docs`. */
  domain?: LintDomain;
  files: readonly LintFileResult[];
  /**
   * Cobertura por herramienta. Sin ella, cada herramienta queda en `unknown`:
   * no se inventa `measured` a partir de los ficheros con hallazgos.
   */
  coverage?: LintCoverage;
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

  const files = emptyFiles();
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
  const domain = input.domain ?? "code";
  const coverage = input.coverage
    ? normalizeCoverage(input.coverage)
    : unknownCoverage(tools);

  const draft: LintArtifact = {
    schemaVersion: LINT_ARTIFACT_VERSION,
    domain,
    meta: {
      checksum: "",
      tools,
      systems,
      ...(input.tree ? { tree: input.tree } : {}),
      ...(input.config ? { config: input.config } : {})
    },
    files,
    coverage,
    summary: { files: 0, errors: 0, warnings: 0, messages: 0 }
  };

  return {
    ...draft,
    meta: {
      ...draft.meta,
      checksum: md5Hex(
        stableStringify({
          domain,
          tools,
          systems,
          files,
          coverage,
          ...(input.config ? { config: input.config } : {})
        })
      )
    },
    // `measured` solo si la cobertura lo deriva. Los limpios no están en `files`.
    summary: summaryFromHealth(scopeHealth(draft, { kind: "project", path: "" }))
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

/**
 * Avisos de colisión ya guardados en un artefacto leído.
 *
 * Una forma que no se entiende se ignora: no es un campo del esquema y no
 * puede tumbar un artefacto por lo demás válido. Una ruta que no se puede
 * canonizar tampoco se conserva.
 */
function readStoredDiagnostics(value: unknown): LintPathCollision[] {
  if (!Array.isArray(value)) return [];
  const diagnostics: LintPathCollision[] = [];
  for (const item of value) {
    const parsed = readPathCollision(item);
    if (parsed) diagnostics.push(parsed);
  }
  return diagnostics;
}

function readPathCollision(value: unknown): LintPathCollision | null {
  if (!isRecord(value) || value.kind !== "path-collision") return null;
  if (typeof value.path !== "string" || !Array.isArray(value.keys)) return null;
  if (value.keys.length < 2 || !value.keys.every(isRawKey)) return null;
  const keys = value.keys.filter(isRawKey);
  if (new Set(keys).size !== keys.length) return null;
  let path: string;
  try {
    path = canonicalLintPath(value.path);
    for (const key of keys) {
      if (canonicalLintPath(key) !== path) return null;
    }
  } catch (error) {
    if (error instanceof LintError) return null;
    throw error;
  }
  return { kind: "path-collision", path, keys };
}

/**
 * Los avisos de esta lectura más los que el artefacto ya traía.
 *
 * Se agrupan por ruta canónica. Las claves no se repiten y el orden de la
 * primera vez que aparecieron se conserva, para que serializar y volver a
 * leer no reordene el aviso.
 */
function combineDiagnostics(
  stored: readonly LintPathCollision[],
  fresh: readonly LintPathCollision[]
): LintPathCollision[] {
  const byPath = new Map<string, { keys: string[]; seen: Set<string> }>();
  const order: string[] = [];
  for (const item of [...stored, ...fresh]) {
    const group = byPath.get(item.path);
    if (!group) {
      byPath.set(item.path, { keys: item.keys.slice(), seen: new Set(item.keys) });
      order.push(item.path);
      continue;
    }
    for (const key of item.keys) {
      if (group.seen.has(key)) continue;
      group.seen.add(key);
      group.keys.push(key);
    }
  }
  return order.sort(compareStrings).map((path) => ({
    kind: "path-collision" as const,
    path,
    keys: byPath.get(path)?.keys ?? []
  }));
}

function appendMessages(target: LintMessage[], source: readonly LintMessage[]): void {
  for (const message of source) target.push(message);
}

/** Un mapa de ficheros sin prototipo: `__proto__` es una ruta, no el prototipo. */
function emptyFiles(): Record<string, LintFile> {
  return Object.create(null) as Record<string, LintFile>;
}

function isRawKey(value: unknown): value is string {
  return typeof value === "string" && value !== "";
}

/**
 * Cuentas de cada fichero, tomadas de sus mensajes.
 *
 * Los limpios —cero mensajes— salen del mapa: `summary.files` es «con
 * hallazgos» y un fichero sin mensajes no lo es, aunque declarara errores.
 * El orden de las claves es el de la ruta, para que la lectura sea estable.
 */
function withRegeneratedCounts(
  files: Readonly<Record<string, LintFile>>
): Record<string, LintFile> {
  const kept = emptyFiles();
  for (const path of Object.keys(files).sort(compareStrings)) {
    const file = files[path];
    if (!file || file.messages.length === 0) continue;
    kept[path] = { errors: 0, warnings: 0, messages: file.messages };
  }
  const counts = lintFileCounts(kept);
  for (const [path, file] of Object.entries(kept)) {
    const count = counts[path];
    file.errors = count?.errors ?? 0;
    file.warnings = count?.warnings ?? 0;
  }
  return kept;
}

function readDomain(value: unknown): LintDomain | null {
  if (value === undefined) return "code";
  return value === "code" || value === "docs" ? value : null;
}

function legacyCoverage(tools: readonly string[]): LintCoverage {
  const coverage: LintCoverage = { legacy: true, tools: {} };
  for (const name of [...tools].sort(compareStrings)) {
    coverage.tools[name] = {
      outcome: "unknown",
      eligiblePaths: null,
      reasons: [{ code: "legacy-global" }]
    };
  }
  return coverage;
}

function unknownCoverage(tools: readonly string[]): LintCoverage {
  const coverage: LintCoverage = { tools: {} };
  for (const name of tools) {
    coverage.tools[name] = {
      outcome: "unknown",
      eligiblePaths: null,
      reasons: [{ code: "unknown-eligibility" }]
    };
  }
  return coverage;
}

function normalizeCoverage(coverage: LintCoverage): LintCoverage {
  const tools: Record<string, ToolCoverage> = {};
  for (const name of Object.keys(coverage.tools).sort(compareStrings)) {
    const tool = coverage.tools[name];
    if (!tool) continue;
    tools[name] = tool.outcome === "enumerated"
      ? {
          outcome: "enumerated",
          measuredPaths: uniquePaths(tool.measuredPaths),
          eligiblePaths: tool.eligiblePaths === null ? null : uniquePaths(tool.eligiblePaths)
        }
      : { outcome: tool.outcome, eligiblePaths: null, reasons: [...tool.reasons] };
  }
  return { tools, ...(coverage.legacy ? { legacy: true } : {}) };
}

function readCoverage(value: unknown): LintCoverage | null {
  if (!isRecord(value) || !isRecord(value.tools)) return null;
  const tools: Record<string, ToolCoverage> = {};
  for (const [name, raw] of Object.entries(value.tools)) {
    const tool = readToolCoverage(raw);
    if (!tool) return null;
    tools[name] = tool;
  }
  let normalized: LintCoverage;
  try {
    normalized = normalizeCoverage({
      tools,
      ...(value.legacy === true ? { legacy: true } : {})
    });
  } catch (error) {
    if (error instanceof LintError) return null;
    throw error;
  }
  return normalized;
}

function readToolCoverage(value: unknown): ToolCoverage | null {
  if (!isRecord(value)) return null;
  if (value.outcome === "enumerated") {
    if (!Array.isArray(value.measuredPaths) || !value.measuredPaths.every(isPathText)) {
      return null;
    }
    if (value.eligiblePaths !== null && (
      !Array.isArray(value.eligiblePaths) || !value.eligiblePaths.every(isPathText)
    )) {
      return null;
    }
    return {
      outcome: "enumerated",
      measuredPaths: value.measuredPaths,
      eligiblePaths: value.eligiblePaths === null ? null : value.eligiblePaths
    };
  }
  if (value.outcome !== "unknown" && value.outcome !== "failed" && value.outcome !== "missing") {
    return null;
  }
  if (value.eligiblePaths !== null) return null;
  const reasons = readReasons(value.reasons);
  if (!reasons) return null;
  return { outcome: value.outcome, eligiblePaths: null, reasons };
}

function readReasons(value: unknown): Reason[] | null {
  if (!Array.isArray(value)) return null;
  const reasons: Reason[] = [];
  for (const item of value) {
    if (!isRecord(item) || !isReasonCode(item.code)) return null;
    if (item.text !== undefined && !isText(item.text)) return null;
    reasons.push(item.text === undefined ? { code: item.code } : { code: item.code, text: item.text });
  }
  return reasons;
}

function isReasonCode(value: unknown): value is Reason["code"] {
  return (
    value === "legacy-global" ||
    value === "legacy-version" ||
    value === "tool-failed" ||
    value === "tool-missing" ||
    value === "unknown-eligibility" ||
    value === "unknown-paths" ||
    value === "not-eligible" ||
    value === "not-found" ||
    value === "no-eligible" ||
    value === "freshness-unverified"
  );
}

function isPathText(value: unknown): value is string {
  return typeof value === "string";
}

function uniquePaths(paths: readonly string[]): string[] {
  return [...new Set(paths.map((path) => canonicalLintPath(path)))].sort(compareStrings);
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
