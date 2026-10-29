import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface GitChurnFile {
  commits: number;
  authors: number;
}

export interface GitChurnResult {
  /** Presente solo para los ficheros analizados, con 0 si no tienen historial. */
  metrics: Map<string, GitChurnFile>;
  /** Commits que tocan al menos un fichero analizado. */
  commits: number;
  /** Autores únicos de esos commits. */
  authors: number;
  shallow: boolean;
  enabled: boolean;
  warnings: string[];
}

export interface GitChurnOptions {
  /** `false` desactiva git por completo (tests, benchmarks, directorios sin repo). */
  enabled?: boolean;
  /** Límite de salida de `git log`; por defecto 128 MB. */
  maxBuffer?: number;
}

const COMMIT_PREFIX = "__CODARCH_COMMIT__";
const DEFAULT_MAX_BUFFER = 128 * 1024 * 1024;

const EMPTY: GitChurnResult = {
  metrics: new Map(),
  commits: 0,
  authors: 0,
  shallow: false,
  enabled: false,
  warnings: []
};

/**
 * Extrae churn de git para un conjunto de ficheros ya recorridos.
 *
 * Un solo `git log --numstat` para todo el repo. Los conteos dependen del
 * historial del commit actual, no de la hora de ejecución: mismo repo, mismas
 * métricas. No sigue renames; se documenta en ADR 0009.
 */
export function collectGitChurn(
  rootInput: string,
  files: readonly string[],
  options: GitChurnOptions = {}
): GitChurnResult {
  if (options.enabled === false || files.length === 0) {
    return { ...EMPTY, metrics: new Map() };
  }

  const root = realPath(rootInput);
  const maxBuffer = options.maxBuffer ?? DEFAULT_MAX_BUFFER;

  const topLevel = runGit(root, ["rev-parse", "--show-toplevel"], maxBuffer);
  if (!topLevel.ok) {
    return failed([`no hay historial git utilizable: ${topLevel.error}`]);
  }

  const repoRoot = realPath(topLevel.stdout.trim());
  const shallow = isShallow(repoRoot, maxBuffer);
  const warnings = shallow
    ? ["el repositorio es shallow: el churn puede estar incompleto"]
    : [];

  const log = readLog(repoRoot, maxBuffer);
  if (!log.ok) {
    return failed([...warnings, `no se pudo leer git log: ${log.error}`], shallow);
  }

  const history = parseHistory(log.stdout, root, repoRoot, new Set(files));

  return {
    metrics: churnMetrics(files, history),
    commits: history.commits,
    authors: history.authors.size,
    shallow,
    enabled: true,
    warnings
  };
}

/** El resultado de una lectura que no pudo ser, con lo que sí se supo. */
function failed(warnings: string[], shallow = false): GitChurnResult {
  return { ...EMPTY, metrics: new Map(), shallow, warnings };
}

/** Si el repo se clonó sin historial completo. */
function isShallow(repoRoot: string, maxBuffer: number): boolean {
  const result = runGit(repoRoot, ["rev-parse", "--is-shallow-repository"], maxBuffer);
  return result.ok && result.stdout.trim().toLowerCase() === "true";
}

/**
 * El historial entero en una sola llamada.
 *
 * `core.quotePath=false` deja los caminos con tildes tal cual, y
 * `--no-merges` evita contar dos veces un cambio que llega de una rama.
 */
function readLog(repoRoot: string, maxBuffer: number): GitRunResult {
  return runGit(
    repoRoot,
    [
      "-c",
      "core.quotePath=false",
      "log",
      "--no-merges",
      "--numstat",
      `--format=${COMMIT_PREFIX}%H%x09%ae`
    ],
    maxBuffer
  );
}

/** Lo que se acumula mientras se lee el historial. */
interface ChurnHistory {
  commitsByFile: Map<string, number>;
  authorsByFile: Map<string, Set<string>>;
  authors: Set<string>;
  commits: number;
}

/** El estado de un commit a medio leer. */
interface CommitState extends ChurnHistory {
  author: string;
  touched: Set<string>;
}

/**
 * Cuenta commits y autores por fichero sobre la salida de `git log`.
 *
 * Solo cuenta un commit si toca algún fichero analizado: un commit que solo
 * cambia documentación no entra en el churn del mapa.
 */
function parseHistory(
  stdout: string,
  root: string,
  repoRoot: string,
  wanted: ReadonlySet<string>
): ChurnHistory {
  const state: CommitState = {
    commitsByFile: new Map(),
    authorsByFile: new Map(),
    authors: new Set(),
    commits: 0,
    author: "",
    touched: new Set()
  };

  for (const line of stdout.split(/\r?\n/)) {
    if (line.startsWith(COMMIT_PREFIX)) {
      flushCommit(state);
      state.author = authorOf(line);
      continue;
    }

    if (!state.author || line === "") continue;
    const file = touchedFile(line, root, repoRoot, wanted);
    if (file) state.touched.add(file);
  }
  flushCommit(state);

  return {
    commitsByFile: state.commitsByFile,
    authorsByFile: state.authorsByFile,
    authors: state.authors,
    commits: state.commits
  };
}

