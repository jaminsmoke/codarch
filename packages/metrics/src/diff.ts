import {
  walkFiles,
  walkTree,
  type CcJson,
  type CcMigrationLanguage,
  type CcMigrationLanguageStats,
  type CcMigrationStatus,
  type CcNode
} from "@codarch/schema";
import type { RuleConfig } from "./config";
import {
  emptyRuleReport,
  evaluateRules,
  type RuleInput,
  type RuleReport
} from "./rules";

export interface SnapshotSummary {
  projectName: string;
  checksum: string;
  files: number;
  folders: number;
  edges: number;
}

export interface DiffFile {
  id: string;
  path: string;
  metrics: Record<string, number>;
}

export interface MetricChange {
  metric: string;
  base: number | null;
  head: number | null;
  /** `head - base`; `null` si la métrica solo existe en un lado. */
  delta: number | null;
}

export interface ChangedFile {
  id: string;
  path: string;
  changes: MetricChange[];
}

export interface EdgeChange {
  fromId: string;
  toId: string;
  from: string;
  to: string;
  weight: number;
  typeOnly: number;
  isCyclic: boolean;
}

export interface CycleComponent {
  size: number;
  nodes: Array<{ id: string; path: string }>;
}

/** Deuda de migración de un fichero, con su antes y su después. */
export interface MigrationFileChange {
  id: string;
  path: string;
  language: CcMigrationLanguage;
  status: CcMigrationStatus;
  /** Deuda en la base; `null` si el fichero no estaba. */
  base: number | null;
  /** Deuda en el head; `null` si el fichero ya no está. */
  head: number | null;
  /** `head - base`. */
  delta: number | null;
}

/** Un fichero y su deuda actual. */
export interface MigrationFileDebt {
  id: string;
  path: string;
  language: CcMigrationLanguage;
  status: CcMigrationStatus;
  debt: number;
  rloc: number;
  /** Aristas FFI que tocan el fichero. */
  crossings: number;
}

/** Cómo ha cambiado la migración entre la base y el head. */
export interface MigrationReport {
  /** Estado por lenguaje, en la base y en el head. */
  languages: {
    base: Partial<Record<CcMigrationLanguage, CcMigrationLanguageStats>>;
    head: Partial<Record<CcMigrationLanguage, CcMigrationLanguageStats>>;
  };
  /** Estado por categoría (`js`, `rust`, `bridge`, `native`). */
  status: {
    base: Record<CcMigrationStatus, number>;
    head: Record<CcMigrationStatus, number>;
  };
  /** Deuda total de migración. */
  debt: MigrationDelta;
  /** Cruces FFI. */
  crossings: MigrationDelta;
  /** Puentes (ficheros que tocan FFI). */
  bridgeFiles: MigrationDelta;
  /** Ficheros cuya deuda ha crecido o se ha reducido. */
  files: { increased: MigrationFileChange[]; decreased: MigrationFileChange[] };
  /** Los ficheros con más deuda ahora. */
  topDebt: MigrationFileDebt[];
}

/** Un valor con su antes y su después. El delta es `head - base`. */
export interface MigrationDelta {
  base: number;
  head: number;
  delta: number;
}

export interface Hotspot {
  id: string;
  path: string;
  metric: string;
  /** Para un fichero nuevo, `0`: antes no existía. */
  base: number;
  head: number;
  delta: number;
  change: "added" | "changed";
}

export interface DiffSummary {
  addedFiles: number;
  removedFiles: number;
  changedFiles: number;
  addedEdges: number;
  removedEdges: number;
  cyclicEdgesAdded: number;
  cyclicEdgesRemoved: number;
  introducedCycles: number;
  fixedCycles: number;
  hotspots: number;
}

export interface DiffReport {
  schemaVersion: "1.0";
  base: SnapshotSummary;
  head: SnapshotSummary;
  summary: DiffSummary;
  hotspotMetric: string | null;
  rules: RuleReport;
  files: {
    added: DiffFile[];
    removed: DiffFile[];
    changed: ChangedFile[];
  };
  edges: {
    added: EdgeChange[];
    removed: EdgeChange[];
    cyclicAdded: EdgeChange[];
    cyclicRemoved: EdgeChange[];
  };
  cycles: {
    introduced: CycleComponent[];
    fixed: CycleComponent[];
  };
  hotspots: Hotspot[];
  /** Cómo ha cambiado la migración: es el motivo de ser del producto. */
  migration: MigrationReport;
}

