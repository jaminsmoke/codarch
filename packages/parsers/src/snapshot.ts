import {
  CC_JSON_VERSION,
  fileId,
  folderId,
  md5Hex,
  stableStringify,
  type CcAttributeDescriptor,
  type CcAttributeType,
  type CcDependencyLens,
  type CcEdge,
  type CcJson,
  type CcMetricsLens,
  type CcMigrationLens,
  type CcNode,
  type CcStructureLens,
  type CcStructureNode,
  type CcSymbol,
  type CcSymbolsLens,
  type CcSymbolsSummary
} from "@codarch/schema/browser";
import type { GraphResult } from "./graph";
import type { MigrationResult } from "./migration";
import type { ParsedExport, ParsedImport, ParsedMember, ParsedSymbol } from "./types";

export interface SnapshotFile {
  relativePath: string;
  metrics: Record<string, number>;
  /** Los símbolos del fichero; vacíos si el parser no los da. */
  symbols?: readonly ParsedSymbol[];
  /** Los imports, con sus nombres (ADR 0064). */
  imports?: readonly ParsedImport[];
  /** Las declaraciones exportadas y reexportaciones. */
  exports?: readonly ParsedExport[];
  /** Campos y propiedades del constructor, por clase. */
  members?: readonly ParsedMember[];
}

export interface SnapshotInput {
  projectName: string;
  files: readonly SnapshotFile[];
  graph: GraphResult;
  migration?: MigrationResult;
  /** El commit del repo cuando se analizó, si lo hay (lo pone el CLI con git). */
  commitHash?: string;
}

const METRIC_DESCRIPTORS: Record<string, CcAttributeDescriptor> = {
  loc: {
    title: "Líneas",
    description: "Líneas físicas del fichero",
    direction: -1
  },
  rloc: {
    title: "Líneas de código",
    description: "Líneas con al menos un token de código",
    direction: -1
  },
  functions: {
    title: "Funciones",
    description: "Funciones, métodos y arrows implementados",
    direction: 0
  },
  maxComplexity: {
    title: "Complejidad máx.",
    description: "Complejidad ciclomática de la función más compleja",
    direction: -1
  },
  maxFunctionLength: {
    title: "Función más larga",
    description: "Líneas de la función más larga",
    direction: -1
  },
  number_of_commits: {
    title: "Commits",
    description: "Commits que tocaron el fichero",
    direction: -1
  },
  number_of_authors: {
    title: "Autores",
    description: "Autores únicos que tocaron el fichero",
    direction: 0
  },
  imports: {
    title: "Imports",
    description: "Imports y reexports declarados",
    direction: 0
  },
  externalImports: {
    title: "Imports externos",
    description: "Paquetes fuera del proyecto, sin builtins de Node",
    direction: -1
  },
  builtinImports: {
    title: "Builtins",
    description: "Módulos nativos de Node",
    direction: 0
  },
  typeOnlyImports: {
    title: "Imports type-only",
    description: "Imports que solo existen en tipos",
    direction: 0
  },
  unresolvedImports: {
    title: "Imports sin resolver",
    description: "Specifiers internos que no apuntan a un fichero analizado",
    direction: -1
  },
  fanIn: {
    title: "Fan-in",
    description: "Ficheros que importan a este",
    direction: 1
  },
  fanOut: {
    title: "Fan-out",
    description: "Ficheros importados por este",
    direction: -1
  },
  inCycle: {
    title: "En ciclo",
    description: "Pertenece a un ciclo de dependencias",
    direction: -1
  },
  cycleSize: {
    title: "Tamaño del ciclo",
    description: "Ficheros en su componente cíclico",
    direction: -1
  },
  dependencyLevel: {
    title: "Nivel de dependencia",
    description: "Profundidad en el DAG de dependencias",
    direction: 0
  },
  migrationDebt: {
    title: "Deuda de migración",
    description: "(maxComplexity + 1) × (1 + fan-in); 0 si ya es Rust o nativo",
    direction: -1
  },
  ffiCrossings: {
    title: "Cruces FFI",
    description: "Aristas WASM/native que tocan el fichero",
    direction: -1
  }
};

const METRIC_ORDER = Object.keys(METRIC_DESCRIPTORS);

const EDGE_DESCRIPTORS: Record<string, CcAttributeDescriptor> = {
  weight: {
    title: "Peso",
    description: "Número de imports entre los dos ficheros",
    direction: 0
  },
  typeOnly: {
    title: "Type-only",
    description: "Imports de solo tipos",
    direction: 0
  }
};

/**
 * Construye un `cc.json` 2.x determinista a partir de ficheros ya medidos.
 *
 * No incluye fecha ni commit: dos análisis del mismo árbol deben producir el
 * mismo checksum. El checksum cubre `files` + `lenses`, no `meta`.
 *
 * El documento se arma por piezas —árbol, lentes de métricas, de dependencias,
 * símbolos y estructura— para que cada una se pueda cambiar sin tocar las demás.
 */
