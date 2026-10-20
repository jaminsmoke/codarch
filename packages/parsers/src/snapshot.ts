import { createHash } from "node:crypto";
import {
  fileId,
  folderId,
  type CcAttributeDescriptor,
  type CcAttributeType,
  type CcEdge,
  type CcJson,
  type CcNode
} from "@codarch/schema";
import type { GraphResult } from "./graph";

export interface SnapshotFile {
  relativePath: string;
  metrics: Record<string, number>;
}

export interface SnapshotInput {
  projectName: string;
  files: readonly SnapshotFile[];
  graph: GraphResult;
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
 */
export function buildSnapshot(input: SnapshotInput): CcJson {
  const files = [...input.files].sort((left, right) =>
    compareStrings(left.relativePath, right.relativePath)
  );
  const rootName = sanitizeNodeName(input.projectName);
  const root: CcNode = {
    id: folderId(""),
    name: rootName,
    type: "Folder",
    children: []
  };
  const folders = new Map<string, CcNode>([["", root]]);
  const attributes: Record<string, Record<string, number>> = {};
  const metricNames = new Set<string>();

  for (const file of files) {
    const segments = file.relativePath.split("/");
    const fileName = segments.pop();
    if (!fileName) continue;

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
      id: fileId(file.relativePath),
      name: fileName,
      type: "File"
    };
    parent.children?.push(node);
    attributes[node.id] = { ...file.metrics };
    for (const metric of Object.keys(file.metrics)) metricNames.add(metric);
  }

  sortChildren(root);

  const presentMetrics = METRIC_ORDER.filter((metric) => metricNames.has(metric));
  for (const metric of metricNames) {
    if (!presentMetrics.includes(metric)) presentMetrics.push(metric);
  }

  const descriptors: Record<string, CcAttributeDescriptor> = {};
  const attributeTypes: Record<string, CcAttributeType> = {};
  for (const metric of presentMetrics) {
    const descriptor = METRIC_DESCRIPTORS[metric];
    if (descriptor) descriptors[metric] = descriptor;
    attributeTypes[metric] = "absolute";
  }

  const edges: CcEdge[] = input.graph.edges.map((edge) => ({
    fromId: fileId(edge.from),
    toId: fileId(edge.to),
    attributes: { weight: edge.weight, typeOnly: edge.typeOnly },
    isCyclic: edge.isCyclic
  }));

  const dependencyNodes: Record<string, { level: number }> = {};
  for (const [path, metrics] of input.graph.metrics) {
    dependencyNodes[fileId(path)] = { level: metrics.dependencyLevel };
  }

  const lenses = {
    metrics: {
      attributes,
      attributeDescriptors: descriptors,
      attributeTypes
    },
    dependency: {
      edges,
      nodes: dependencyNodes,
      attributeDescriptors: EDGE_DESCRIPTORS,
      attributeTypes: {
        weight: "absolute" as const,
        typeOnly: "absolute" as const
      }
    }
  };

  return {
    meta: {
      projectName: input.projectName,
      apiVersion: "2.0",
      checksum: checksumFor([root], lenses)
    },
    files: [root],
    lenses
  };
}

function checksumFor(files: readonly CcNode[], lenses: unknown): string {
  return createHash("md5")
    .update(stableStringify({ files, lenses }), "utf8")
    .digest("hex");
}

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number") {
    return Number.isFinite(value) ? JSON.stringify(value) : "null";
  }
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }
  return "null";
}

function sortChildren(node: CcNode): void {
  if (!node.children) return;
  node.children.sort((left, right) => {
    if (left.type !== right.type) return left.type === "Folder" ? -1 : 1;
    return compareStrings(left.name, right.name);
  });
  for (const child of node.children) sortChildren(child);
}

function sanitizeNodeName(name: string): string {
  const sanitized = name.replace(/[\\/]/g, "-").trim();
  return sanitized && sanitized !== "." && sanitized !== ".." ? sanitized : "Proyecto";
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
