import {
  CC_JSON_VERSION,
  fileId,
  folderId,
  type CcAttributeDescriptor,
  type CcDependencyLens,
  type CcEdge,
  type CcJson,
  type CcMetricsLens,
  type CcNode,
  type CcRestKind,
  type CcRestLens,
  type CcRestNode
} from "@codarch/schema/browser";
import type { FileSystem } from "./fs";
import {
  addFileNode,
  checksumFor,
  compareStrings,
  sanitizeNodeName,
  sortChildren
} from "./snapshot";
import type { WalkedFile } from "./walk";

/**
 * El mapa de lo que no es código (ADR 0093).
 *
 * Este módulo no parsea nada: mide tamaño, cuenta líneas de lo que es texto y
 * lee los enlaces de los documentos. Los ficheros que no son código viven en su
 * propio snapshot, así que el checksum del código no cambia porque cambie un
 * `README.md`.
 */

const DOC_EXTENSIONS = [".md", ".mdx", ".txt", ".rst", ".adoc"] as const;
const CONFIG_EXTENSIONS = [
  ".json",
  ".jsonc",
  ".yml",
  ".yaml",
  ".toml",
  ".ini",
  ".cfg",
  ".conf",
  ".properties"
] as const;
const ASSET_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".avif",
  ".ico",
  ".bmp",
  ".svg",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".eot",
  ".mp4",
  ".webm",
  ".mov",
  ".mp3",
  ".wav",
  ".ogg",
  ".pdf",
  ".zip",
  ".gz",
  ".tgz",
  ".tar",
  ".jar",
  ".class",
  ".dll",
  ".so",
  ".dylib",
  ".exe"
] as const;

/** Nombres que son documento sin depender de la extensión. */
const DOC_NAMES = new Set([
  "license",
  "licence",
  "notice",
  "readme",
  "changelog",
  "contributing",
  "authors"
]);

/** Nombres que son configuración sin depender de la extensión. */
const CONFIG_NAMES = new Set([
  "dockerfile",
  "makefile",
  "cmakelists.txt",
  ".gitignore",
  ".gitattributes",
  ".editorconfig",
  ".npmrc",
  ".nvmrc",
  ".prettierrc",
  ".eslintrc",
  ".babelrc",
  ".dockerignore"
]);

/**
 * Los lockfiles son `asset`, no `config`: nadie los edita a mano y su tamaño
 * dice más de la instalación que de las decisiones del equipo.
 */
const LOCK_FILE_NAMES = new Set([
  "package-lock.json",
  "npm-shrinkwrap.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  "bun.lock",
  "cargo.lock",
  "composer.lock",
  "poetry.lock",
  "gemfile.lock",
  "pipfile.lock"
]);

const TEXT_EXTENSIONS = new Set<string>([
  ...DOC_EXTENSIONS,
  ...CONFIG_EXTENSIONS,
  ".sh",
  ".bash",
  ".zsh",
  ".ps1",
  ".bat",
  ".cmd",
  ".sql",
  ".graphql",
  ".gql",
  ".html",
  ".htm",
  ".css",
  ".scss",
  ".less",
  ".svg",
  ".lock",
  ".log",
  ".csv",
  ".tsv",
  ".diff",
  ".patch"
]);

const TEXT_NAMES = new Set<string>([...DOC_NAMES, ...CONFIG_NAMES, ...LOCK_FILE_NAMES]);

const DOC_EXTENSION_SET = new Set<string>(DOC_EXTENSIONS);
const CONFIG_EXTENSION_SET = new Set<string>(CONFIG_EXTENSIONS);
const ASSET_EXTENSION_SET = new Set<string>(ASSET_EXTENSIONS);

const REST_DESCRIPTORS: Record<string, CcAttributeDescriptor> = {
  bytes: {
    title: "Tamaño",
    description: "Bytes del fichero",
    direction: 0
  },
  loc: {
    title: "Líneas",
    description: "Líneas físicas del fichero de texto",
    direction: 0
  }
};

const REST_EDGE_DESCRIPTORS: Record<string, CcAttributeDescriptor> = {
  weight: {
    title: "Peso",
    description: "Número de enlaces entre los dos documentos",
    direction: 0
  }
};

