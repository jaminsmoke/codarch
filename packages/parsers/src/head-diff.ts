import fs from "node:fs";
import path from "node:path";
import {
  diffSnapshots,
  type DiffReport,
  type FileSource
} from "@codarch/metrics";
import type { CcJson } from "@codarch/schema";
import { analyzeFiles } from "./analyze-core";
import { analyzeRepository } from "./analyze";
import { collectGitChurn, gitHead, withHeadExport } from "./git";
import { JavaParser } from "./java/parser";
import { NodeFileSystem } from "./node-fs";
import { TypeScriptParser } from "./ts/parser";

export interface HeadComparison {
  /** El HEAD exportado con `git archive`. */
  base: CcJson;
  /** El working tree del usuario. */
  head: CcJson;
  /**
   * El reporte, ya con las líneas de cada símbolo.
   *
   * Se calcula aquí porque medirlas necesita las dos fuentes, y la base solo
   * existe mientras dura el export: fuera de esta función ya no hay texto del
   * HEAD que leer ✓.
   */
  report: DiffReport;
}

export interface HeadComparisonOptions {
  /**
   * El alcance del repo (ADR 0038).
   *
   * Sin esto, los dos lados incluyen ficheros que el mapa excluye y la pestaña
   * Cambios enseña cambios que no están en el snapshot.
   */
  ignore?: readonly string[];
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
  rootInput: string,
  options: HeadComparisonOptions = {}
): HeadComparison | null {
  const projectName = workingTreeName(rootInput);
  const commitHash = gitHead(rootInput) ?? undefined;
  const ignore = [...(options.ignore ?? [])];

  return withHeadExport(rootInput, (exportedRoot) => {
    const base = analyzeFiles({
      fileSystem: new NodeFileSystem(exportedRoot),
      root: "/",
      projectName,
      ignore,
      parsers: [new TypeScriptParser(), new JavaParser()],
      commitHash,
      churn: (relativePaths) => collectGitChurn(rootInput, relativePaths)
    }).snapshot;

    const head = analyzeRepository(rootInput, { projectName, ignore }).snapshot;
    return {
      base,
      head,
      report: diffSnapshots(base, head, {
        source: sourceReader(exportedRoot, rootInput)
      })
    };
  });
}

/**
 * Lee la fuente de un lado para medir el cuerpo de un símbolo.
 *
 * La base es el export del HEAD (`/` es su raíz) y el head el directorio del
 * usuario. Un fichero que no se puede leer —un símbolo borrado, un fichero
 * binario— devuelve `null`: el reporte dirá que no lo midió.
 */
function sourceReader(baseRoot: string, headRoot: string): FileSource {
  return (side, relativePath) => {
    try {
      return fs.readFileSync(
        path.join(side === "base" ? baseRoot : headRoot, relativePath),
        "utf8"
      );
    } catch {
      return null;
    }
  };
}

/** El nombre del proyecto que pondría `analyze` en el working tree. */
function workingTreeName(rootInput: string): string {
  const trimmed = rootInput.replace(/[\\/]+$/, "");
  return trimmed.split(/[\\/]/).pop() || "proyecto";
}
