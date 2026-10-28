import { basename } from "node:path";
import { analyzeFiles, type AnalyzeCoreResult } from "./analyze-core";
import type { ParseCache } from "./cache";
import type { FileSystem } from "./fs";
import { ChurnCache, collectGitChurn, gitHead } from "./git";
import { CSharpParser } from "./csharp/parser";
import { GoParser } from "./go/parser";
import { JavaParser } from "./java/parser";
import { NodeFileSystem } from "./node-fs";
import { PythonParser } from "./python/parser";
import { TypeScriptParser } from "./ts/parser";

export type { UnresolvedImportIssue } from "./analyze-core";

export interface AnalyzeOptions {
  /** Patrones extra de exclusión, con sintaxis de `.gitignore`. */
  ignore?: readonly string[];
  /** Extensiones a analizar. Por defecto, TS y JS. */
  extensions?: readonly string[];
  /** Nombre visible; por defecto, `name` del package.json o el directorio. */
  projectName?: string;
  /** Lee churn de git. Por defecto, `true`; `false` para tests sin historial. */
  git?: boolean;
  /**
   * Puerto de ficheros. Por defecto, el disco; el navegador usa el fichero en
   * memoria con los ficheros que ha elegido el usuario.
   */
  fileSystem?: FileSystem;
  /** Raíz virtual del análisis. */
  root?: string;
  /**
   * El parseo de la vez anterior, para reanalizar solo lo que cambió
   * (ADR 0056). Sin caché, el análisis es completo.
   */
  cache?: ParseCache;
  /**
   * El churn de la vez anterior. Lo pasan los procesos que viven —el del
   * escritorio y `serve`—; el CLI analiza una vez y no lo necesita.
   */
  churnCache?: ChurnCache;
}

export interface GitSummary {
  enabled: boolean;
  commits: number;
  authors: number;
  shallow: boolean;
}

export interface AnalyzeResult extends AnalyzeCoreResult {
  git: GitSummary;
}

/**
 * Analiza un proyecto TypeScript/JavaScript y devuelve un snapshot `cc.json`.
 *
 * El pipeline es secuencial y no guarda árboles de tree-sitter: recorrido,
 * lectura/parseo fichero a fichero, resolución de imports, grafo y snapshot.
 *
 * Todo el acceso a ficheros pasa por el puerto `FileSystem`: el CLI usa el
 * disco y el navegador el fichero en memoria.
 *
 * Los parsers van en una lista y el análisis elige por extensión (ADR 0090).
 * Hoy la lista es TS/JS, Java, Python, Go y C#; cuando entre otro lenguaje se
 * suma aquí, no en cada llamador.
 */
export function analyzeRepository(
  rootInput: string,
  options: AnalyzeOptions = {}
): AnalyzeResult {
  const fileSystem = options.fileSystem ?? new NodeFileSystem(rootInput);
  const useGit = options.git !== false;
  // El commit viaja en el snapshot: `inspect` lo enseña y el historial lo apunta.
  const commitHash = useGit ? (gitHead(rootInput) ?? undefined) : undefined;

  const result = analyzeFiles({
    fileSystem,
    root: options.root ?? "/",
    projectName: options.projectName,
    fallbackName: basename(rootInput),
    ignore: options.ignore,
    extensions: options.extensions,
    parsers: [
      new TypeScriptParser(),
      new JavaParser(),
      new PythonParser(),
      new GoParser(),
      new CSharpParser()
    ],
    cache: options.cache,
    commitHash,
    churn: (relativePaths) => {
      const git = churnWithCache(
        rootInput,
        relativePaths,
        useGit,
        options.churnCache
      );
      return {
        metrics: git.metrics,
        warnings: git.warnings,
        enabled: git.enabled,
        commits: git.commits,
        authors: git.authors,
        shallow: git.shallow
      };
    }
  });

  const churn = result.churn;
  return {
    ...result,
    git: {
      enabled: churn?.enabled ?? false,
      commits: churn?.commits ?? 0,
      authors: churn?.authors ?? 0,
      shallow: churn?.shallow ?? false
    }
  };
}

/** El churn, de la caché si el historial y los ficheros no cambiaron. */
function churnWithCache(
  root: string,
  files: readonly string[],
  enabled: boolean,
  cache: ChurnCache | undefined
) {
  if (!cache || !enabled) {
    return collectGitChurn(root, files, { enabled });
  }
  const head = gitHead(root);
  // Sin commit actual no hay clave fiable: se mide y no se guarda.
  if (!head) return collectGitChurn(root, files, { enabled });

  const cached = cache.get(root, files, head);
  if (cached) return cached;

  const measured = collectGitChurn(root, files, { enabled });
  if (measured.enabled) cache.set(root, files, head, measured);
  return measured;
}