/** El autor de la línea de cabecera de un commit. */
function authorOf(line: string): string {
  const fields = line.slice(COMMIT_PREFIX.length).split("\t");
  return fields[1]?.trim() || "(sin autor)";
}

/**
 * El fichero analizado que toca una línea del `--numstat`, si toca alguno.
 *
 * El path es el tercer campo en adelante: git lo escapa salvo con
 * `core.quotePath=false`, y un nombre puede llevar tabs.
 */
function touchedFile(
  line: string,
  root: string,
  repoRoot: string,
  wanted: ReadonlySet<string>
): string | null {
  const fields = line.split("\t");
  if (fields.length < 3) return null;

  const gitPath = fields.slice(2).join("\t");
  if (!gitPath) return null;

  const relative = path.relative(root, path.resolve(repoRoot, gitPath));
  if (isOutside(relative)) return null;

  const normalized = relative.split(path.sep).join("/");
  return wanted.has(normalized) ? normalized : null;
}

/** Si la ruta cae fuera de la raíz analizada, o es la raíz misma. */
function isOutside(relative: string): boolean {
  return (
    relative === "" ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  );
}

/** Cierra el commit en curso: suma sus ficheros y su autor. */
function flushCommit(state: CommitState): void {
  if (!state.author || state.touched.size === 0) return;

  state.commits++;
  state.authors.add(state.author);
  for (const file of state.touched) countFile(state, file);

  state.touched = new Set();
  state.author = "";
}

/** Un commit más para el fichero, y su autor entre los que lo tocaron. */
function countFile(state: CommitState, file: string): void {
  state.commitsByFile.set(file, (state.commitsByFile.get(file) ?? 0) + 1);

  let authors = state.authorsByFile.get(file);
  if (!authors) {
    authors = new Set();
    state.authorsByFile.set(file, authors);
  }
  authors.add(state.author);
}

/** Una entrada por fichero, con cero si no tiene historial. */
function churnMetrics(
  files: readonly string[],
  history: ChurnHistory
): Map<string, GitChurnFile> {
  const metrics = new Map<string, GitChurnFile>();

  for (const file of files) {
    metrics.set(file, {
      commits: history.commitsByFile.get(file) ?? 0,
      authors: history.authorsByFile.get(file)?.size ?? 0
    });
  }

  return metrics;
}

/**
 * El churn de la pasada anterior, mientras el historial no cambie.
 *
 * `git log --numstat` cuesta cientos de milisegundos y no cambia si no hay
 * commit nuevo: la clave es `HEAD` **y** la lista de ficheros analizados, que es
 * lo que decide qué commits cuentan. Con un fichero nuevo o borrado se rehace,
 * porque entonces cambia la respuesta (ADR 0056).
 */
export class ChurnCache {
  private readonly entries = new Map<
    string,
    { head: string; files: string; result: GitChurnResult }
  >();
  private hits = 0;
  private misses = 0;

  get(root: string, files: readonly string[], head: string): GitChurnResult | null {
    const entry = this.entries.get(root);
    if (!entry || entry.head !== head) {
      this.misses++;
      return null;
    }
    if (entry.files !== files.join("\n")) {
      this.misses++;
      return null;
    }
    this.hits++;
    return entry.result;
  }

  set(
    root: string,
    files: readonly string[],
    head: string,
    result: GitChurnResult
  ): void {
    this.entries.set(root, { head, files: files.join("\n"), result });
  }

  /** Aciertos y fallos: lo usan los tests y los diagnósticos. */
  stats(): { hits: number; misses: number } {
    return { hits: this.hits, misses: this.misses };
  }
}

/**
 * Qué ve git distinto de `HEAD`, para no reanalizar por ruido.
 *
 * `git status --porcelain=v2` contesta en decenas de milisegundos y trae la
 * lista exacta: modificados, altas, bajas, renombrados (con las dos rutas) y
 * sin seguimiento. Lo que git ignora no aparece, y eso es justo lo que el mapa
 * también ignora: compilar en `dist/` ya no dispara un análisis (ADR 0056).
 */
export type GitChangeKind =
  | "modified"
  | "added"
  | "deleted"
  | "renamed"
  | "untracked"
  | "conflict";

export interface GitChange {
  /** Ruta relativa a la raíz analizada, con `/`. */
  path: string;
  kind: GitChangeKind;
}

export interface GitStatus {
  /** `false` fuera de un repo, o si git no está instalado. */
  available: boolean;
  /** El commit actual; `null` en un repo sin commits todavía. */
  head: string | null;
  changes: GitChange[];
  warnings: string[];
}

/**
 * El estado del árbol de trabajo según git.
 *
 * `--no-optional-locks` importa: sin él, `git status` puede escribir el índice
 * y despertar a nuestro propio vigilante, que es un bucle de análisis gratis.
 */
export function gitStatus(rootInput: string): GitStatus {
  const root = realPath(rootInput);
  const result = runGit(
    root,
    [
      "--no-optional-locks",
      "status",
      "--porcelain=v2",
      "--branch",
      "--untracked-files=all",
      "-z"
    ],
    64 * 1024 * 1024
  );
  if (!result.ok) {
    return {
      available: false,
      head: null,
      changes: [],
      warnings: [`no se pudo leer el estado de git: ${result.error}`]
    };
  }
  const parsed = parseGitStatus(result.stdout);
  return { available: true, ...parsed, warnings: [] };
}

