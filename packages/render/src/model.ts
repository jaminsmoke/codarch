import type { CcEdge, CcJson, CcNode } from "@codarch/schema";
import { defaultMetric, getStats, walkFiles } from "@codarch/schema";
import {
  CHURN_METRIC_CANDIDATES,
  COMPLEXITY_METRIC_CANDIDATES,
  firstMetric,
  riskScores
} from "@codarch/metrics";

export type Lens = "structure" | "risk" | "metric";

export interface RenderOptions {
  /** Métrica que decide el área. Por defecto `rloc` o la de mayor cobertura. */
  areaMetric?: string;
  /** `risk`, `structure` o el nombre de una métrica. */
  color?: string;
  /** Título alternativo para la cabecera. */
  title?: string;
}

export interface RenderMeta {
  project: string;
  title: string;
  commit: string;
  checksum: string;
  apiVersion: string;
  rootName: string;
}

export interface RenderFile {
  index: number;
  /** Id del nodo en cc.json. Útil para unir lentes; no se serializa al HTML. */
  nodeId: string;
  path: string;
  name: string;
  section: number;
  /** Área usada por el layout. Nunca es menor que 1 para que el fichero siga visible. */
  area: number;
  /** Valor real de la métrica de área, sin el mínimo de 1. */
  actualArea: number;
  risk: number;
  complexity: number;
  churn: number;
  /** Valores alineados con `RenderModel.metrics`; `null` cuando la métrica no existe. */
  values: Array<number | null>;
}

export interface RenderSection {
  key: string;
  label: string;
  files: number;
  area: number;
  color: string;
}

export interface RenderMetric {
  key: string;
  title: string;
  /** -1: menos es mejor. 1: más es mejor. 0: sin dirección declarada. */
  direction: number;
  min: number;
  /** Máximo de la escala de color (p95 si hay mucha cola). */
  max: number;
  actualMax: number;
  p95: number;
  mode: "linear" | "log";
  coverage: number;
}

export interface TreeNode {
  kind: "file" | "folder";
  key: string;
  name: string;
  path: string;
  value: number;
  fileCount: number;
  section: number;
  fileIndex?: number;
  children?: TreeNode[];
}

export interface EdgePair {
  from: number;
  to: number;
}

export interface RenderModel {
  meta: RenderMeta;
  files: RenderFile[];
  sections: RenderSection[];
  metrics: RenderMetric[];
  edges: EdgePair[];
  cycles: EdgePair[];
  roots: TreeNode[];
  areaMetric: string | null;
  areaTitle: string;
  totalArea: number;
  fileCount: number;
  folderCount: number;
  hotspotCount: number;
  defaultSelection: number | null;
  initialLens: Lens;
  initialMetric: string | null;
  warnings: string[];
}

export class RenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RenderError";
  }
}

const PALETTE = [
  "#b9c4d0",
  "#c9b8a8",
  "#a9bfae",
  "#c4b6c9",
  "#c9c2a6",
  "#d5d2ca",
  "#c2c8d0",
  "#d6c6bd",
  "#b7c6c2",
  "#cbbfb0",
  "#bcc3b9",
  "#cfc6c9"
];

const CURATED_METRICS = [
  "rloc",
  "maxComplexity",
  "max_complexity_per_function",
  "complexity",
  "functions",
  "number_of_functions",
  "maxFunctionLength",
  "loc",
  "imports",
  "externalImports",
  "builtinImports",
  "typeOnlyImports",
  "unresolvedImports",
  "fanIn",
  "fanOut",
  "inCycle",
  "cycleSize",
  "dependencyLevel",
  "number_of_commits",
  "number_of_authors",
  "incoming_dependencies",
  "outgoing_dependencies"
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function valueOf(
  values: Record<string, number> | undefined,
  key: string | null
): number | undefined {
  if (!key || !values) return undefined;
  const value = values[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor((sorted.length - 1) * p))
  );
  return sorted[index] ?? 0;
}

/** FNV-1a: estable entre ejecuciones y barato. */
function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function sectionForPath(path: string): string {
  const folders = path.split("/").filter(Boolean).slice(0, -1);
  if (folders.length === 0) return "(raíz)";
  if (folders.length === 1) return folders[0] as string;
  return folders.slice(0, 3).join("/");
}

