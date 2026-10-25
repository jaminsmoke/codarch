import type { CcJson } from "@codarch/schema";
import { analyzeFiles } from "./analyze-core";
import { analyzeRepository } from "./analyze";
import { collectGitChurn, gitHead, withHeadExport } from "./git";
import { NodeFileSystem } from "./node-fs";
import { TypeScriptParser } from "./ts/parser";

export interface HeadComparison {
  /** El HEAD exportado con `git archive`. */
  base: CcJson;
  /** El working tree del usuario. */
  head: CcJson;
}

/**
 * Compara el working tree con su último commit.
 *
 * El base sale de un export temporal del HEAD y el head del propio directorio.
 * Los dos llevan el mismo `projectName` (el directorio temporal tiene un nombre
 * aleatorio y cambiaría el checksum), el mismo commit y el mismo churn: el
 * export no tiene `.git`, así que el churn se mide sobre el repo del usuario.
 * Si solo un lado lo llevara, `number_of_commits` aparecería como cambiado en
 * todos los ficheros.
 *
 * Devuelve `null` si no hay commits o si el export del HEAD falla.
 */
export function compareWorkingTreeWithHead(
  rootInput: string
): HeadComparison | null {
  const projectName = workingTreeName(rootInput);
  const commitHash = gitHead(rootInput) ?? undefined;

  return withHeadExport(rootInput, (exportedRoot) => {
    const base = analyzeFiles({
      fileSystem: new NodeFileSystem(exportedRoot),
      root: "/",
      projectName,
      parser: new TypeScriptParser(),
      commitHash,
      churn: (relativePaths) => collectGitChurn(rootInput, relativePaths)
    }).snapshot;

    const head = analyzeRepository(rootInput, { projectName }).snapshot;
    return { base, head };
  });
}

/** El nombre del proyecto que pondría `analyze` en el working tree. */
function workingTreeName(rootInput: string): string {
  const trimmed = rootInput.replace(/[\\/]+$/, "");
  return trimmed.split(/[\\/]/).pop() || "proyecto";
}
