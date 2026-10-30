import type {
  CcEdge,
  CcJson,
  CcNode,
  CcRestKind,
  CcRestNode,
  CcStats
} from "@codarch/schema/browser";
import { defaultMetric, getStats, walkFiles } from "@codarch/schema/browser";
import {
  CHURN_METRIC_CANDIDATES,
  COMPLEXITY_METRIC_CANDIDATES,
  firstMetric,
  lintScores,
  riskBreakdown,
  type RiskPart
} from "@codarch/metrics/browser";
import type { LintArtifact } from "@codarch/lint/browser";

export type Lens = "structure" | "risk" | "metric" | "kind";

export interface RenderOptions {
  /** Métrica que decide el área. Por defecto `rloc` o la de mayor cobertura. */
  areaMetric?: string;
  /** `risk`, `structure`, `kind` o el nombre de una métrica. */
  color?: string;
  /** Título alternativo para la cabecera. */
  title?: string;
  /**
   * El lint del proyecto, si lo hay (ADR 0094).
   *
   * Con él, el riesgo gana su cuarta señal; sin él, la cuenta es la de
   * siempre. Las rutas del artefacto son las del repo, como las del snapshot.
   */
  lint?: LintArtifact | null;
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
  /** Las señales del riesgo, con su peso y su parte (ADR 0057, ADR 0094). */
  riskParts: RiskParts;
  complexity: number;
  churn: number;
  /** Deuda del lint ya ponderada (`errors + ¼ avisos`); 0 sin artefacto. */
  lint: number;
  /** Valores alineados con `RenderModel.metrics`; `null` cuando la métrica no existe. */
  values: Array<number | null>;
  /**
   * El tipo del fichero en el mapa del resto (ADR 0093); `null` en el código.
   *
   * Es lo que pinta el color por tipo y lo que cuenta la leyenda, sin que la
   * app tenga que volver al snapshot.
   */
  kind: CcRestKind | null;
}

export type RiskParts = Record<
  "complexity" | "churn" | "size" | "lint",
  RiskPart
>;

/** El desglose de un fichero sin señales: el mapa lo rellena después. */
const NO_SIGNAL: RiskPart = {
  value: 0,
  p95: 0,
  norm: 0,
  weight: 0,
  share: 0
};
const NO_RISK_PARTS: RiskParts = {
  complexity: NO_SIGNAL,
  churn: NO_SIGNAL,
  size: NO_SIGNAL,
  lint: NO_SIGNAL
};

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
  /** Explicación breve del descriptor, si el snapshot la trae. */
  description?: string;
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

/**
 * Las métricas que el modelo lleva siempre que el snapshot las tenga.
 *
 * La deuda de migración y los cruces FFI están aquí para que la ficha del
 * fichero tenga su p95 y su barra aunque no sean el modo de color activo
 * (ADR 0060); antes solo entraban al elegirlas para pintar el mapa.
 */
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
  "migrationDebt",
  "ffiCrossings",
  "number_of_commits",
  "number_of_authors",
  "incoming_dependencies",
  "outgoing_dependencies"
];

/** id de nodo → nombre de métrica → valor, tal como lo trae la lente. */
type MetricAttributes = Record<string, Record<string, number>>;

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