export function buildSnapshot(input: SnapshotInput): CcJson {
  const files = [...input.files].sort((left, right) =>
    compareStrings(left.relativePath, right.relativePath)
  );
  const tree = buildTree(files, sanitizeNodeName(input.projectName));

  const migrationLens = input.migration
    ? migrationLensFrom(input.migration)
    : undefined;

  const lenses = {
    metrics: metricLens(tree.attributes, tree.metricNames),
    dependency: dependencyLens(input.graph),
    ...(migrationLens ? { migration: migrationLens } : {}),
    symbols: symbolsLens(tree.symbolNodes, tree.symbols),
    structure: { nodes: tree.structureNodes } satisfies CcStructureLens
  };

  return {
    meta: {
      projectName: input.projectName,
      apiVersion: CC_JSON_VERSION,
      // El commit no entra en el checksum: dos clones del mismo código pesan igual.
      ...(input.commitHash ? { commitHash: input.commitHash } : {}),
      checksum: checksumFor([tree.root], lenses)
    },
    files: [tree.root],
    lenses
  };
}

/** Lo que se le puede contar a la lente de símbolos. */
interface SymbolTally {
  counts: {
    functions: number;
    classes: number;
    interfaces: number;
    types: number;
    enums: number;
    variables: number;
  };
  total: number;
  mostComplex: { path: string; name: string; complexity: number } | null;
}

/** El árbol 2.x y todo lo que cuelga de cada fichero, ya indexado por id. */
interface BuiltTree {
  root: CcNode;
  attributes: Record<string, Record<string, number>>;
  metricNames: Set<string>;
  symbolNodes: Record<string, CcSymbol[]>;
  structureNodes: Record<string, CcStructureNode>;
  symbols: SymbolTally;
}

function buildTree(files: readonly SnapshotFile[], rootName: string): BuiltTree {
  const root: CcNode = {
    id: folderId(""),
    name: rootName,
    type: "Folder",
    children: []
  };
  const folders = new Map<string, CcNode>([["", root]]);
  const tree: BuiltTree = {
    root,
    attributes: {},
    metricNames: new Set<string>(),
    symbolNodes: {},
    structureNodes: {},
    symbols: {
      counts: {
        functions: 0,
        classes: 0,
        interfaces: 0,
        types: 0,
        enums: 0,
        variables: 0
      },
      total: 0,
      mostComplex: null
    }
  };

  for (const file of files) {
    const node = addFileNode(root, folders, file.relativePath);
    if (!node) continue;

    tree.attributes[node.id] = { ...file.metrics };
    for (const metric of Object.keys(file.metrics)) tree.metricNames.add(metric);

    if (file.symbols && file.symbols.length > 0) {
      tree.symbolNodes[node.id] = file.symbols.map((symbol) => ({ ...symbol }));
      tallySymbols(tree.symbols, file.relativePath, file.symbols);
    }

    const structure = structureOf(file);
    if (structure) tree.structureNodes[node.id] = structure;
  }

  sortChildren(root);
  return tree;
}

/**
 * Crea las carpetas que falten y cuelga el fichero de la última.
 *
 * Devuelve `null` cuando la ruta no tiene nombre de fichero. Es la misma pieza
 * que arma el árbol del resto (ADR 0093): un solo árbol, dos snapshots.
 */
export function addFileNode(
  root: CcNode,
  folders: Map<string, CcNode>,
  relativePath: string
): CcNode | null {
  const segments = relativePath.split("/");
  const fileName = segments.pop();
  if (!fileName) return null;

  let parentPath = "";
  let parent = root;

  for (const segment of segments) {
    const folderPath = parentPath ? `${parentPath}/${segment}` : segment;
    let folder = folders.get(folderPath);
    if (!folder) {
      folder = {
        id: folderId(folderPath),
        name: segment,
        type: "Folder",
        children: []
      };
      folders.set(folderPath, folder);
      parent.children?.push(folder);
    }
    parent = folder;
    parentPath = folderPath;
  }

  const node: CcNode = {
    id: fileId(relativePath),
    name: fileName,
    type: "File"
  };
  parent.children?.push(node);
  return node;
}

/** Suma un fichero al recuento de símbolos y recuerda el más complejo. */
function tallySymbols(
  tally: SymbolTally,
  relativePath: string,
  symbols: readonly ParsedSymbol[]
): void {
  tally.total += symbols.length;

  for (const symbol of symbols) {
    const counts = tally.counts;
    if (symbol.kind === "function") counts.functions++;
    else if (symbol.kind === "class") counts.classes++;
    else if (symbol.kind === "interface") counts.interfaces++;
    else if (symbol.kind === "type") counts.types++;
    else if (symbol.kind === "enum") counts.enums++;
    else if (symbol.kind === "variable") counts.variables++;

    if (symbol.kind !== "function" || symbol.complexity === undefined) continue;
    if (!tally.mostComplex || symbol.complexity > tally.mostComplex.complexity) {
      tally.mostComplex = {
        path: relativePath,
        name: symbol.name,
        complexity: symbol.complexity
      };
    }
  }
}