export interface DiffOptions {
  /** Número máximo de hotspots; por defecto 10. */
  top?: number;
  /** Métrica usada para ordenar hotspots; por defecto `maxComplexity`, luego `rloc`. */
  hotspotMetric?: string;
  /** Reglas de arquitectura; si falta, el reporte no evalúa violaciones. */
  rules?: RuleConfig;
}

interface IndexedEdge {
  fromId: string;
  toId: string;
  weight: number;
  typeOnly: number;
  isCyclic: boolean;
}

interface IndexedSnapshot {
  cc: CcJson;
  paths: Map<string, string>;
  nodes: string[];
  metrics: Record<string, Record<string, number>>;
  edges: Map<string, IndexedEdge>;
}

interface CycleGroup {
  key: string;
  component: CycleComponent;
}

/**
 * Compara dos snapshots `cc.json` por identidad de nodo, no por posición.
 *
 * El reporte es determinista: arrays ordenados y sin timestamps. Los cambios de
 * métricas se calculan sobre la unión de claves; una métrica que aparece o
 * desaparece tiene `delta: null`, no un cero engañoso.
 */
export function diffSnapshots(
  base: CcJson,
  head: CcJson,
  options: DiffOptions = {}
): DiffReport {
  const top = Math.max(1, Math.floor(options.top ?? 10));
  const baseIndex = indexSnapshot(base);
  const headIndex = indexSnapshot(head);

  const added = difference(headIndex, baseIndex);
  const removed = difference(baseIndex, headIndex);
  const changed = changedFiles(baseIndex, headIndex);

  const edgeDiff = diffEdges(baseIndex, headIndex);
  const baseCycles = cycleGroups(baseIndex);
  const headCycles = cycleGroups(headIndex);
  const introducedCycles = cycleDifference(headCycles, baseCycles);
  const fixedCycles = cycleDifference(baseCycles, headCycles);

  const hotspotMetric = chooseHotspotMetric(
    baseIndex,
    headIndex,
    options.hotspotMetric
  );
  const hotspots = hotspotMetric
    ? buildHotspots(baseIndex, headIndex, added, changed, hotspotMetric, top)
    : [];
  const rules = options.rules
    ? evaluateRules(
        ruleInput(baseIndex, [...baseCycles.values()].map((group) => group.component)),
        ruleInput(headIndex, [...headCycles.values()].map((group) => group.component)),
        options.rules
      )
    : emptyRuleReport();

  return {
    schemaVersion: "1.0",
    base: summarize(baseIndex),
    head: summarize(headIndex),
    summary: {
      addedFiles: added.length,
      removedFiles: removed.length,
      changedFiles: changed.length,
      addedEdges: edgeDiff.added.length,
      removedEdges: edgeDiff.removed.length,
      cyclicEdgesAdded: edgeDiff.cyclicAdded.length,
      cyclicEdgesRemoved: edgeDiff.cyclicRemoved.length,
      introducedCycles: introducedCycles.length,
      fixedCycles: fixedCycles.length,
      hotspots: hotspots.length
    },
    hotspotMetric,
    rules,
    files: { added, removed, changed },
    edges: edgeDiff,
    cycles: { introduced: introducedCycles, fixed: fixedCycles },
    hotspots,
    migration: buildMigrationReport(baseIndex, headIndex, top)
  };
}

/**
 * Compara la lente de migración entre la base y el head.
 *
 * La migración es el motivo de ser del producto: que su deuda se vea en el
 * PR, no solo en el mapa.
 */
