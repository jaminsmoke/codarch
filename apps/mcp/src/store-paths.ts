import { compareStrings } from "./store-shared";
import {
  McpDataError,
  type StoreFile,
  type StoreFolder
} from "./store-types";

export interface PathLookups {
  files: readonly StoreFile[];
  filesById: ReadonlyMap<string, StoreFile>;
  filesByPath: ReadonlyMap<string, StoreFile>;
  folders: ReadonlyMap<string, StoreFolder>;
  rootName: string | null;
}

export function normalizePath(input: string): string {
  let value = input.trim().replaceAll("\\", "/");
  if (value === "" || value === "." || value === "./") return "";
  if (value.startsWith("/") || /^[A-Za-z]:\//.test(value)) {
    throw new McpDataError(
      `"${input}" es absoluta; usa una ruta relativa al proyecto`
    );
  }

  value = value.replace(/^\.\//, "").replace(/\/+/g, "/").replace(/\/+$/, "");
  const segments: string[] = [];
  for (const segment of value.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      throw new McpDataError(`"${input}" intenta salir del proyecto`);
    }
    segments.push(segment);
  }
  value = segments.join("/");
  return value;
}

export function resolveTarget(
  lookups: PathLookups,
  input: string
): StoreFile | StoreFolder {
  if (lookups.filesById.has(input)) {
    return lookups.filesById.get(input) as StoreFile;
  }

  const value = normalizePath(input);
  const file = lookups.filesByPath.get(value);
  if (file) return file;
  const folder = lookups.folders.get(value);
  if (folder) return folder;

  if (lookups.rootName) {
    if (value === lookups.rootName) {
      const rootFolder = lookups.folders.get("");
      if (rootFolder) return rootFolder;
    }
    const prefix = `${lookups.rootName}/`;
    if (value.startsWith(prefix)) {
      const relative = value.slice(prefix.length);
      const strippedFile = lookups.filesByPath.get(relative);
      if (strippedFile) return strippedFile;
      const strippedFolder = lookups.folders.get(relative);
      if (strippedFolder) return strippedFolder;
    }
  }

  throw new McpDataError(withSuggestions(lookups, input, value));
}

function withSuggestions(
  lookups: PathLookups,
  input: string,
  normalized: string
): string {
  const wanted = normalized.slice(normalized.lastIndexOf("/") + 1).toLowerCase();
  const suggestions = new Set<string>();
  for (const file of lookups.files) {
    if (file.name.toLowerCase() === wanted) suggestions.add(file.path);
  }
  for (const folder of lookups.folders.values()) {
    if (folder.name.toLowerCase() === wanted) suggestions.add(folder.path);
  }
  const suffix = [...suggestions].sort(compareStrings).slice(0, 3);
  const hint =
    suffix.length > 0
      ? ` Quizá quisiste decir: ${suffix.map((value) => `"${value}"`).join(", ")}.`
      : "";
  return `no encuentro "${input}" en el snapshot.${hint}`;
}