/** Miembros, imports y exports de un fichero, o `null` si no aporta nada. */
function structureOf(file: SnapshotFile): CcStructureNode | null {
  const members = (file.members ?? []).map((member) => ({ ...member }));
  const imports = (file.imports ?? [])
    .filter((imported) => imported.kind !== "export")
    .map((imported) => ({
      source: imported.specifier,
      names: [...(imported.names ?? [])],
      kind: imported.kind as "static" | "dynamic" | "require",
      typeOnly: imported.typeOnly,
      line: imported.line
    }));
  const exports = (file.exports ?? []).map((entry) => ({
    name: entry.name,
    ...(entry.local ? { local: entry.local } : {}),
    ...(entry.source ? { source: entry.source } : {}),
    kind: entry.kind,
    ...(entry.typeOnly ? { typeOnly: true } : {}),
    line: entry.line
  }));

  if (members.length === 0 && imports.length === 0 && exports.length === 0) {
    return null;
  }
  return { members, imports, exports };
}

/**
 * Las métricas conocidas van primero, en el orden de sus descriptores; las que
 * añada un addon se quedan detrás, en el orden en que aparecieron.
 */
function metricLens(
  attributes: Record<string, Record<string, number>>,
  metricNames: Set<string>
): CcMetricsLens {
  const presentMetrics = METRIC_ORDER.filter((metric) => metricNames.has(metric));
  for (const metric of metricNames) {
    if (!presentMetrics.includes(metric)) presentMetrics.push(metric);
  }

  const attributeDescriptors: Record<string, CcAttributeDescriptor> = {};
  const attributeTypes: Record<string, CcAttributeType> = {};
  for (const metric of presentMetrics) {
    const descriptor = METRIC_DESCRIPTORS[metric];
    if (descriptor) attributeDescriptors[metric] = descriptor;
    attributeTypes[metric] = "absolute";
  }

  return { attributes, attributeDescriptors, attributeTypes };
}

function dependencyLens(graph: GraphResult): CcDependencyLens {
  const edges: CcEdge[] = graph.edges.map((edge) => ({
    fromId: fileId(edge.from),
    toId: fileId(edge.to),
    attributes: { weight: edge.weight, typeOnly: edge.typeOnly },
    isCyclic: edge.isCyclic
  }));

  const nodes: Record<string, { level: number }> = {};
  for (const [path, metrics] of graph.metrics) {
    nodes[fileId(path)] = { level: metrics.dependencyLevel };
  }

  return {
    edges,
    nodes,
    attributeDescriptors: EDGE_DESCRIPTORS,
    attributeTypes: {
      weight: "absolute",
      typeOnly: "absolute"
    }
  };
}

function symbolsLens(
  nodes: Record<string, CcSymbol[]>,
  tally: SymbolTally
): CcSymbolsLens {
  const summary: CcSymbolsSummary = {
    symbols: tally.total,
    functions: tally.counts.functions,
    classes: tally.counts.classes,
    interfaces: tally.counts.interfaces,
    types: tally.counts.types,
    enums: tally.counts.enums,
    variables: tally.counts.variables,
    mostComplex: tally.mostComplex
  };
  return { nodes, summary };
}

function migrationLensFrom(migration: MigrationResult): CcMigrationLens {
  const nodes: CcMigrationLens["nodes"] = {};
  for (const [relativePath, node] of migration.nodes) {
    nodes[fileId(relativePath)] = node;
  }

  const edges = migration.edges
    .map((edge) => ({
      fromId: fileId(edge.from),
      toId: fileId(edge.to),
      kind: edge.kind
    }))
    .sort(
      (left, right) =>
        compareStrings(left.fromId, right.fromId) ||
        compareStrings(left.toId, right.toId) ||
        compareStrings(left.kind, right.kind)
    );

  return {
    nodes,
    edges,
    summary: migration.summary
  };
}

export function checksumFor(files: readonly CcNode[], lenses: unknown): string {
  return md5Hex(stableStringify({ files, lenses }));
}

export function sortChildren(node: CcNode): void {
  if (!node.children) return;
  node.children.sort((left, right) => {
    if (left.type !== right.type) return left.type === "Folder" ? -1 : 1;
    return compareStrings(left.name, right.name);
  });
  for (const child of node.children) sortChildren(child);
}

export function sanitizeNodeName(name: string): string {
  const sanitized = name.replace(/[\\/]/g, "-").trim();
  return sanitized && sanitized !== "." && sanitized !== ".." ? sanitized : "Proyecto";
}

export function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