function buildMigrationReport(
  baseIndex: IndexedSnapshot,
  headIndex: IndexedSnapshot,
  top: number
): MigrationReport {
  const baseLens = baseIndex.cc.lenses?.migration;
  const headLens = headIndex.cc.lenses?.migration;

  const baseNodes = baseLens?.nodes ?? {};
  const headNodes = headLens?.nodes ?? {};

  const changes: MigrationFileChange[] = [];
  for (const id of new Set([...Object.keys(baseNodes), ...Object.keys(headNodes)])) {
    const base = baseNodes[id];
    const head = headNodes[id];
    if (!base && !head) continue;
    const reference = head ?? (base as NonNullable<typeof base>);
    const baseDebt = base ? base.debt ?? 0 : null;
    const headDebt = head ? head.debt ?? 0 : null;
    const delta =
      baseDebt === null || headDebt === null ? null : headDebt - baseDebt;
    if (delta === null || delta === 0) continue;
    changes.push({
      id,
      path: headIndex.paths.get(id) ?? baseIndex.paths.get(id) ?? id,
      language: reference.language,
      status: reference.status,
      base: baseDebt,
      head: headDebt,
      delta
    });
  }

  const increased = changes
    .filter((change) => (change.delta ?? 0) > 0)
    .sort(
      (left, right) =>
        (right.delta ?? 0) - (left.delta ?? 0) || compareByPath(left, right)
    );
  const decreased = changes
    .filter((change) => (change.delta ?? 0) < 0)
    .sort(
      (left, right) =>
        (left.delta ?? 0) - (right.delta ?? 0) || compareByPath(left, right)
    );

  const topDebt: MigrationFileDebt[] = [];
  for (const [id, node] of Object.entries(headNodes)) {
    if (!node.debt) continue;
    topDebt.push({
      id,
      path: headIndex.paths.get(id) ?? id,
      language: node.language,
      status: node.status,
      debt: node.debt,
      rloc: node.rloc,
      crossings: node.crossings
    });
  }
  topDebt.sort(
    (left, right) => right.debt - left.debt || compareByPath(left, right)
  );

  const baseSummary = baseLens?.summary;
  const headSummary = headLens?.summary;

  return {
    languages: {
      base: baseSummary?.languages ?? {},
      head: headSummary?.languages ?? {}
    },
    status: {
      base: baseSummary?.status ?? emptyStatus(),
      head: headSummary?.status ?? emptyStatus()
    },
    debt: {
      base: baseSummary?.migrationDebt ?? 0,
      head: headSummary?.migrationDebt ?? 0,
      delta: (headSummary?.migrationDebt ?? 0) - (baseSummary?.migrationDebt ?? 0)
    },
    crossings: {
      base: baseSummary?.ffiCrossings ?? 0,
      head: headSummary?.ffiCrossings ?? 0,
      delta: (headSummary?.ffiCrossings ?? 0) - (baseSummary?.ffiCrossings ?? 0)
    },
    bridgeFiles: {
      base: baseSummary?.bridgeFiles ?? 0,
      head: headSummary?.bridgeFiles ?? 0,
      delta: (headSummary?.bridgeFiles ?? 0) - (baseSummary?.bridgeFiles ?? 0)
    },
    files: {
      increased: increased.slice(0, top),
      decreased: decreased.slice(0, top)
    },
    topDebt: topDebt.slice(0, top)
  };
}

function emptyStatus(): Record<CcMigrationStatus, number> {
  return { js: 0, rust: 0, bridge: 0, native: 0 };
}

function indexSnapshot(cc: CcJson): IndexedSnapshot {
  const paths = new Map<string, string>();
  for (const root of cc.files) {
    walkFiles([root], (entry) => {
      paths.set(entry.node.id, relativePath(root, entry.path, entry.node));
    });
  }

  const nodes = [...paths.keys()].sort((left, right) =>
    compareStrings(paths.get(left) ?? left, paths.get(right) ?? right)
  );

  const metrics = cc.lenses?.metrics?.attributes ?? {};
  const edges = new Map<string, IndexedEdge>();
  for (const edge of cc.lenses?.dependency?.edges ?? []) {
    const key = edgeKey(edge.fromId, edge.toId);
    const weight = finiteNumber(edge.attributes?.weight) ?? 1;
    const typeOnly = finiteNumber(edge.attributes?.typeOnly) ?? 0;
    const existing = edges.get(key);
    if (existing) {
      existing.weight += weight;
      existing.typeOnly += typeOnly;
      existing.isCyclic = existing.isCyclic || edge.isCyclic === true;
    } else {
      edges.set(key, {
        fromId: edge.fromId,
        toId: edge.toId,
        weight,
        typeOnly,
        isCyclic: edge.isCyclic === true
      });
    }
  }

  return { cc, paths, nodes, metrics, edges };
}

function relativePath(root: CcNode, fullPath: string, leaf: CcNode): string {
  if (fullPath === root.name) return leaf.name;
  const prefix = `${root.name}/`;
  return fullPath.startsWith(prefix)
    ? fullPath.slice(prefix.length)
    : fullPath;
}

function summarize(index: IndexedSnapshot): SnapshotSummary {
  let folders = 0;
  walkTree(index.cc.files, (entry) => {
    if (entry.node.type === "Folder" && entry.depth > 0) folders++;
  });

  return {
    projectName: index.cc.meta.projectName ?? "",
    checksum: index.cc.meta.checksum ?? "",
    files: index.paths.size,
    folders,
    edges: index.edges.size
  };
}

function difference(
  present: IndexedSnapshot,
  absent: IndexedSnapshot
): DiffFile[] {
  const files: DiffFile[] = [];
  for (const [id, path] of present.paths) {
    if (absent.paths.has(id)) continue;
    files.push({
      id,
      path,
      metrics: sortedMetrics(present.metrics[id])
    });
  }
  return files.sort(compareByPath);
}