function asEdges(value: unknown): CcEdge[] {
  if (!Array.isArray(value)) return [];
  const edges: CcEdge[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    if (typeof item.fromId !== "string" || typeof item.toId !== "string") continue;
    edges.push({
      fromId: item.fromId,
      toId: item.toId,
      ...(item.isCyclic === true ? { isCyclic: true } : {})
    });
  }
  return edges;
}

function metricTitle(
  attributes: Record<string, unknown> | undefined,
  key: string
): string {
  const descriptor = attributes?.[key];
  if (isRecord(descriptor) && typeof descriptor.title === "string" && descriptor.title) {
    return descriptor.title;
  }
  return key;
}

function metricDirection(
  attributes: Record<string, unknown> | undefined,
  key: string
): number {
  const descriptor = attributes?.[key];
  if (isRecord(descriptor) && typeof descriptor.direction === "number") {
    return descriptor.direction;
  }
  return 0;
}

/**
 * Construye el modelo que consumen el SVG y el cliente.
 *
 * No muta el cc.json. El orden de los ficheros es el recorrido en profundidad del árbol,
 * de modo que dos ejecuciones sobre el mismo fichero producen exactamente el mismo modelo.
 */
export function buildRenderModel(cc: CcJson, options: RenderOptions = {}): RenderModel {
  const stats = getStats(cc);
  const coverage = new Set(stats.metricCoverage.map((entry) => entry.name));
  const attributes = cc.lenses?.metrics?.attributes ?? {};
  const descriptors = cc.lenses?.metrics?.attributeDescriptors as
    | Record<string, unknown>
    | undefined;

  let areaMetric: string | null;
  if (options.areaMetric) {
    if (!coverage.has(options.areaMetric)) {
      throw new RenderError(
        `la métrica de área "${options.areaMetric}" no existe en este cc.json`
      );
    }
    areaMetric = options.areaMetric;
  } else {
    areaMetric = defaultMetric(stats) ?? null;
  }

  const complexityKey = firstMetric(coverage, COMPLEXITY_METRIC_CANDIDATES);
  const churnKey = firstMetric(coverage, CHURN_METRIC_CANDIDATES);

  const metricKeys: string[] = [];
  const addMetric = (key: string | null): void => {
    if (key && coverage.has(key) && !metricKeys.includes(key)) metricKeys.push(key);
  };
  for (const key of CURATED_METRICS) addMetric(key);
  addMetric(areaMetric);
  addMetric(complexityKey);
  addMetric(churnKey);
  if (options.color && options.color !== "risk" && options.color !== "structure") {
    addMetric(options.color);
  }

  const singleRoot =
    cc.files.length === 1 && cc.files[0]?.type === "Folder" ? cc.files[0] : null;
  const prefix = singleRoot ? `${singleRoot.name}/` : "";
  const rootName = singleRoot?.name ?? "";

  const warnings: string[] = [];
  const files: RenderFile[] = [];
  const fileIndexById = new Map<string, number>();

  walkFiles(cc.files, (entry) => {
    const fullPath = entry.path;
    const path =
      prefix && fullPath.startsWith(prefix) ? fullPath.slice(prefix.length) : fullPath;
    const values = attributes[entry.node.id];
    const rawArea = valueOf(values, areaMetric);
    const index = files.length;

    fileIndexById.set(entry.node.id, index);

    files.push({
      index,
      nodeId: entry.node.id,
      path,
      name: entry.node.name,
      section: -1,
      area: Math.max(1, rawArea ?? 0),
      actualArea: rawArea ?? 0,
      risk: 0,
      complexity: valueOf(values, complexityKey) ?? 0,
      churn: valueOf(values, churnKey) ?? 0,
      values: []
    });
  });

  if (areaMetric && files.length > 0) {
    const missing = files.filter((file) => file.actualArea === 0).length;
    if (missing > 0) {
      warnings.push(
        `${missing} ficheros sin "${areaMetric}"; se dibujan con área mínima para no desaparecer`
      );
    }
    if (!options.areaMetric && areaMetric !== "rloc") {
      warnings.push(`"rloc" no está presente; se usa "${areaMetric}" como área`);
    }
  }

  // Riesgo compuesto: complejidad (50%), churn (32%) y tamaño (18%).
  // Si falta una señal, los pesos se renormalizan: un proyecto sin historial
  // git no debe quedar con un máximo artificial de 68/100.
  const risks = riskScores(
    files.map((file) => ({
      complexity: file.complexity,
      churn: file.churn,
      size: file.actualArea
    }))
  );
  for (const [index, file] of files.entries()) {
    file.risk = risks[index] ?? 0;
  }

  // Secciones: color categórico por las tres primeras partes de la ruta.
  // Da color a "app/codeCharta/features" sin convertir cada carpeta en un color.
  const sectionAccumulator = new Map<string, { files: number; area: number }>();
  for (const file of files) {
    const key = sectionForPath(file.path);
    const current = sectionAccumulator.get(key) ?? { files: 0, area: 0 };
    current.files++;
    current.area += file.actualArea;
    sectionAccumulator.set(key, current);
  }

  const sections: RenderSection[] = [...sectionAccumulator.entries()]
    .map(([key, value]) => ({
      key,
      label: key,
      files: value.files,
      area: value.area,
      color: PALETTE[hashString(key) % PALETTE.length] as string
    }))
    .sort((a, b) => b.area - a.area || a.key.localeCompare(b.key));

  const sectionIndex = new Map(sections.map((section, index) => [section.key, index]));
  for (const file of files) {
    file.section = sectionIndex.get(sectionForPath(file.path)) ?? 0;
  }

  const metrics: RenderMetric[] = metricKeys.map((key) => {
    const present = files
      .map((file) => valueOf(attributes[file.nodeId], key))
      .filter((value): value is number => value !== undefined);
    const min = present.length > 0 ? Math.min(...present) : 0;
    const actualMax = present.length > 0 ? Math.max(...present) : 0;
    const p95 = percentile(present, 0.95);
    const skewed = min >= 0 && p95 > 0 && actualMax > p95 * 4;
    const max = skewed ? actualMax : p95 > 0 ? p95 : actualMax;
    return {
      key,
      title: metricTitle(descriptors, key),
      direction: metricDirection(descriptors, key),
      min,
      max,
      actualMax,
      p95,
      mode: skewed ? "log" : "linear",
      coverage: present.length
    };
  });

  for (const file of files) {
    const values = attributes[file.nodeId];
    file.values = metrics.map((metric) => valueOf(values, metric.key) ?? null);
  }

  const roots = buildRoots(cc, singleRoot, fileIndexById, files);
  const folderCount = countFolders(roots);

  const dependency = cc.lenses?.dependency;
  const leafEdges = asEdges(dependency?.leafEdges);
  const rawEdges = leafEdges.length > 0 ? leafEdges : asEdges(dependency?.edges);
  const edgeSet = new Set<number>();
  const edges: EdgePair[] = [];
  const n = files.length;

  for (const edge of rawEdges) {
    const from = fileIndexById.get(edge.fromId);
    const to = fileIndexById.get(edge.toId);
    if (from === undefined || to === undefined || from === to) continue;
    const key = from * n + to;
    if (edgeSet.has(key)) continue;
    edgeSet.add(key);
    edges.push({ from, to });
    if (edges.length >= 20_000) {
      warnings.push("se han limitado las dependencias a 20.000 aristas");
      break;
    }
  }

  edges.sort((a, b) => a.from - b.from || a.to - b.to);

  const flaggedEdges = new Set<number>();
  for (const edge of rawEdges) {
    if (edge.isCyclic !== true) continue;
    const from = fileIndexById.get(edge.fromId);
    const to = fileIndexById.get(edge.toId);
    if (from === undefined || to === undefined) continue;
    flaggedEdges.add(from * n + to);
  }

  const cycleSet = new Set<number>();
  const cycles: EdgePair[] = [];
  for (const edge of edges) {
    const key = edge.from * n + edge.to;
    const backward = edgeSet.has(edge.to * n + edge.from);
    if (backward || flaggedEdges.has(key)) {
      if (!cycleSet.has(key)) {
        cycleSet.add(key);
        cycles.push(edge);
      }
    }
  }
  cycles.sort((a, b) => a.from - b.from || a.to - b.to);

  if (rawEdges.length === 0) {
    warnings.push("este cc.json no trae una lente de dependencias utilizable");
  }

  const totalArea = files.reduce((sum, file) => sum + file.actualArea, 0);
  const hotspotCount = files.filter((file) => file.risk >= 0.66).length;

  let initialLens: Lens = "risk";
  let initialMetric: string | null = null;
  if (options.color === "structure") {
    initialLens = "structure";
  } else if (options.color && options.color !== "risk") {
    if (!coverage.has(options.color)) {
      throw new RenderError(`la métrica de color "${options.color}" no existe en este cc.json`);
    }
    initialLens = "metric";
    initialMetric = options.color;
  }

  const defaultSelection = pickDefaultSelection(files, initialLens, initialMetric, metrics);

  const project = cc.meta.projectName || options.title || "Proyecto sin nombre";

  return {
    meta: {
      project,
      title: options.title || project,
      commit: cc.meta.commitHash || "",
      checksum: cc.meta.checksum || "",
      apiVersion: cc.meta.apiVersion,
      rootName
    },
    files,
    sections,
    metrics,
    edges,
    cycles,
    roots,
    areaMetric,
    areaTitle: areaMetric ? metricTitle(descriptors, areaMetric) : "Área",
    totalArea,
    fileCount: files.length,
    folderCount,
    hotspotCount,
    defaultSelection,
    initialLens,
    initialMetric,
    warnings
  };
}


