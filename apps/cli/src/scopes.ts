import fs from "node:fs";
import path from "node:path";
import {
  MIGRATION_EXTENSIONS,
  NodeFileSystem,
  findScopePaths,
  walkSourceFiles
} from "@codarch/parsers";
import {
  parseCcJson,
  readHistoryIndex,
  type CcJson,
  type CcNode
} from "@codarch/schema";

/**
 * Los alcances que viven dentro de otro alcance.
 *
 * Un repositorio puede tener varios `.codarch/`: se analiza la raíz y, más
 * tarde, `apps/desktop`. El padre **lee hacia abajo** ese estado (ADR 0089):
 * descubre los `.codarch/` que tiene por debajo y apunta en el suyo qué vio de
 * cada uno —checksum, commit, ficheros y fecha—, para poder avisar de la deriva
 * sin abrir el snapshot entero ni escribir en el hijo.
 *
 * Hacia arriba no se lee nunca: un alcance parcial no hereda el estado de un
 * alcance mayor que no controla.
 */

export const SCOPES_FILE = "scopes.json";
export const SCOPES_VERSION = 1;

export interface ScopeEntry {
  /** Ruta relativa al padre, siempre con `/`. */
  path: string;
  /** Checksum del snapshot del hijo. */
  checksum: string;
  /** Commit del snapshot del hijo, si lo tiene. */
  commit: string;
  /** Ficheros del árbol del hijo. */
  files: number;
  projectName?: string;
  /** Fecha de la última foto del hijo en su historial, si tiene historial. */
  date?: string;
}

export interface ScopeRow extends ScopeEntry {
  /** El alcance aparece en el registro del padre (sino, es nuevo). */
  registered: boolean;
  /** Su checksum cambió desde la última vez que el padre lo vio. */
  changed: boolean;
  /** Hay ficheros más nuevos que su snapshot: puede estar desactualizado. */
  stale: boolean;
  /** Estaba en el registro pero ya no tiene snapshot. */
  gone: boolean;
}

/** El registro del padre, en el mismo directorio de estado que el snapshot. */
export function scopesFile(outDirectory: string): string {
  return path.join(outDirectory, SCOPES_FILE);
}

/**
 * Las carpetas que tienen su propio `.codarch/` por debajo de la raíz.
 *
 * Es el descubrimiento sin abrir nada: sirve para saber qué alcances hay y
 * para buscar su caché de parseo, que no depende de que su snapshot se lea. No
 * sigue symlinks, no baja a `node_modules` ni a `.git` y no entra en el
 * `.codarch/` de la raíz. Un snapshot ilegible se salta: el estado de un
 * ancestro nunca se cae por un hijo roto.
 *
 * La búsqueda vive en `@codarch/parsers` porque también la usan `serve` y el
 * escritorio para leer las cachés de sus alcances (ADR 0089).
 */
export const discoverScopePaths = findScopePaths;

/** La cabecera de cada alcance, saltando el que tenga el snapshot ilegible. */
export function readScopes(
  root: string,
  scopePaths: readonly string[]
): ScopeEntry[] {
  const scopes: ScopeEntry[] = [];
  for (const scopePath of scopePaths) {
    const scope = readScope(root, scopePath);
    if (scope) scopes.push(scope);
  }
  return scopes;
}

export function discoverScopes(
  root: string,
  ignore: readonly string[] = []
): ScopeEntry[] {
  return readScopes(root, discoverScopePaths(root, ignore));
}

/** La cabecera de un alcance, o `null` si su snapshot no se entiende. */
function readScope(root: string, scopePath: string): ScopeEntry | null {
  const directory = path.join(root, scopePath);
  const cc = readSnapshot(directory);
  if (!cc) return null;

  const checksum = metaText(cc, "checksum") ?? "";
  if (checksum === "") return null;

  const scope: ScopeEntry = {
    path: scopePath,
    checksum,
    commit: metaText(cc, "commitHash") ?? "",
    files: countFiles(cc)
  };
  const projectName = metaText(cc, "projectName");
  if (projectName !== undefined) scope.projectName = projectName;
  const date = lastHistoryDate(directory);
  if (date !== undefined) scope.date = date;

  return scope;
}

/** El snapshot del hijo, o `null` si falta o no se entiende. */
function readSnapshot(directory: string): CcJson | null {
  try {
    const raw = JSON.parse(
      fs.readFileSync(path.join(directory, ".codarch", "snapshot.cc.json"), "utf8")
    ) as unknown;
    return parseCcJson(raw);
  } catch {
    return null;
  }
}

/** Un dato de texto de `meta`, que puede faltar. */
function metaText(cc: CcJson, key: string): string | undefined {
  const value = (cc.meta as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

/** La fecha de la última foto del historial del hijo, si tiene. */
function lastHistoryDate(directory: string): string | undefined {
  const history = readHistoryIndex(directory);
  return history.entries[history.entries.length - 1]?.date;
}

function countFiles(cc: CcJson): number {
  let files = 0;
  const visit = (nodes: readonly CcNode[]): void => {
    for (const node of nodes) {
      if (node.type === "File") files += 1;
      else if (node.children) visit(node.children);
    }
  };
  visit(cc.files);
  return files;
}

/** El registro guardado, o vacío si no hay o no se entiende. */
export function readScopeRegister(outDirectory: string): ScopeEntry[] {
  const scopes = readRegister(outDirectory);
  return scopes === null ? [] : scopes.filter(isScopeEntry);
}

/** Los alcances tal cual están escritos, sin validar cada uno. */
function readRegister(outDirectory: string): unknown[] | null {
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(scopesFile(outDirectory), "utf8")) as unknown;
  } catch {
    return null;
  }
  if (!isRecord(raw)) return null;
  if (raw.version !== SCOPES_VERSION || !Array.isArray(raw.scopes)) return null;
  return raw.scopes;
}