function changedFiles(
  base: IndexedSnapshot,
  head: IndexedSnapshot
): ChangedFile[] {
  const changed: ChangedFile[] = [];
  for (const [id, path] of head.paths) {
    if (!base.paths.has(id)) continue;
    const baseValues = base.metrics[id] ?? {};
    const headValues = head.metrics[id] ?? {};
    const keys = new Set([...Object.keys(baseValues), ...Object.keys(headValues)]);
    const changes: MetricChange[] = [];

    for (const metric of [...keys].sort(compareStrings)) {
      const baseValue = finiteNumber(baseValues[metric]);
      const headValue = finiteNumber(headValues[metric]);
      if (baseValue === null && headValue === null) continue;
      if (baseValue !== null && headValue !== null && baseValue === headValue) {
        continue;
      }
      changes.push({
        metric,
        base: baseValue,
        head: headValue,
        delta:
          baseValue !== null && headValue !== null
            ? headValue - baseValue
            : null
      });
    }

    if (changes.length > 0) changed.push({ id, path, changes });
  }
  return changed.sort(compareChangedFiles);
}

function diffEdges(
  base: IndexedSnapshot,
  head: IndexedSnapshot
): DiffReport["edges"] {
  const added: EdgeChange[] = [];
  const removed: EdgeChange[] = [];

  for (const [key, edge] of head.edges) {
    if (!base.edges.has(key)) added.push(edgeChange(head, edge));
  }
  for (const [key, edge] of base.edges) {
    if (!head.edges.has(key)) removed.push(edgeChange(base, edge));
  }

  added.sort(compareEdgeChanges);
  removed.sort(compareEdgeChanges);

  return {
    added,
    removed,
    cyclicAdded: added.filter((edge) => edge.isCyclic),
    cyclicRemoved: removed.filter((edge) => edge.isCyclic)
  };
}

function edgeChange(index: IndexedSnapshot, edge: IndexedEdge): EdgeChange {
  return {
    fromId: edge.fromId,
    toId: edge.toId,
    from: index.paths.get(edge.fromId) ?? edge.fromId,
    to: index.paths.get(edge.toId) ?? edge.toId,
    weight: edge.weight,
    typeOnly: edge.typeOnly,
    isCyclic: edge.isCyclic
  };
}

function cycleGroups(index: IndexedSnapshot): Map<string, CycleGroup> {
  const adjacency = new Map<string, string[]>();
  const reverse = new Map<string, string[]>();
  for (const node of index.nodes) {
    adjacency.set(node, []);
    reverse.set(node, []);
  }

  for (const edge of index.edges.values()) {
    if (!index.paths.has(edge.fromId) || !index.paths.has(edge.toId)) continue;
    adjacency.get(edge.fromId)?.push(edge.toId);
    reverse.get(edge.toId)?.push(edge.fromId);
  }

  for (const [node, neighbors] of adjacency) {
    adjacency.set(node, [...new Set(neighbors)].sort(compareStrings));
  }
  for (const [node, neighbors] of reverse) {
    reverse.set(node, [...new Set(neighbors)].sort(compareStrings));
  }

  // Kosaraju iterativo: el orden de finalización se calcula sin recursión para
  // no romper con cadenas profundas.
  const visited = new Set<string>();
  const order: string[] = [];

  for (const start of index.nodes) {
    if (visited.has(start)) continue;
    visited.add(start);
    const stack: Array<{ node: string; neighbors: string[]; next: number }> = [
      { node: start, neighbors: adjacency.get(start) ?? [], next: 0 }
    ];

    while (stack.length > 0) {
      const frame = stack[stack.length - 1] as {
        node: string;
        neighbors: string[];
        next: number;
      };
      if (frame.next < frame.neighbors.length) {
        const next = frame.neighbors[frame.next] as string;
        frame.next++;
        if (!visited.has(next)) {
          visited.add(next);
          stack.push({
            node: next,
            neighbors: adjacency.get(next) ?? [],
            next: 0
          });
        }
      } else {
        order.push(frame.node);
        stack.pop();
      }
    }
  }

  const assigned = new Set<string>();
  const groups = new Map<string, CycleGroup>();

  for (let position = order.length - 1; position >= 0; position--) {
    const start = order[position] as string;
    if (assigned.has(start)) continue;

    assigned.add(start);
    const component: string[] = [];
    const stack = [start];

    while (stack.length > 0) {
      const node = stack.pop() as string;
      component.push(node);
      for (const next of reverse.get(node) ?? []) {
        if (assigned.has(next)) continue;
        assigned.add(next);
        stack.push(next);
      }
    }

    const hasSelfLoop = component.some((node) =>
      (adjacency.get(node) ?? []).includes(node)
    );
    if (component.length < 2 && !hasSelfLoop) continue;

    const nodes = component
      .map((id) => ({
        id,
        path: index.paths.get(id) ?? id
      }))
      .sort((left, right) => {
        return (
          compareStrings(left.path, right.path) ||
          compareStrings(left.id, right.id)
        );
      });
    const key = [...component].sort(compareStrings).join("\u0000");
    groups.set(key, { key, component: { size: nodes.length, nodes } });
  }

  return groups;
}