function buildRoots(
  cc: CcJson,
  singleRoot: CcNode | null,
  fileIndexById: Map<string, number>,
  files: RenderFile[]
): TreeNode[] {
  const build = (node: CcNode, path: string): TreeNode => {
    if (node.type === "File") {
      const index = fileIndexById.get(node.id);
      const file = index === undefined ? undefined : files[index];
      return {
        kind: "file",
        key: `f:${index ?? -1}`,
        name: node.name,
        path,
        value: file?.area ?? 1,
        fileCount: 1,
        section: file?.section ?? 0,
        fileIndex: index
      };
    }

    const children = (node.children ?? []).map((child) =>
      build(child, path ? `${path}/${child.name}` : child.name)
    );

    const folder: TreeNode = {
      kind: "folder",
      key: `d:${path}`,
      name: node.name,
      path,
      value: children.reduce((sum, child) => sum + child.value, 0) || 1,
      fileCount: children.reduce((sum, child) => sum + child.fileCount, 0),
      section: -1,
      children
    };

    // Colapsa cadenas de carpetas contenedoras: app/codeCharta, no dos cabeceras vacías.
    while (
      folder.children?.length === 1 &&
      folder.children[0]?.kind === "folder"
    ) {
      const only = folder.children[0] as TreeNode;
      folder.name = `${folder.name}/${only.name}`;
      folder.path = only.path;
      folder.key = `d:${only.path}`;
      folder.value = only.value;
      folder.fileCount = only.fileCount;
      folder.children = only.children;
    }

    return folder;
  };

  if (singleRoot) {
    return (singleRoot.children ?? []).map((child) => build(child, child.name));
  }
  return cc.files.map((root) => build(root, root.name));
}

function countFolders(nodes: readonly TreeNode[]): number {
  let count = 0;
  const stack = [...nodes];
  while (stack.length > 0) {
    const node = stack.pop() as TreeNode;
    if (node.kind === "folder") count++;
    if (node.children) stack.push(...node.children);
  }
  return count;
}

function pickDefaultSelection(
  files: readonly RenderFile[],
  lens: Lens,
  metric: string | null,
  metrics: readonly RenderMetric[]
): number | null {
  if (files.length === 0) return null;

  if (lens === "metric" && metric) {
    const index = metrics.findIndex((entry) => entry.key === metric);
    if (index >= 0) {
      let best: RenderFile | null = null;
      for (const file of files) {
        const value = file.values[index];
        if (value === null || value === undefined) continue;
        if (!best || value > (best.values[index] ?? -Infinity)) best = file;
      }
      if (best) return best.index;
    }
  }

  if (lens === "structure") {
    return files.reduce((best, file) =>
      file.actualArea > best.actualArea ? file : best
    ).index;
  }

  return files.reduce((best, file) => (file.risk > best.risk ? file : best)).index;
}
