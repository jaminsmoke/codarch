import { CC_JSON_VERSION } from "@codarch/versions";
import { CcJsonError, isRecord, requireRecord, requireString } from "./errors";
import { nodeId, normalizeName } from "./identity";
import type {
  CcAttributeDescriptor,
  CcAttributeType,
  CcDependencyLens,
  CcEdge,
  CcJson,
  CcMetricsLens,
  CcNode
} from "./types";

const MAX_DEPTH = 512;

interface BuiltNode {
  id: string;
  name: string;
  fullPath: string;
}

interface DescriptorSections {
  nodes?: Record<string, CcAttributeDescriptor>;
  edges?: Record<string, CcAttributeDescriptor>;
  flat?: Record<string, CcAttributeDescriptor>;
}

interface TypeSections {
  nodes?: Record<string, CcAttributeType>;
  edges?: Record<string, CcAttributeType>;
}

/**
 * Detecta si el documento es un `cc.json` 1.x.
 *
 * El formato 1.x puede venir desnudo (`{ apiVersion, nodes, ... }`) o envuelto
 * (`{ checksum, data: { ... } }`). Los documentos 2.x tienen `files` y nunca se
 * tratan como legacy.
 */
export function isLegacyCcJson(input: unknown): boolean {
  if (!isRecord(input) || "files" in input) return false;

  if ("data" in input) {
    if (!isRecord(input.data) || "files" in input.data) return false;
    return (
      "nodes" in input.data ||
      (typeof input.data.apiVersion === "string" && input.data.apiVersion.startsWith("1"))
    );
  }

  return "nodes" in input || (typeof input.apiVersion === "string" && input.apiVersion.startsWith("1"));
}

/**
 * Convierte un `cc.json` 1.x al modelo 2.x que consume el resto de CodArch.
 *
 * - Los `attributes` de cada nodo pasan a `lenses.metrics.attributes`, indexados por id.
 * - Las aristas `fromNodeName`/`toNodeName` se resuelven contra el árbol y pasan a ids.
 * - `attributeTypes` y `attributeDescriptors` se separan entre métricas y dependencias.
 * - Se descarta el estado de vista de 1.x (`blacklist`, `markedPackages`, `fixedPosition`).
 *
 * Los ids siguen la convención 2.x: `sha256(type + canonicalPath)[:16]`, con la raíz
 * excluida de la ruta canónica.
 */