export function writeScopeRegister(
  outDirectory: string,
  scopes: readonly ScopeEntry[]
): void {
  const sorted = [...scopes].sort(byPath);
  fs.mkdirSync(outDirectory, { recursive: true });
  fs.writeFileSync(
    scopesFile(outDirectory),
    `${JSON.stringify({ version: SCOPES_VERSION, scopes: sorted }, null, 2)}\n`,
    "utf8"
  );
}

/** Las claves que todo alcance guardado tiene, y las que puede tener. */
const REQUIRED_TEXT = ["path", "checksum", "commit"] as const;
const OPTIONAL_TEXT = ["projectName", "date"] as const;

function isScopeEntry(value: unknown): value is ScopeEntry {
  if (!isRecord(value)) return false;
  if (!REQUIRED_TEXT.every((key) => typeof value[key] === "string")) {
    return false;
  }
  if (typeof value.files !== "number") return false;
  return (
    value.path !== "" &&
    OPTIONAL_TEXT.every(
      (key) => value[key] === undefined || typeof value[key] === "string"
    )
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Si un alcance tiene ficheros más nuevos que su snapshot.
 *
 * Es una pista barata (solo `stat`, sin reanalizar): si hay ficheros con más
 * mtime que la foto del hijo, esa foto puede no contar lo que hay hoy. No
 * distingue un fichero tocado sin cambios de uno cambiado, así que se enseña
 * como aviso, no como veredicto.
 */
export function scopeHasNewerFiles(root: string, scopePath: string): boolean {
  const directory = path.join(root, scopePath);
  const snapshotMtime = snapshotWrittenAt(directory);
  if (snapshotMtime === null) return false;

  const walked = walkScope(directory);
  if (!walked) return false;

  return walked.files.some((file) => {
    const version = walked.fileSystem.stat?.(file.absolutePath);
    if (!version) return false;
    return version.mtimeMs > snapshotMtime;
  });
}

/** Cuándo se escribió el snapshot del hijo, o `null` si no se puede leer. */
function snapshotWrittenAt(directory: string): number | null {
  try {
    return fs.statSync(path.join(directory, ".codarch", "snapshot.cc.json"))
      .mtimeMs;
  } catch {
    return null;
  }
}

/** El código del hijo y el sistema de ficheros para mirar sus fechas. */
function walkScope(
  directory: string
): { fileSystem: NodeFileSystem; files: readonly { absolutePath: string }[] } | null {
  const fileSystem = new NodeFileSystem(directory);
  try {
    const { files } = walkSourceFiles(fileSystem, {
      extensions: MIGRATION_EXTENSIONS
    });
    return { fileSystem, files };
  } catch {
    return null;
  }
}

/**
 * El estado de cada alcance: lo que hay ahora contra lo que el padre apuntó.
 *
 * Es lo que enseña `codarch scopes`. `stale` mira el disco del hijo, `changed`
 * mira el registro: un alcance puede estar al día y aun así haberse vuelto a
 * analizar desde la última vez que el padre lo vio.
 */
export function scopeRows(
  root: string,
  registered: readonly ScopeEntry[],
  ignore: readonly string[] = []
): ScopeRow[] {
  const current = discoverScopes(root, ignore);
  const seen = new Set(current.map((scope) => scope.path));

  return [
    ...current.map((scope) => currentRow(root, scope, registered)),
    ...registered.filter((entry) => !seen.has(entry.path)).map(goneRow)
  ].sort(byPath);
}

/** Un alcance que sigue teniendo snapshot, cruzado con el registro. */
function currentRow(
  root: string,
  scope: ScopeEntry,
  registered: readonly ScopeEntry[]
): ScopeRow {
  const previous = registered.find((item) => item.path === scope.path);

  return {
    ...scope,
    registered: previous !== undefined,
    changed: previous !== undefined && previous.checksum !== scope.checksum,
    stale: scopeHasNewerFiles(root, scope.path),
    gone: false
  };
}

/** Un alcance que el padre vio y ya no tiene snapshot. */
function goneRow(entry: ScopeEntry): ScopeRow {
  return { ...entry, registered: true, changed: false, stale: false, gone: true };
}

/** Orden estable por ruta: la tabla y el registro usan el mismo. */
function byPath(left: { path: string }, right: { path: string }): number {
  return left.path < right.path ? -1 : left.path > right.path ? 1 : 0;
}

/** El estado en una palabra, para la tabla. */
export function scopeState(row: ScopeRow): string {
  if (row.gone) return "ya no está";
  if (!row.registered) return "nuevo";
  if (row.changed) return "se analizó otra vez";
  return "al día";
}
