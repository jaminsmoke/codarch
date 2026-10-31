import { aggregateFolder } from "@codarch/metrics";
import { compareStrings } from "./store-shared";
import type { StoreFile, StoreFolder } from "./store-types";

/**
 * Indexa el árbol de carpetas y agrega tamaño, complejidad y riesgo con el
 * helper compartido (ADR 0092). Aquí solo se arma la estructura; los totales
 * salen de `aggregateFolder`, la misma pieza que usa la UI.
 */
export function buildFolders(files: readonly StoreFile[]): Map<string, StoreFolder> {
  const folders = new Map<string, StoreFolder>();
  const ensure = (folderPath: string): StoreFolder => {
    const existing = folders.get(folderPath);
    if (existing) return existing;
    const name =
      folderPath === ""
        ? "(raíz)"
        : folderPath.slice(folderPath.lastIndexOf("/") + 1);
    const folder: StoreFolder = {
      path: folderPath,
      name,
      files: [],
      childFolders: [],
      size: 0,
      maxComplexity: 0,
      risk: 0
    };
    folders.set(folderPath, folder);
    if (folderPath !== "") {
      const parentPath = folderPath.includes("/")
        ? folderPath.slice(0, folderPath.lastIndexOf("/"))
        : "";
      ensure(parentPath).childFolders.push(folderPath);
    }
    return folder;
  };

  ensure("");
  for (const file of files) {
    const segments = file.path.split("/");
    const folderPaths = [""];
    let current = "";
    for (let index = 0; index < segments.length - 1; index++) {
      current = current ? `${current}/${segments[index]}` : (segments[index] as string);
      folderPaths.push(current);
    }
    for (const folderPath of folderPaths) {
      ensure(folderPath).files.push(file);
    }
  }

  for (const folder of folders.values()) {
    folder.files.sort((left, right) => compareStrings(left.path, right.path));
    folder.childFolders.sort(compareStrings);
    const agg = aggregateFolder(
      folder.files.map((file) => ({
        path: file.path,
        size: file.size,
        complexity: file.complexity,
        risk: file.risk
      }))
    );
    folder.size = agg.size;
    folder.maxComplexity = agg.maxComplexity;
    folder.risk = agg.risk;
  }
  return folders;
}