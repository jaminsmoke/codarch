import { spawnSync } from "node:child_process";
import fs from "node:fs";
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