export function normalizeLegacyCcJson(input: unknown): CcJson {
  const outer = requireRecord(input, "$");
  const wrapped = "data" in outer;
  const payload = wrapped ? requireRecord(outer.data, "$.data") : outer;
  const base = wrapped ? "$.data" : "$";

  const version = payload.apiVersion;
  if (version !== undefined) {
    if (typeof version !== "string" || !/^1(?:\.|$)/.test(version)) {
      throw new CcJsonError(`apiVersion "${String(version)}" no es 1.x`, `${base}.apiVersion`);
    }
  }

  const nodesPath = `${base}.nodes`;
  const nodesRaw = payload.nodes;
  if (!Array.isArray(nodesRaw)) {
    throw new CcJsonError('"nodes" debe ser un array', nodesPath);
  }
  if (nodesRaw.length === 0) {
    throw new CcJsonError("el árbol está vacío", nodesPath);
  }

  const roots = nodesRaw.map((node, index) =>
    requireRecord(node, `${nodesPath}[${index}]`)
  );
  const rootNames = roots.map((root, index) =>
    readNodeName(root.name, `${nodesPath}[${index}].name`)
  );

  const multipleRoots = roots.length > 1;
  let syntheticName: string | undefined;
  let treeRoot: Record<string, unknown>;

  if (multipleRoots) {
    syntheticName = rootNames.includes("root") ? "merged-root" : "root";
    while (rootNames.includes(syntheticName)) syntheticName = `${syntheticName}_`;
    treeRoot = {
      name: syntheticName,
      type: "Folder",
      attributes: {},
      children: roots
    };
  } else {
    treeRoot = roots[0] as Record<string, unknown>;
  }

  const metrics: Record<string, Record<string, number>> = {};
  const built: BuiltNode[] = [];
  const ids = new Map<string, string>();

  const buildNode = (value: unknown, parentPath: string[], path: string, depth: number): CcNode => {
    if (depth > MAX_DEPTH) {
      throw new CcJsonError(`profundidad máxima ${MAX_DEPTH} superada`, path);
    }

    const raw = requireRecord(value, path);
    const name = readNodeName(raw.name, `${path}.name`);
    const type = raw.type;
    if (type !== "File" && type !== "Folder") {
      throw new CcJsonError('"type" debe ser "File" o "Folder"', `${path}.type`);
    }

    const fullPath = [...parentPath, name];
    const id = nodeId(type, fullPath.slice(1));
    const previous = ids.get(id);
    if (previous !== undefined) {
      throw new CcJsonError(
        `id duplicado "${id}" para "${previous}" y "${fullPath.join("/")}"`,
        `${path}.name`
      );
    }
    ids.set(id, fullPath.join("/"));
    built.push({ id, name, fullPath: fullPath.join("/") });

    const node: CcNode = { id, name, type };

    const attributes = readMetrics(raw.attributes, `${path}.attributes`);
    if (attributes) metrics[id] = attributes;

    const contentHash = readOptionalString(raw.checksum) ?? readOptionalString(raw.contentHash);
    if (contentHash) node.contentHash = contentHash;
    const link = readOptionalString(raw.link);
    if (link) node.link = link;

    if (raw.children !== undefined) {
      if (!Array.isArray(raw.children)) {
        throw new CcJsonError('"children" debe ser un array', `${path}.children`);
      }
      if (type === "File" && raw.children.length > 0) {
        throw new CcJsonError("un fichero no puede tener hijos", `${path}.children`);
      }
      if (type === "Folder" && raw.children.length > 0) {
        node.children = raw.children.map((child, index) =>
          buildNode(child, fullPath, `${path}.children[${index}]`, depth + 1)
        );
      }
    }

    return node;
  };

  const files = [buildNode(treeRoot, [], multipleRoots ? "$.roots" : `${nodesPath}[0]`, 0)];

  const pathIndex = buildPathIndex(built, multipleRoots);
  const stripNames = new Set<string>(["root", ...rootNames]);
  if (syntheticName) stripNames.add(syntheticName);

  const edges: CcEdge[] = [];
  const edgesRaw = payload.edges;
  if (edgesRaw !== undefined) {
    if (!Array.isArray(edgesRaw)) {
      throw new CcJsonError('"edges" debe ser un array', `${base}.edges`);
    }

    edgesRaw.forEach((edge, index) => {
      const path = `${base}.edges[${index}]`;
      const raw = requireRecord(edge, path);
      const fromName = requireString(raw.fromNodeName, `${path}.fromNodeName`, "fromNodeName");
      const toName = requireString(raw.toNodeName, `${path}.toNodeName`, "toNodeName");

      const normalized: CcEdge = {
        fromId: resolveEndpoint(fromName, pathIndex, stripNames, `${path}.fromNodeName`),
        toId: resolveEndpoint(toName, pathIndex, stripNames, `${path}.toNodeName`)
      };

      const attributes = readMetrics(raw.attributes, `${path}.attributes`);
      if (attributes) normalized.attributes = attributes;
      if (typeof raw.isCyclic === "boolean") normalized.isCyclic = raw.isCyclic;
      if (typeof raw.isPointingUpwards === "boolean") {
        normalized.isPointingUpwards = raw.isPointingUpwards;
      }

      edges.push(normalized);
    });
  }

  const types = readAttributeTypes(payload.attributeTypes, `${base}.attributeTypes`);
  const descriptorSections = readDescriptors(
    payload.attributeDescriptors,
    `${base}.attributeDescriptors`
  );

  const nodeMetricNames = new Set(Object.values(metrics).flatMap((row) => Object.keys(row)));
  const edgeMetricNames = new Set(
    edges.flatMap((edge) => Object.keys(edge.attributes ?? {}))
  );

  let nodeDescriptors = descriptorSections.nodes;
  let edgeDescriptors = descriptorSections.edges;
  if (descriptorSections.flat) {
    const nodes: Record<string, CcAttributeDescriptor> = {};
    const edgeMap: Record<string, CcAttributeDescriptor> = {};
    for (const [name, descriptor] of Object.entries(descriptorSections.flat)) {
      if (nodeMetricNames.has(name) || !edgeMetricNames.has(name)) nodes[name] = descriptor;
      if (edgeMetricNames.has(name)) edgeMap[name] = descriptor;
    }
    if (Object.keys(nodes).length > 0) nodeDescriptors = nodes;
    if (Object.keys(edgeMap).length > 0) edgeDescriptors = edgeMap;
  }

  const lenses: NonNullable<CcJson["lenses"]> = {};

  const metricsLens: CcMetricsLens = { attributes: metrics };
  if (types.nodes && Object.keys(types.nodes).length > 0) {
    metricsLens.attributeTypes = types.nodes;
  }
  if (nodeDescriptors && Object.keys(nodeDescriptors).length > 0) {
    metricsLens.attributeDescriptors = nodeDescriptors;
  }
  if (
    Object.keys(metrics).length > 0 ||
    metricsLens.attributeTypes !== undefined ||
    metricsLens.attributeDescriptors !== undefined
  ) {
    lenses.metrics = metricsLens;
  }

  const dependency: CcDependencyLens = {};
  if (edges.length > 0) dependency.edges = edges;
  if (types.edges && Object.keys(types.edges).length > 0) {
    dependency.attributeTypes = types.edges;
  }
  if (edgeDescriptors && Object.keys(edgeDescriptors).length > 0) {
    dependency.attributeDescriptors = edgeDescriptors;
  }
  if (Object.keys(dependency).length > 0) lenses.dependency = dependency;

  const meta: CcJson["meta"] = { apiVersion: CC_JSON_VERSION };
  const projectName = readOptionalString(payload.projectName);
  if (projectName) meta.projectName = projectName;
  const commitHash = readOptionalString(payload.commitHash);
  if (commitHash) meta.commitHash = commitHash;

  return {
    meta,
    files,
    ...(Object.keys(lenses).length > 0 ? { lenses } : {})
  };
}

