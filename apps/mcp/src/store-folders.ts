import { compareStrings } from "./store-shared";
import type { StoreFile, StoreFolder } from "./store-types";

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
      const folder = ensure(folderPath);
      folder.files.push(file);
      folder.size += file.size;
      folder.maxComplexity = Math.max(folder.maxComplexity, file.complexity);
      folder.risk = Math.max(folder.risk, file.risk);
    }
  }

  for (const folder of folders.values()) {
    folder.files.sort((left, right) => compareStrings(left.path, right.path));
    folder.childFolders.sort(compareStrings);
  }
  return folders;
}
