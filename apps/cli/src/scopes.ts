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
  const snapshot = path.join(directory, ".codarch", "snapshot.cc.json");

  let cc: CcJson;
  try {
    cc = parseCcJson(JSON.parse(fs.readFileSync(snapshot, "utf8")) as unknown);
  } catch {
    return null;
  }

  const checksum = typeof cc.meta.checksum === "string" ? cc.meta.checksum : "";
  if (checksum === "") return null;

  const scope: ScopeEntry = {
    path: scopePath,
    checksum,
    commit: typeof cc.meta.commitHash === "string" ? cc.meta.commitHash : "",
    files: countFiles(cc)
  };
  if (typeof cc.meta.projectName === "string") scope.projectName = cc.meta.projectName;

  const history = readHistoryIndex(directory);
  const last = history.entries[history.entries.length - 1];
  if (last) scope.date = last.date;

  return scope;
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
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(scopesFile(outDirectory), "utf8")) as unknown;
  } catch {
    return [];
  }
  if (typeof raw !== "object" || raw === null) return [];
  const payload = raw as { version?: unknown; scopes?: unknown };
  if (payload.version !== SCOPES_VERSION || !Array.isArray(payload.scopes)) return [];
  return payload.scopes.filter(isScopeEntry);
}

export function writeScopeRegister(
  outDirectory: string,
  scopes: readonly ScopeEntry[]
): void {
  const sorted = [...scopes].sort((left, right) =>
    left.path < right.path ? -1 : left.path > right.path ? 1 : 0
  );
  fs.mkdirSync(outDirectory, { recursive: true });
  fs.writeFileSync(
    scopesFile(outDirectory),
    `${JSON.stringify({ version: SCOPES_VERSION, scopes: sorted }, null, 2)}\n`,
    "utf8"
  );
}

function isScopeEntry(value: unknown): value is ScopeEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.path === "string" &&
    entry.path !== "" &&
    typeof entry.checksum === "string" &&
    typeof entry.commit === "string" &&
    typeof entry.files === "number" &&
    (entry.projectName === undefined || typeof entry.projectName === "string") &&
    (entry.date === undefined || typeof entry.date === "string")
  );
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
  let snapshotMtime: number;
  try {
    snapshotMtime = fs.statSync(
      path.join(directory, ".codarch", "snapshot.cc.json")
    ).mtimeMs;
  } catch {
    return false;
  }

  const fileSystem = new NodeFileSystem(directory);
  let walked;
  try {
    walked = walkSourceFiles(fileSystem, { extensions: MIGRATION_EXTENSIONS });
  } catch {
    return false;
  }

  for (const file of walked.files) {
    const version = fileSystem.stat?.(file.absolutePath);
    if (version && version.mtimeMs > snapshotMtime) return true;
  }
  return false;
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
  const seen = new Map(current.map((scope) => [scope.path, scope]));
  const rows: ScopeRow[] = [];

  for (const scope of current) {
    const previous = registered.find((item) => item.path === scope.path);
    rows.push({
      ...scope,
      registered: previous !== undefined,
      changed: previous !== undefined && previous.checksum !== scope.checksum,
      stale: scopeHasNewerFiles(root, scope.path),
      gone: false
    });
  }

  for (const previous of registered) {
    if (seen.has(previous.path)) continue;
    rows.push({
      ...previous,
      registered: true,
      changed: false,
      stale: false,
      gone: true
    });
  }

  rows.sort((left, right) =>
    left.path < right.path ? -1 : left.path > right.path ? 1 : 0
  );
  return rows;
}

/** El estado en una palabra, para la tabla. */
export function scopeState(row: ScopeRow): string {
  if (row.gone) return "ya no está";
  if (!row.registered) return "nuevo";
  if (row.changed) return "se analizó otra vez";
  return "al día";
}
