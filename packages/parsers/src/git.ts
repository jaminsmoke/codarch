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
  const warnings: string[] = [];

  const topLevel = runGit(root, ["rev-parse", "--show-toplevel"], maxBuffer);
  if (!topLevel.ok) {
    return {
      ...EMPTY,
      metrics: new Map(),
      warnings: [`no hay historial git utilizable: ${topLevel.error}`]
    };
  }

  const repoRoot = realPath(topLevel.stdout.trim());
  const shallowResult = runGit(
    repoRoot,
    ["rev-parse", "--is-shallow-repository"],
    maxBuffer
  );
  const shallow =
    shallowResult.ok && shallowResult.stdout.trim().toLowerCase() === "true";
  if (shallow) {
    warnings.push(
      "el repositorio es shallow: el churn puede estar incompleto"
    );
  }

  const log = runGit(
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
  if (!log.ok) {
    return {
      ...EMPTY,
      shallow,
      warnings: [...warnings, `no se pudo leer git log: ${log.error}`]
    };
  }

  const wanted = new Set(files);
  const commitsByFile = new Map<string, number>();
  const authorsByFile = new Map<string, Set<string>>();
  const authors = new Set<string>();
  let commits = 0;
  let currentAuthor = "";
  let touched = new Set<string>();

  const flushCommit = (): void => {
    if (!currentAuthor || touched.size === 0) return;
    commits++;
    authors.add(currentAuthor);
    for (const file of touched) {
      commitsByFile.set(file, (commitsByFile.get(file) ?? 0) + 1);
      let fileAuthors = authorsByFile.get(file);
      if (!fileAuthors) {
        fileAuthors = new Set();
        authorsByFile.set(file, fileAuthors);
      }
      fileAuthors.add(currentAuthor);
    }
    touched = new Set();
    currentAuthor = "";
  };

  for (const rawLine of log.stdout.split(/\r?\n/)) {
    if (rawLine.startsWith(COMMIT_PREFIX)) {
      flushCommit();
      const fields = rawLine.slice(COMMIT_PREFIX.length).split("\t");
      const author = fields[1]?.trim() ?? "";
      currentAuthor = author || "(sin autor)";
      continue;
    }

    if (!currentAuthor || rawLine === "") continue;
    const fields = rawLine.split("\t");
    if (fields.length < 3) continue;

    // El path puede contener tabs; git lo escapa salvo con core.quotePath=false.
    const gitPath = fields.slice(2).join("\t");
    if (!gitPath) continue;

    const relative = path.relative(root, path.resolve(repoRoot, gitPath));
    if (
      relative === "" ||
      relative === ".." ||
      relative.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relative)
    ) {
      continue;
    }
    const normalized = relative.split(path.sep).join("/");
    if (!wanted.has(normalized)) continue;
    touched.add(normalized);
  }
  flushCommit();

  const metrics = new Map<string, GitChurnFile>();
  for (const file of files) {
    metrics.set(file, {
      commits: commitsByFile.get(file) ?? 0,
      authors: authorsByFile.get(file)?.size ?? 0
    });
  }

  return {
    metrics,
    commits,
    authors: authors.size,
    shallow,
    enabled: true,
    warnings
  };
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
