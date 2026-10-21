import ignore, { type Ignore } from "ignore";
import { DEFAULT_EXTENSIONS } from "./extensions";
import type { FileSystem } from "./fs";

export { DEFAULT_EXTENSIONS };

/** Patrones que no dependen del `.gitignore` del proyecto. */
const ALWAYS_IGNORED = [".git", "node_modules", ".codarch"];

export interface WalkedFile {
  /** Ruta virtual absoluta: `/src/app/main.ts`. */
  absolutePath: string;
  /** Ruta relativa al root, siempre con `/`. */
  relativePath: string;
}

export interface WalkOptions {
  extensions?: readonly string[];
  /** Patrones extra, con la misma sintaxis que `.gitignore`. */
  ignore?: readonly string[];
}

export interface WalkResult {
  files: WalkedFile[];
  warnings: string[];
}

interface IgnoreLayer {
  /** Ruta del directorio dueño del `.gitignore`, relativa al root y con `/`. */
  base: string;
  matcher: Ignore;
}

interface PendingDirectory {
  /** Ruta virtual absoluta. */
  absolutePath: string;
  relativePath: string;
  layers: IgnoreLayer[];
}

/**
 * Recorre un proyecto y devuelve los ficheros TypeScript/JavaScript que no
 * están ignorados.
 *
 * El orden es determinista (por ruta relativa) y no sigue symlinks. Los
 * `.gitignore` anidados se aplican con la precedencia habitual: el más cercano
 * gana, y una negación puede volver a incluir un fichero.
 */
export function walkSourceFiles(
  fileSystem: FileSystem,
  options: WalkOptions = {}
): WalkResult {
  const extensions = options.extensions ?? DEFAULT_EXTENSIONS;
  const warnings: string[] = [];
  const files: WalkedFile[] = [];

  const rootMatcher = ignore().add(ALWAYS_IGNORED);
  for (const pattern of options.ignore ?? []) rootMatcher.add(pattern);

  const rootGitignore = readGitignore(fileSystem, "/", "", warnings);
  if (rootGitignore) rootMatcher.add(rootGitignore);

  const initialLayers: IgnoreLayer[] = [{ base: "", matcher: rootMatcher }];
  const stack: PendingDirectory[] = [
    { absolutePath: "/", relativePath: "", layers: initialLayers }
  ];

  while (stack.length > 0) {
    const directory = stack.pop() as PendingDirectory;
    let entries: ReturnType<FileSystem["readDirectory"]>;

    try {
      entries = fileSystem.readDirectory(directory.absolutePath);
    } catch (error) {
      warnings.push(
        `no se pudo leer ${directory.relativePath || "."}: ${(error as Error).message}`
      );
      continue;
    }

    entries.sort((left, right) =>
      left.name < right.name ? -1 : left.name > right.name ? 1 : 0
    );

    for (const entry of entries) {
      const relativePath = directory.relativePath
        ? `${directory.relativePath}/${entry.name}`
        : entry.name;
      const absolutePath =
        directory.absolutePath === "/"
          ? `/${entry.name}`
          : `${directory.absolutePath}/${entry.name}`;

      if (entry.isDirectory) {
        if (isIgnored(directory.layers, relativePath, true)) continue;
        const nested = readGitignore(fileSystem, absolutePath, relativePath, warnings);
        const layers = nested
          ? [...directory.layers, { base: relativePath, matcher: ignore().add(nested) }]
          : directory.layers;
        stack.push({ absolutePath, relativePath, layers });
      } else if (entry.isFile) {
        if (isIgnored(directory.layers, relativePath, false)) continue;
        if (!matchesExtension(entry.name, extensions)) continue;
        files.push({ absolutePath, relativePath });
      }
    }
  }

  files.sort((left, right) =>
    left.relativePath < right.relativePath
      ? -1
      : left.relativePath > right.relativePath
        ? 1
        : 0
  );
  warnings.sort();

  return { files, warnings };
}

function readGitignore(
  fileSystem: FileSystem,
  absoluteDirectory: string,
  relativeBase: string,
  warnings: string[]
): string | null {
  const file =
    absoluteDirectory === "/"
      ? "/.gitignore"
      : `${absoluteDirectory}/.gitignore`;
  try {
    return fileSystem.tryReadFile(file);
  } catch (error) {
    warnings.push(
      `no se pudo leer ${relativeBase ? `${relativeBase}/` : ""}.gitignore: ${(error as Error).message}`
    );
    return null;
  }
}

function isIgnored(layers: IgnoreLayer[], relativePath: string, isDirectory: boolean): boolean {
  let ignored = false;

  for (const layer of layers) {
    const localPath = layer.base
      ? relativePath.slice(layer.base.length + 1)
      : relativePath;
    if (!localPath) continue;

    const probe = isDirectory ? `${localPath}/` : localPath;
    const result = layer.matcher.test(probe);
    if (result.ignored) ignored = true;
    else if (result.unignored) ignored = false;
  }

  return ignored;
}

function matchesExtension(name: string, extensions: readonly string[]): boolean {
  const lower = name.toLowerCase();
  return extensions.some((extension) => lower.endsWith(extension));
}