/** Un fichero que no es código, ya medido. */
export interface RestFile {
  relativePath: string;
  kind: CcRestKind;
  /** Tamaño en bytes: del contenido si es texto, del `stat` si es un asset. */
  bytes: number;
  /** Líneas, solo en lo que se lee como texto. */
  loc?: number;
  /** Los destinos que enlaza un documento, tal y como se escriben. */
  linkTargets?: readonly string[];
}

export interface RestInput {
  projectName: string;
  files: readonly RestFile[];
  /** El commit del repo, como en el snapshot del código: no entra en el checksum. */
  commitHash?: string;
}

/** El tipo de un fichero que no es código (ADR 0093). */
export function kindForPath(relativePath: string): CcRestKind {
  const name = baseName(relativePath).toLowerCase();
  const extension = extensionOf(name);

  if (LOCK_FILE_NAMES.has(name)) return "asset";
  if (DOC_NAMES.has(name) || DOC_EXTENSION_SET.has(extension)) return "doc";
  if (ASSET_EXTENSION_SET.has(extension)) return "asset";
  if (CONFIG_NAMES.has(name) || CONFIG_EXTENSION_SET.has(extension)) return "config";
  return "other";
}

/** Si el fichero se lee como texto, que es lo que permite contar líneas. */
export function isTextualPath(relativePath: string): boolean {
  const name = baseName(relativePath).toLowerCase();
  return TEXT_NAMES.has(name) || TEXT_EXTENSIONS.has(extensionOf(name));
}

/**
 * Mide un fichero del resto.
 *
 * Un fichero de texto se lee entero —hay que contar líneas y, si es un
 * documento, sus enlaces—; de un binario solo se guarda su tamaño y no se lee.
 */
export function measureRestFile(
  fileSystem: FileSystem,
  file: WalkedFile,
  warnings: string[]
): RestFile | null {
  const kind = kindForPath(file.relativePath);

  if (!isTextualPath(file.relativePath)) {
    return {
      relativePath: file.relativePath,
      kind,
      bytes: fileSystem.stat?.(file.absolutePath)?.size ?? 0
    };
  }

  let source: string;
  try {
    source = fileSystem.readFile(file.absolutePath);
  } catch (error) {
    warnings.push(
      `no se pudo leer ${file.relativePath}: ${(error as Error).message}`
    );
    return null;
  }

  const measured: RestFile = {
    relativePath: file.relativePath,
    kind,
    bytes: utf8Bytes(source),
    loc: linesOf(source)
  };
  if (kind === "doc" && /\.mdx?$/i.test(file.relativePath)) {
    const targets = linkTargets(source);
    if (targets.length > 0) measured.linkTargets = targets;
  }
  return measured;
}

/**
 * Los destinos de los enlaces de un documento que apuntan a otro documento.
 *
 * Se descartan los enlaces externos, las anclas y todo lo que no sea markdown:
 * el grafo del resto es de documentos que se leen, no de imágenes que se
 * enseñan.
 */
export function linkTargets(source: string): string[] {
  const targets: string[] = [];
  for (const match of source.matchAll(/\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+["'][^"']*["'])?\s*\)/g)) {
    const target = match[1];
    // Fuera lo que no es una ruta del repo: esquemas, `//host` y rutas de sitio.
    if (!target || /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/)/i.test(target)) continue;
    const clean = stripAnchor(target);
    if (!/\.mdx?$/i.test(clean)) continue;
    targets.push(target);
  }
  return targets;
}

/**
 * Construye el `cc.json` del resto: árbol, `bytes`, `loc`, la lente `rest` y
 * los enlaces entre documentos.
 *
 * Sigue las reglas del snapshot del código: nodos ordenados por ruta, aristas
 * por `(from, to)`, checksum de `{ files, lenses }` y nada de fechas ni rutas
 * absolutas (ADR 0093).
 */