function cycleDifference(
  present: Map<string, CycleGroup>,
  absent: Map<string, CycleGroup>
): CycleComponent[] {
  const cycles: CycleComponent[] = [];
  for (const [key, group] of present) {
    if (!absent.has(key)) cycles.push(group.component);
  }
  return cycles.sort(compareCycles);
}

function ruleInput(
  index: IndexedSnapshot,
  cycles: CycleComponent[]
): RuleInput {
  const files = index.nodes.map((id) => ({
    id,
    path: index.paths.get(id) ?? id,
    metrics: sortedMetrics(index.metrics[id])
  }));

  const edges: RuleInput["edges"] = [];
  for (const edge of index.edges.values()) {
    if (!index.paths.has(edge.fromId) || !index.paths.has(edge.toId)) {
      continue;
    }
    edges.push({
      fromId: edge.fromId,
      toId: edge.toId,
      from: index.paths.get(edge.fromId) ?? edge.fromId,
      to: index.paths.get(edge.toId) ?? edge.toId
    });
  }

  return { files, edges, cycles };
}

function chooseHotspotMetric(
  base: IndexedSnapshot,
  head: IndexedSnapshot,
  requested: string | undefined
): string | null {
  if (requested) return requested;
  for (const metric of ["maxComplexity", "rloc"]) {
    if (hasMetric(base, metric) || hasMetric(head, metric)) return metric;
  }
  return null;
}

function hasMetric(index: IndexedSnapshot, metric: string): boolean {
  for (const values of Object.values(index.metrics)) {
    if (finiteNumber(values[metric]) !== null) return true;
  }
  return false;
}

function buildHotspots(
  base: IndexedSnapshot,
  head: IndexedSnapshot,
  added: readonly DiffFile[],
  changed: readonly ChangedFile[],
  metric: string,
  top: number
): Hotspot[] {
  const addedIds = new Set(added.map((file) => file.id));
  const candidates = [...added, ...changed];

  const hotspots: Hotspot[] = [];
  for (const file of candidates) {
    const baseValue = finiteNumber(base.metrics[file.id]?.[metric]);
    const headValue = finiteNumber(head.metrics[file.id]?.[metric]);
    if (headValue === null) continue;

    const before = baseValue ?? 0;
    const delta = headValue - before;
    if (delta <= 0) continue;

    hotspots.push({
      id: file.id,
      path: file.path,
      metric,
      base: before,
      head: headValue,
      delta,
      change: addedIds.has(file.id) ? "added" : "changed"
    });
  }

  return hotspots
    .sort(
      (left, right) =>
        right.delta - left.delta ||
        right.head - left.head ||
        compareStrings(left.path, right.path)
    )
    .slice(0, top);
}

function sortedMetrics(
  values: Record<string, number> | undefined
): Record<string, number> {
  const sorted: Record<string, number> = {};
  if (!values) return sorted;
  for (const key of Object.keys(values).sort(compareStrings)) {
    const value = finiteNumber(values[key]);
    if (value !== null) sorted[key] = value;
  }
  return sorted;
}

function finiteNumber(value: number | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function edgeKey(fromId: string, toId: string): string {
  return `${fromId}\u0000${toId}`;
}

function compareByPath(left: { path: string; id: string }, right: { path: string; id: string }): number {
  return compareStrings(left.path, right.path) || compareStrings(left.id, right.id);
}

function compareChangedFiles(left: ChangedFile, right: ChangedFile): number {
  return compareStrings(left.path, right.path) || compareStrings(left.id, right.id);
}

function compareEdgeChanges(left: EdgeChange, right: EdgeChange): number {
  return (
    compareStrings(left.from, right.from) ||
    compareStrings(left.to, right.to) ||
    compareStrings(left.fromId, right.fromId) ||
    compareStrings(left.toId, right.toId)
  );
}

function compareCycles(left: CycleComponent, right: CycleComponent): number {
  return (
    compareStrings(
      left.nodes[0]?.path ?? "",
      right.nodes[0]?.path ?? ""
    ) || left.size - right.size
  );
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