/**
 * Índice de extremos de arista. Se indexan primero las rutas completas y después
 * las variantes sin la raíz sintética, sin la raíz real y con el prefijo `/root`.
 * Así una arista 1.x puede usar cualquiera de las formas habituales.
 */
function buildPathIndex(built: BuiltNode[], multipleRoots: boolean): Map<string, string> {
  const index = new Map<string, string>();
  const add = (key: string, id: string): void => {
    if (key !== "" && !index.has(key)) index.set(key, id);
  };

  for (const node of built) add(node.fullPath, node.id);

  for (const node of built) {
    const segments = node.fullPath.split("/");
    if (segments.length > 1) add(segments.slice(1).join("/"), node.id);
    const relative = segments.slice(multipleRoots ? 2 : 1).join("/");
    if (relative !== "") {
      add(relative, node.id);
      add(`root/${relative}`, node.id);
    } else if (segments.length === 1) {
      add("root", node.id);
    }
  }

  const nameCounts = new Map<string, number>();
  for (const node of built) nameCounts.set(node.name, (nameCounts.get(node.name) ?? 0) + 1);
  for (const node of built) {
    if (nameCounts.get(node.name) === 1) add(node.name, node.id);
  }

  return index;
}

function resolveEndpoint(
  endpoint: string,
  index: Map<string, string>,
  stripNames: Set<string>,
  path: string
): string {
  const segments = canonicalSegments(endpoint);
  if (segments.length === 0) {
    throw new CcJsonError("extremo de arista vacío", path);
  }

  const candidates = [segments.join("/")];
  if (segments.length > 1 && stripNames.has(segments[0] as string)) {
    candidates.push(segments.slice(1).join("/"));
  }

  for (const candidate of candidates) {
    const id = index.get(candidate);
    if (id) return id;
  }

  const bare = index.get(segments[segments.length - 1] as string);
  if (bare) return bare;

  throw new CcJsonError(`no se pudo resolver el nodo "${endpoint}"`, path);
}

