import { analyzeFiles, type AnalyzeCoreResult } from "./analyze-core";
import type { FileSystem } from "./fs";
import { collectGitChurn } from "./git";
import { NodeFileSystem } from "./node-fs";
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
 */
export function analyzeRepository(
  rootInput: string,
  options: AnalyzeOptions = {}
): AnalyzeResult {
  const fileSystem = options.fileSystem ?? new NodeFileSystem(rootInput);
  const useGit = options.git !== false;

  const result = analyzeFiles({
    fileSystem,
    root: options.root ?? "/",
    projectName: options.projectName,
    ignore: options.ignore,
    extensions: options.extensions,
    parser: new TypeScriptParser(),
    churn: (relativePaths) => {
      const git = collectGitChurn(rootInput, relativePaths, { enabled: useGit });
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