function metricDescription(
  attributes: Record<string, unknown> | undefined,
  key: string
): string | undefined {
  const descriptor = attributes?.[key];
  if (
    isRecord(descriptor) &&
    typeof descriptor.description === "string" &&
    descriptor.description
  ) {
    return descriptor.description;
  }
  return undefined;
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
 *
 * Cada paso que escribe en `files` dice qué escribe —área, riesgo, sección, valores— y
 * ninguno necesita mirar el código del otro: juntos eran la función más compleja del
 * repositorio, y el propio mapa la señalaba como su bloque más caliente.
 */
export function buildRenderModel(cc: CcJson, options: RenderOptions = {}): RenderModel {
  const stats = getStats(cc);
  const coverage = new Set(stats.metricCoverage.map((entry) => entry.name));
  const attributes = cc.lenses?.metrics?.attributes ?? {};
  const descriptors = cc.lenses?.metrics?.attributeDescriptors as
    | Record<string, unknown>
    | undefined;

  const warnings: string[] = [];

  const areaMetric = resolveAreaMetric(stats, coverage, options);
  const complexityKey = firstMetric(coverage, COMPLEXITY_METRIC_CANDIDATES);
  const churnKey = firstMetric(coverage, CHURN_METRIC_CANDIDATES);
  const metricKeys = collectMetricKeys(coverage, {
    areaMetric,
    complexityKey,
    churnKey,
    color: options.color
  });

  const singleRoot =
    cc.files.length === 1 && cc.files[0]?.type === "Folder" ? cc.files[0] : null;
  const prefix = singleRoot ? `${singleRoot.name}/` : "";
  const rootName = singleRoot?.name ?? "";

  const files = collectFiles(cc, attributes, {
    areaMetric,
    complexityKey,
    churnKey,
    prefix,
    warnings,
    restKinds: cc.lenses?.rest?.nodes ?? {},
    // La deuda del lint por ruta; sin artefacto, ninguna.
    lintByPath: options.lint ? lintScores(options.lint.files) : {}
  });
  const fileIndexById = new Map(files.map((file) => [file.nodeId, file.index]));

  warnAboutArea(files, areaMetric, options, warnings);
  applyRisk(files);

  const sections = buildSections(files);

  const metrics = buildMetrics(metricKeys, files, attributes, descriptors);
  applyMetricValues(files, metrics, attributes);

  const roots = buildRoots(cc, singleRoot, fileIndexById, files);
  const folderCount = countFolders(roots);

  const { edges, cycles } = collectDependency(cc, fileIndexById, files.length, warnings);

  const totalArea = files.reduce((sum, file) => sum + file.actualArea, 0);
  const hotspotCount = files.filter((file) => file.risk >= 0.66).length;

  const { initialLens, initialMetric } = resolveLens(coverage, options);
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

/**
 * La métrica que decide el área: la pedida, o la de mayor cobertura.
 *
 * Una métrica pedida que el snapshot no trae es un error, no una caída al
 * defecto: quien la pidió por la línea de órdenes quiere saberlo.
 */
function resolveAreaMetric(
  stats: CcStats,
  coverage: ReadonlySet<string>,
  options: RenderOptions
): string | null {
  if (options.areaMetric) {
    if (!coverage.has(options.areaMetric)) {
      throw new RenderError(
        `la métrica de área "${options.areaMetric}" no existe en este cc.json`
      );
    }
    return options.areaMetric;
  }
  return defaultMetric(stats) ?? null;
}

/** Las métricas que el modelo lleva: las curadas y las que el modo activo necesita. */
function collectMetricKeys(
  coverage: ReadonlySet<string>,
  wanted: {
    areaMetric: string | null;
    complexityKey: string | null;
    churnKey: string | null;
    color: string | undefined;
  }
): string[] {
  const keys: string[] = [];
  const add = (key: string | null): void => {
    if (key && coverage.has(key) && !keys.includes(key)) keys.push(key);
  };

  for (const key of CURATED_METRICS) add(key);
  add(wanted.areaMetric);
  add(wanted.complexityKey);
  add(wanted.churnKey);
  if (wanted.color && wanted.color !== "risk" && wanted.color !== "structure") {
    add(wanted.color);
  }

  return keys;
}

/** Un fichero del snapshot, con su área real y sus señales de riesgo en cero. */
function collectFiles(
  cc: CcJson,
  attributes: MetricAttributes,
  context: {
    areaMetric: string | null;
    complexityKey: string | null;
    churnKey: string | null;
    prefix: string;
    warnings: string[];
    /** El tipo de cada fichero del resto, por id (ADR 0093). */
    restKinds: Record<string, CcRestNode>;
    /** La deuda del lint por ruta, si el proyecto tiene artefacto (ADR 0094). */
    lintByPath: Readonly<Record<string, number>>;
  }
): RenderFile[] {
  const files: RenderFile[] = [];

  walkFiles(cc.files, (entry) => {
    const fullPath = entry.path;
    const path =
      context.prefix && fullPath.startsWith(context.prefix)
        ? fullPath.slice(context.prefix.length)
        : fullPath;
    const values = attributes[entry.node.id];
    const rawArea = valueOf(values, context.areaMetric);

    files.push({
      index: files.length,
      nodeId: entry.node.id,
      path,
      name: entry.node.name,
      section: -1,
      area: Math.max(1, rawArea ?? 0),
      actualArea: rawArea ?? 0,
      risk: 0,
      riskParts: NO_RISK_PARTS,
      complexity: valueOf(values, context.complexityKey) ?? 0,
      churn: valueOf(values, context.churnKey) ?? 0,
      // Con carpeta raíz el snapshot lleva su nombre delante; el lint, no.
      lint: context.lintByPath[fullPath] ?? context.lintByPath[path] ?? 0,
      values: [],
      kind: context.restKinds[entry.node.id]?.kind ?? null
    });
  });

  return files;
}

/** Un fichero sin la métrica de área se dibuja con el mínimo: se dice, no se esconde. */
function warnAboutArea(
  files: readonly RenderFile[],
  areaMetric: string | null,
  options: RenderOptions,
  warnings: string[]
): void {
  if (!areaMetric || files.length === 0) return;

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

/**
 * Riesgo compuesto: complejidad, churn y tamaño, más el lint cuando lo hay.
 * Si falta una señal, los pesos se renormalizan: un proyecto sin historial
 * git no debe quedar con un máximo artificial de 68/100, y un proyecto sin
 * lint se queda con la cuenta de siempre (ADR 0094).
 */
function applyRisk(files: RenderFile[]): void {
  const risks = riskBreakdown(
    files.map((file) => ({
      complexity: file.complexity,
      churn: file.churn,
      size: file.actualArea,
      lint: file.lint
    }))
  );

  for (const [index, file] of files.entries()) {
    const breakdown = risks[index];
    if (!breakdown) continue;
    file.risk = breakdown.risk;
    file.riskParts = breakdown.parts;
  }
}

/**
 * Secciones: color categórico por las tres primeras partes de la ruta.
 * Da color a "app/codeCharta/features" sin convertir cada carpeta en un color.
 */
function buildSections(files: RenderFile[]): RenderSection[] {
  const accumulator = new Map<string, { files: number; area: number }>();
  for (const file of files) {
    const key = sectionForPath(file.path);
    const current = accumulator.get(key) ?? { files: 0, area: 0 };
    current.files++;
    current.area += file.actualArea;
    accumulator.set(key, current);
  }

  const sections: RenderSection[] = [...accumulator.entries()]
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

  return sections;
}

/** La escala de cada métrica: mínimo, p95 y si hay cola suficiente para el log. */
function buildMetrics(
  keys: readonly string[],
  files: readonly RenderFile[],
  attributes: MetricAttributes,
  descriptors: Record<string, unknown> | undefined
): RenderMetric[] {
  return keys.map((key) => {
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
      description: metricDescription(descriptors, key),
      direction: metricDirection(descriptors, key),
      min,
      max,
      actualMax,
      p95,
      mode: skewed ? "log" : "linear",
      coverage: present.length
    };
  });
}

/** Los valores de un fichero, alineados con `metrics` para leerlos por índice. */
function applyMetricValues(
  files: RenderFile[],
  metrics: readonly RenderMetric[],
  attributes: MetricAttributes
): void {
  for (const file of files) {
    const values = attributes[file.nodeId];
    file.values = metrics.map((metric) => valueOf(values, metric.key) ?? null);
  }
}

/**
 * Las aristas del grafo, sin repetirlas, y las que el snapshot marca como ciclo.
 *
 * El snapshot ya decide qué aristas son ciclos de ejecución (ADR 0037). No se
 * infiere un ciclo por la sola ida y vuelta: dos imports de tipos pueden
 * apuntarse sin ejecutarse.
 */
function collectDependency(
  cc: CcJson,
  fileIndexById: ReadonlyMap<string, number>,
  fileCount: number,
  warnings: string[]
): { edges: EdgePair[]; cycles: EdgePair[] } {
  const dependency = cc.lenses?.dependency;
  const leafEdges = asEdges(dependency?.leafEdges);
  const rawEdges = leafEdges.length > 0 ? leafEdges : asEdges(dependency?.edges);

  const seen = new Set<number>();
  const edges: EdgePair[] = [];
  const n = fileCount;

  for (const edge of rawEdges) {
    const from = fileIndexById.get(edge.fromId);
    const to = fileIndexById.get(edge.toId);
    if (from === undefined || to === undefined || from === to) continue;
    const key = from * n + to;
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push({ from, to });
    if (edges.length >= 20_000) {
      warnings.push("se han limitado las dependencias a 20.000 aristas");
      break;
    }
  }

  edges.sort((a, b) => a.from - b.from || a.to - b.to);

  const flagged = new Set<number>();
  for (const edge of rawEdges) {
    if (edge.isCyclic !== true) continue;
    const from = fileIndexById.get(edge.fromId);
    const to = fileIndexById.get(edge.toId);
    if (from === undefined || to === undefined) continue;
    flagged.add(from * n + to);
  }

  const cycles: EdgePair[] = [];
  const inCycle = new Set<number>();
  for (const edge of edges) {
    const key = edge.from * n + edge.to;
    if (!flagged.has(key) || inCycle.has(key)) continue;
    inCycle.add(key);
    cycles.push(edge);
  }
  cycles.sort((a, b) => a.from - b.from || a.to - b.to);

  if (rawEdges.length === 0) {
    warnings.push("este cc.json no trae una lente de dependencias utilizable");
  }

  return { edges, cycles };
}

/** La lente con la que abre el mapa: la pedida, o el riesgo. */
function resolveLens(
  coverage: ReadonlySet<string>,
  options: RenderOptions
): { initialLens: Lens; initialMetric: string | null } {
  // `structure` y `kind` no leen ninguna métrica: el color sale de la sección
  // y del tipo del resto, que el modelo ya lleva (ADR 0093).
  if (options.color === "structure" || options.color === "kind") {
    return { initialLens: options.color, initialMetric: null };
  }

  if (options.color && options.color !== "risk") {
    if (!coverage.has(options.color)) {
      throw new RenderError(
        `la métrica de color "${options.color}" no existe en este cc.json`
      );
    }
    return { initialLens: "metric", initialMetric: options.color };
  }

  return { initialLens: "risk", initialMetric: null };
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

  if (lens === "structure" || lens === "kind") {
    return files.reduce((best, file) =>
      file.actualArea > best.actualArea ? file : best
    ).index;
  }

  return files.reduce((best, file) => (file.risk > best.risk ? file : best)).index;
}