function canonicalSegments(value: string): string[] {
  const result: string[] = [];
  for (const raw of value.replace(/\\/g, "/").split("/")) {
    const segment = raw.normalize("NFC");
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      result.pop();
      continue;
    }
    result.push(segment);
  }
  return result;
}

function readNodeName(value: unknown, path: string): string {
  const name = normalizeName(requireString(value, path, "name"));
  if (name === "." || name === "..") {
    throw new CcJsonError('el nombre no puede ser "." ni ".."', path);
  }
  if (name.includes("/")) {
    throw new CcJsonError('el nombre no puede contener "/"', path);
  }
  return name;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readMetrics(
  value: unknown,
  path: string
): Record<string, number> | undefined {
  if (value === undefined) return undefined;
  const raw = requireRecord(value, path);
  const out: Record<string, number> = {};
  for (const [metric, metricValue] of Object.entries(raw)) {
    if (typeof metricValue !== "number" || !Number.isFinite(metricValue)) {
      throw new CcJsonError(
        `la métrica "${metric}" debe ser un número finito`,
        `${path}["${metric}"]`
      );
    }
    out[metric] = metricValue;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function readAttributeTypes(value: unknown, path: string): TypeSections {
  if (value === undefined) return {};
  const raw = requireRecord(value, path);

  if ("nodes" in raw || "edges" in raw) {
    const nodes = raw.nodes === undefined ? undefined : readTypeMap(raw.nodes, `${path}.nodes`);
    const edges = raw.edges === undefined ? undefined : readTypeMap(raw.edges, `${path}.edges`);
    return {
      ...(nodes && Object.keys(nodes).length > 0 ? { nodes } : {}),
      ...(edges && Object.keys(edges).length > 0 ? { edges } : {})
    };
  }

  const nodes = readTypeMap(raw, path);
  return Object.keys(nodes).length > 0 ? { nodes } : {};
}

function readTypeMap(value: unknown, path: string): Record<string, CcAttributeType> {
  const raw = requireRecord(value, path);
  const out: Record<string, CcAttributeType> = {};
  for (const [metric, type] of Object.entries(raw)) {
    if (type !== "absolute" && type !== "relative") {
      throw new CcJsonError(
        `el tipo de "${metric}" debe ser "absolute" o "relative"`,
        `${path}["${metric}"]`
      );
    }
    out[metric] = type;
  }
  return out;
}

function readDescriptors(value: unknown, path: string): DescriptorSections {
  if (value === undefined) return {};
  const raw = requireRecord(value, path);

  if ("nodes" in raw || "edges" in raw) {
    const nodes =
      raw.nodes === undefined ? undefined : readDescriptorMap(raw.nodes, `${path}.nodes`);
    const edges =
      raw.edges === undefined ? undefined : readDescriptorMap(raw.edges, `${path}.edges`);
    return {
      ...(nodes && Object.keys(nodes).length > 0 ? { nodes } : {}),
      ...(edges && Object.keys(edges).length > 0 ? { edges } : {})
    };
  }

  const flat = readDescriptorMap(raw, path);
  return Object.keys(flat).length > 0 ? { flat } : {};
}

function readDescriptorMap(
  value: unknown,
  path: string
): Record<string, CcAttributeDescriptor> {
  const raw = requireRecord(value, path);
  const out: Record<string, CcAttributeDescriptor> = {};
  for (const [metric, descriptor] of Object.entries(raw)) {
    const record = requireRecord(descriptor, `${path}["${metric}"]`);
    if (record.direction !== undefined && typeof record.direction !== "number") {
      throw new CcJsonError(
        `"direction" de "${metric}" debe ser un número`,
        `${path}["${metric}"].direction`
      );
    }
    out[metric] = record as CcAttributeDescriptor;
  }
  return out;
}