export function buildRestSnapshot(input: RestInput): CcJson {
  const files = [...input.files].sort((left, right) =>
    compareStrings(left.relativePath, right.relativePath)
  );

  const root: CcNode = {
    id: folderId(""),
    name: sanitizeNodeName(input.projectName),
    type: "Folder",
    children: []
  };
  const folders = new Map<string, CcNode>([["", root]]);
  const attributes: Record<string, Record<string, number>> = {};
  const nodes: Record<string, CcRestNode> = {};

  for (const file of files) {
    const node = addFileNode(root, folders, file.relativePath);
    if (!node) continue;

    const values: Record<string, number> = { bytes: file.bytes };
    if (file.loc !== undefined) values.loc = file.loc;
    attributes[node.id] = values;

    nodes[node.id] =
      file.loc === undefined
        ? { kind: file.kind }
        : { kind: file.kind, loc: file.loc };
  }
  sortChildren(root);

  const edges = restEdges(files);

  const lenses = {
    metrics: {
      attributes,
      attributeDescriptors: REST_DESCRIPTORS,
      attributeTypes: { bytes: "absolute", loc: "absolute" }
    } satisfies CcMetricsLens,
    dependency: {
      edges,
      attributeDescriptors: REST_EDGE_DESCRIPTORS,
      attributeTypes: { weight: "absolute" }
    } satisfies CcDependencyLens,
    rest: { nodes } satisfies CcRestLens
  };

  return {
    meta: {
      projectName: input.projectName,
      apiVersion: CC_JSON_VERSION,
      // El commit no entra en el checksum: dos clones del mismo repo pesan igual.
      ...(input.commitHash ? { commitHash: input.commitHash } : {}),
      checksum: checksumFor([root], lenses)
    },
    files: [root],
    lenses
  };
}

/** Las aristas de documento a documento, con su peso y en orden estable. */
function restEdges(files: readonly RestFile[]): CcEdge[] {
  const known = new Set(files.map((file) => file.relativePath));
  const links = new Map<string, { from: string; to: string; weight: number }>();

  for (const file of files) {
    for (const target of file.linkTargets ?? []) {
      const resolved = resolveDocLink(file.relativePath, target);
      // Un enlace a sí mismo no es una arista: es una ancla mal escrita.
      if (!resolved || resolved === file.relativePath || !known.has(resolved)) {
        continue;
      }
      const key = `${file.relativePath}\u0000${resolved}`;
      const entry = links.get(key);
      if (entry) entry.weight += 1;
      else links.set(key, { from: file.relativePath, to: resolved, weight: 1 });
    }
  }

  return [...links.values()]
    .sort(
      (left, right) =>
        compareStrings(left.from, right.from) || compareStrings(left.to, right.to)
    )
    .map(({ from, to, weight }) => ({
      fromId: fileId(from),
      toId: fileId(to),
      attributes: { weight }
    }));
}

/** La ruta relativa a la raíz de un enlace, o `null` si sale del proyecto. */
function resolveDocLink(fromPath: string, target: string): string | null {
  const clean = stripAnchor(target);
  if (!clean) return null;

  const slash = fromPath.lastIndexOf("/");
  const parts = slash === -1 ? [] : fromPath.slice(0, slash).split("/");

  for (const segment of clean.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      if (parts.length === 0) return null;
      parts.pop();
      continue;
    }
    parts.push(segment);
  }
  return parts.join("/");
}

/** Un destino sin ancla ni consulta. */
function stripAnchor(target: string): string {
  const hash = target.indexOf("#");
  const withoutAnchor = hash === -1 ? target : target.slice(0, hash);
  const question = withoutAnchor.indexOf("?");
  return (question === -1
    ? withoutAnchor
    : withoutAnchor.slice(0, question)
  ).trim();
}

function linesOf(source: string): number {
  const text = source.replace(/\r\n?/g, "\n");
  if (text === "") return 0;
  return text.endsWith("\n")
    ? text.slice(0, -1).split("\n").length
    : text.split("\n").length;
}

/**
 * Los bytes UTF-8 de un texto.
 *
 * Se calcula aquí y no con `TextEncoder` para que el CLI y el navegador midan
 * exactamente lo mismo: el checksum no puede depender del entorno (ADR 0093).
 */
function utf8Bytes(text: string): number {
  let bytes = 0;
  for (let index = 0; index < text.length; index++) {
    const code = text.codePointAt(index) as number;
    if (code > 0xffff) index++;
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
  }
  return bytes;
}

function baseName(relativePath: string): string {
  const index = relativePath.lastIndexOf("/");
  return index === -1 ? relativePath : relativePath.slice(index + 1);
}

/** La extensión de un nombre, en minúsculas; vacía si es un fichero oculto. */
function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot <= 0 ? "" : name.slice(dot).toLowerCase();
}
