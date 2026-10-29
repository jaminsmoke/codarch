import ignore, { type Ignore } from "ignore";
import { DEFAULT_EXTENSIONS } from "./extensions";
import type { FileSystem } from "./fs";

export { DEFAULT_EXTENSIONS };

/** Patrones que no dependen del `.gitignore` del proyecto. */
const ALWAYS_IGNORED = [".git", "node_modules", ".codarch"];

/** La carpeta de estado, que un alcance mira pero en la que nunca entra. */
const CODARCH_DIRECTORY = ".codarch";

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
 * Recorre un proyecto y devuelve los ficheros de las extensiones pedidas.
 *
 * El orden es determinista (por ruta relativa) y no sigue symlinks. Los
 * `.gitignore` anidados se aplican con la precedencia habitual: el más cercano
 * gana, y una negación puede volver a incluir un fichero.
 */
export function walkSourceFiles(
  fileSystem: FileSystem,
  options: WalkOptions = {}
): WalkResult {
  const { files, warnings } = walkAllFiles(fileSystem, options);
  const extensions = options.extensions ?? DEFAULT_EXTENSIONS;
  return {
    files: files.filter((file) => matchesExtension(file.relativePath, extensions)),
    warnings
  };
}

export interface SplitWalkResult {
  /** Los ficheros que miden los parsers. */
  code: WalkedFile[];
  /** Los que no son código: documentos, configuración y assets (ADR 0093). */
  rest: WalkedFile[];
  warnings: string[];
}

/**
 * El recorrido, partido en una sola pasada (ADR 0093).
 *
 * El mapa del resto no cuesta un segundo recorrido: se decide por fichero, con
 * los mismos `.gitignore`, el mismo orden y sin leer nada dos veces.
 */
export function walkCodeAndRest(
  fileSystem: FileSystem,
  options: WalkOptions = {}
): SplitWalkResult {
  const { files, warnings } = walkAllFiles(fileSystem, options);
  const extensions = options.extensions ?? DEFAULT_EXTENSIONS;
  const code: WalkedFile[] = [];
  const rest: WalkedFile[] = [];
  for (const file of files) {
    if (matchesExtension(file.relativePath, extensions)) code.push(file);
    else rest.push(file);
  }
  return { code, rest, warnings };
}

/** El recorrido sin mirar extensiones: todo lo que no está ignorado. */
function walkAllFiles(fileSystem: FileSystem, options: WalkOptions): WalkResult {
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

export interface WalkedDirectory {
  /** Ruta virtual absoluta: `/apps/desktop/.codarch`. */
  absolutePath: string;
  /** Ruta relativa al root, siempre con `/`. */
  relativePath: string;
}

/**
 * Las carpetas de un proyecto, con las mismas exclusiones que el análisis.
 *
 * Es el recorrido de `walkSourceFiles` sin la parte de ficheros: sirve para
 * saber dónde hay un `.codarch/` sin mirar lo que el análisis no mira —una
 * carpeta ignorada por `.gitignore` no es un alcance del padre—. A diferencia
 * de aquel, `.codarch/` no se salta: se devuelve como carpeta y no se entra en
 * ella, porque dentro solo hay estado.
 */
export function walkProjectDirectories(
  fileSystem: FileSystem,
  options: WalkOptions = {}
): { directories: WalkedDirectory[]; warnings: string[] } {
  const warnings: string[] = [];
  const directories: WalkedDirectory[] = [];

  // Sin `.codarch`: aquí es justo lo que se busca, y se corta al encontrarlo.
  const rootMatcher = ignore().add([".git", "node_modules"]);
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
      if (!entry.isDirectory) continue;
      const relativePath = directory.relativePath
        ? `${directory.relativePath}/${entry.name}`
        : entry.name;
      const absolutePath =
        directory.absolutePath === "/"
          ? `/${entry.name}`
          : `${directory.absolutePath}/${entry.name}`;

      if (entry.name === CODARCH_DIRECTORY) {
        directories.push({ absolutePath, relativePath });
        continue;
      }

      if (isIgnored(directory.layers, relativePath, true)) continue;
      const nested = readGitignore(fileSystem, absolutePath, relativePath, warnings);
      const layers = nested
        ? [...directory.layers, { base: relativePath, matcher: ignore().add(nested) }]
        : directory.layers;
      stack.push({ absolutePath, relativePath, layers });
    }
  }

  directories.sort((left, right) =>
    left.relativePath < right.relativePath
      ? -1
      : left.relativePath > right.relativePath
        ? 1
        : 0
  );
  warnings.sort();

  return { directories, warnings };
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