/**
 * Traduce el `-z` de `--porcelain=v2`.
 *
 * Los registros van separados por NUL y un renombrado ocupa **dos**: el nuevo
 * camino y, en el registro siguiente, el viejo. Con `-z` los caminos no van
 * entrecomillados, así que pueden llevar espacios y tildes tal cual.
 */
function parseGitStatus(output: string): {
  head: string | null;
  changes: GitChange[];
} {
  const records = output.split("\0");
  const changes: GitChange[] = [];
  let head: string | null = null;

  for (let index = 0; index < records.length; index++) {
    const record = records[index];
    if (!record) continue;

    if (record.startsWith("#")) {
      if (record.startsWith("# branch.oid ")) {
        const value = record.slice("# branch.oid ".length).trim();
        head = value && value !== "(initial)" ? value : null;
      }
      continue;
    }

    const kind = record[0];
    if (kind === "1") {
      changes.push({
        path: normalizeGitPath(tail(record, 8)),
        kind: changeKind(record[2], record[3])
      });
      continue;
    }
    if (kind === "2") {
      const path = normalizeGitPath(tail(record, 9));
      changes.push({ path, kind: "renamed" });
      const from = normalizeGitPath(records[index + 1] ?? "");
      if (from) {
        // El camino viejo ya no existe: cuenta como baja para el árbol.
        changes.push({ path: from, kind: "deleted" });
        index += 1;
      }
      continue;
    }
    if (kind === "u") {
      changes.push({
        path: normalizeGitPath(tail(record, 10)),
        kind: "conflict"
      });
      continue;
    }
    if (kind === "?") {
      changes.push({
        path: normalizeGitPath(record.slice(2)),
        kind: "untracked"
      });
      continue;
    }
    // `!` es lo ignorado: nunca entra en el mapa.
  }

  return { head, changes };
}

/** El campo X/Y de un registro `1`: `D` manda sobre el resto. */
function changeKind(staged: string | undefined, worktree: string | undefined): GitChangeKind {
  if (staged === "D" || worktree === "D") return "deleted";
  if (staged === "A") return "added";
  return "modified";
}

/** Lo que queda después de los primeros `fields` campos separados por espacios. */
function tail(record: string, fields: number): string {
  let index = 0;
  for (let seen = 0; seen < fields; seen++) {
    index = record.indexOf(" ", index);
    if (index === -1) return "";
    index += 1;
  }
  return record.slice(index);
}

/** Git siempre escribe `/`, también en Windows. */
function normalizeGitPath(value: string): string {
  return value.split("\\").join("/");
}

/** El commit actual, o `null` si el directorio no es un repo con commits. */
export function gitHead(rootInput: string): string | null {
  const result = runGit(realPath(rootInput), ["rev-parse", "HEAD"], 1024 * 1024);
  if (!result.ok) return null;
  const head = result.stdout.trim();
  return head === "" ? null : head;
}

interface GitRunResult {
  ok: boolean;
  stdout: string;
  error: string;
}

/** Normaliza rutas cortas (`JAMINS~1`) y symlinks antes de comparar prefijos. */
function realPath(input: string): string {
  const resolved = path.resolve(input);
  try {
    return fs.realpathSync.native(resolved);
  } catch {
    return resolved;
  }
}

function runGit(
  cwd: string,
  args: readonly string[],
  maxBuffer: number
): GitRunResult {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer,
    windowsHide: true
  });

  if (result.error) {
    return { ok: false, stdout: "", error: result.error.message };
  }
  if (result.status !== 0) {
    return {
      ok: false,
      stdout: result.stdout ?? "",
      error: (result.stderr ?? "").trim() || `git exited with ${result.status}`
    };
  }
  return { ok: true, stdout: result.stdout ?? "", error: "" };
}

/**
 * Exporta el HEAD a un directorio temporal y lo entrega a `use` (ADR 0072).
 *
 * `git archive` lee los objetos del repo y no toca el working tree ni el
 * índice del usuario. El directorio se borra siempre, también si `use` falla:
 * no quedan restos en el disco. Devuelve `null` si no hay HEAD o si el export
 * falla; en ese caso `use` no se ejecuta.
 */
export function withHeadExport<T>(
  rootInput: string,
  use: (exportedRoot: string) => T
): T | null {
  const root = realPath(rootInput);
  if (gitHead(root) === null) return null;

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-head-"));
  try {
    const archive = spawnSync("git", ["archive", "HEAD"], {
      cwd: root,
      maxBuffer: 512 * 1024 * 1024,
      windowsHide: true
    });
    if (archive.error || archive.status !== 0 || !archive.stdout) {
      return null;
    }
    const extract = spawnSync("tar", ["-x", "-C", dir], {
      input: archive.stdout,
      windowsHide: true
    });
    if (extract.error || extract.status !== 0) {
      return null;
    }
    return use(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
