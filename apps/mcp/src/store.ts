import fs from "node:fs";
import path from "node:path";
import {
  parseCcJson,
  walkFiles,
  type CcJson,
  type CcNode
} from "@codarch/schema";
import {
  CHURN_METRIC_CANDIDATES,
  COMPLEXITY_METRIC_CANDIDATES,
  REPORT_SCHEMA_VERSION,
  firstMetric,
  parseReport,
  riskScores,
  type DiffReport,
  type Hotspot,
  type MetricChange,
  type RuleViolation
} from "@codarch/metrics";

export class McpDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "McpDataError";
  }
}

export interface StoreFile {
  id: string;
  path: string;
  name: string;
  metrics: Record<string, number>;
  /** Riesgo compuesto 0..1, calculado en memoria con la fórmula de ADR 0008. */
  risk: number;
  complexity: number;
  churn: number;
  /** Valor de la métrica de tamaño elegida (`rloc`, luego `loc`). */
  size: number;
  /** 1 si el fichero pertenece a un ciclo; 0 si no. */
  inCycle: number;
  /** Tamaño del componente cíclico; 0 si no pertenece a ninguno. */
  cycleSize: number;
}

export interface StoreFolder {
  path: string;
  name: string;
  files: StoreFile[];
  childFolders: string[];
  /** Suma de `rloc`/`loc` de sus ficheros. */
  size: number;
  /** Máximo de complejidad entre sus ficheros. */
  maxComplexity: number;
  /** Máximo riesgo entre sus ficheros. */
  risk: number;
}

export interface StoreEdge {
  fromId: string;
  toId: string;
  from: string;
  to: string;
  weight: number;
  typeOnly: number;
  isCyclic: boolean;
}

export type ViolationStatus = "introduced" | "existing" | "resolved";

export interface StatusViolation {
  status: ViolationStatus;
  violation: RuleViolation;
}

export interface ReportFileState {
  status: "added" | "changed" | "removed";
  metrics?: Record<string, number>;
  changes?: MetricChange[];
  hotspot?: Hotspot;
}

export interface DiffCounts {
  files: { added: number; changed: number; removed: number };
  hotspots: number;
  violations: { introduced: number; existing: number; resolved: number };
}

export interface StoreOptions {
  root?: string;
  snapshotPath?: string | null;
  reportPath?: string | null;
  report?: DiffReport | null;
}

export interface LoadStoreOptions {
  root?: string;
  snapshot?: string;
  /** `null` desactiva el reporte; si falta, se busca `.codarch/report.json`. */
  report?: string | null;
}

export interface StoreSummary {
  projectName: string;
  checksum: string;
  commitHash: string;
  apiVersion: string;
  files: number;
  folders: number;
  edges: number;
  sizeMetric: string | null;
  metrics: string[];
  reportLoaded: boolean;
}

/**
 * Índice de solo lectura sobre un snapshot `cc.json` y, opcionalmente, un
 * `report.json`. No analiza código ni evalúa reglas: consume lo que ya existe.
 */
export class ArchitectureStore {
  readonly root: string;
  readonly snapshotPath: string | null;
  readonly reportPath: string | null;
  readonly snapshot: CcJson;
  readonly report: DiffReport | null;
  readonly rootName: string | null;
  readonly sizeMetric: string | null;
  readonly files: StoreFile[];
  readonly folders: Map<string, StoreFolder>;
  readonly edges: StoreEdge[];
  readonly filesById = new Map<string, StoreFile>();
  readonly filesByPath = new Map<string, StoreFile>();
  readonly outgoing = new Map<string, StoreEdge[]>();
  readonly incoming = new Map<string, StoreEdge[]>();
  readonly riskRank = new Map<string, number>();

  private readonly complexityKey: string | null;
  private readonly churnKey: string | null;
  private readonly coverage: string[];
  private readonly reportFiles = new Map<string, ReportFileState>();
  private readonly reportViolations = new Map<string, StatusViolation[]>();
  private readonly reportHotspots = new Map<string, Hotspot>();

  constructor(cc: CcJson, options: StoreOptions = {}) {
    this.root = path.resolve(options.root ?? process.cwd());
    this.snapshotPath = options.snapshotPath
      ? path.resolve(options.snapshotPath)
      : null;
    this.reportPath = options.reportPath ? path.resolve(options.reportPath) : null;
    this.snapshot = cc;
    this.report = options.report ?? null;
    this.rootName = cc.files.length === 1 ? (cc.files[0]?.name ?? null) : null;

    const metrics = cc.lenses?.metrics?.attributes ?? {};
    const metricNames = new Set<string>();
    for (const values of Object.values(metrics)) {
      for (const name of Object.keys(values)) metricNames.add(name);
    }
    this.coverage = [...metricNames].sort(compareStrings);
    this.complexityKey = firstMetric(
      metricNames,
      COMPLEXITY_METRIC_CANDIDATES
    );
    this.churnKey = firstMetric(metricNames, CHURN_METRIC_CANDIDATES);
    this.sizeMetric = metricNames.has("rloc")
      ? "rloc"
      : metricNames.has("loc")
        ? "loc"
        : null;

    const built = this.buildFiles(metrics);
    this.files = built;
    for (const file of this.files) {
      this.filesById.set(file.id, file);
      if (this.filesByPath.has(file.path)) {
        throw new McpDataError(
          `el snapshot contiene dos ficheros con la ruta "${file.path}"`
        );
      }
      this.filesByPath.set(file.path, file);
    }

    this.folders = this.buildFolders();
    this.edges = this.buildEdges();
    this.indexEdges();
    this.computeCycles();

    const ranked = [...this.files].sort(
      (left, right) =>
        right.risk - left.risk || compareStrings(left.path, right.path)
    );
    ranked.forEach((file, index) => this.riskRank.set(file.id, index + 1));

    if (this.report) this.indexReport(this.report);
  }

  summary(): StoreSummary {
    return {
      projectName: this.snapshot.meta.projectName ?? "",
      checksum: this.snapshot.meta.checksum ?? "",
      commitHash: this.snapshot.meta.commitHash ?? "",
      apiVersion: this.snapshot.meta.apiVersion,
      files: this.files.length,
      folders: Math.max(0, this.folders.size - 1),
      edges: this.edges.length,
      sizeMetric: this.sizeMetric,
      metrics: this.coverage,
      reportLoaded: this.report !== null
    };
  }

  filesUnder(prefix: string): StoreFile[] {
    if (prefix === "") return [...this.files];
    return this.files.filter((file) => isUnder(file.path, prefix));
  }

  folder(pathValue: string): StoreFolder | undefined {
    return this.folders.get(pathValue);
  }

  normalizePath(input: string): string {
    let value = input.trim().replaceAll("\\", "/");
    if (value === "" || value === "." || value === "./") return "";
    if (value.startsWith("/") || /^[A-Za-z]:\//.test(value)) {
      throw new McpDataError(
        `"${input}" es absoluta; usa una ruta relativa al proyecto`
      );
    }

    value = value.replace(/^\.\/+/, "").replace(/\/+/g, "/").replace(/\/+$/, "");
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

  resolveTarget(input: string): StoreFile | StoreFolder {
    if (this.filesById.has(input)) {
      return this.filesById.get(input) as StoreFile;
    }

    const value = this.normalizePath(input);
    const file = this.filesByPath.get(value);
    if (file) return file;
    const folder = this.folders.get(value);
    if (folder) return folder;

    if (this.rootName) {
      if (value === this.rootName) {
        const rootFolder = this.folders.get("");
        if (rootFolder) return rootFolder;
      }
      const prefix = `${this.rootName}/`;
      if (value.startsWith(prefix)) {
        const relative = value.slice(prefix.length);
        const strippedFile = this.filesByPath.get(relative);
        if (strippedFile) return strippedFile;
        const strippedFolder = this.folders.get(relative);
        if (strippedFolder) return strippedFolder;
      }
    }

    throw new McpDataError(this.withSuggestions(input, value));
  }

  diffForPath(pathValue: string): ReportFileState | null {
    const state = this.reportFiles.get(pathValue);
    return state ? cloneState(state) : null;
  }

  diffCounts(prefix: string): DiffCounts {
    const counts: DiffCounts = {
      files: { added: 0, changed: 0, removed: 0 },
      hotspots: 0,
      violations: { introduced: 0, existing: 0, resolved: 0 }
    };
    for (const [pathValue, state] of this.reportFiles) {
      if (!isUnderOrAt(pathValue, prefix)) continue;
      counts.files[state.status]++;
      if (state.hotspot) counts.hotspots++;
    }
    const seenViolations = new Set<string>();
    for (const [pathValue, entries] of this.reportViolations) {
      if (!isUnderOrAt(pathValue, prefix)) continue;
      for (const entry of entries) {
        const key = `${entry.status}:${entry.violation.key}`;
        if (seenViolations.has(key)) continue;
        seenViolations.add(key);
        counts.violations[entry.status]++;
      }
    }
    return counts;
  }

  hotspots(prefix: string): Hotspot[] {
    return [...this.reportHotspots.values()].filter((hotspot) =>
      isUnderOrAt(hotspot.path, prefix)
    );
  }

  violationsForPaths(
    paths: readonly string[],
    limit = 20
  ): StatusViolation[] {
    const wanted = new Set(paths);
    const byKey = new Map<string, StatusViolation>();
    for (const pathValue of wanted) {
      for (const entry of this.reportViolations.get(pathValue) ?? []) {
        byKey.set(`${entry.status}:${entry.violation.key}`, entry);
      }
    }
    return [...byKey.values()]
      .sort(compareStatusViolations)
      .slice(0, Math.max(1, limit))
      .map(cloneStatusViolation);
  }

  allViolations(): StatusViolation[] {
    const byKey = new Map<string, StatusViolation>();
    for (const entries of this.reportViolations.values()) {
      for (const entry of entries) {
        byKey.set(`${entry.status}:${entry.violation.key}`, entry);
      }
    }
    return [...byKey.values()]
      .sort(compareStatusViolations)
      .map(cloneStatusViolation);
  }

  private buildFiles(
    attributes: Record<string, Record<string, number>>
  ): StoreFile[] {
    const files: StoreFile[] = [];
    const stripRootName = this.snapshot.files.length === 1;
    for (const root of this.snapshot.files) {
      walkFiles([root], (entry) => {
        const filePath = relativePath(
          root,
          entry.path,
          entry.node,
          stripRootName
        );
        const metrics = { ...attributes[entry.node.id] };
        const complexity = metricValue(metrics, this.complexityKey);
        const churn = metricValue(metrics, this.churnKey);
        const size = metricValue(metrics, this.sizeMetric);
        files.push({
          id: entry.node.id,
          path: filePath,
          name: entry.node.name,
          metrics,
          risk: 0,
          complexity,
          churn,
          size,
          inCycle: 0,
          cycleSize: 0
        });
      });
    }
    files.sort((left, right) => compareStrings(left.path, right.path));

    const scores = riskScores(
      files.map((file) => ({
        complexity: file.complexity,
        churn: file.churn,
        size: file.size
      }))
    );
    for (const [index, file] of files.entries()) {
      file.risk = scores[index] ?? 0;
    }
    return files;
  }

  private buildFolders(): Map<string, StoreFolder> {
    const folders = new Map<string, StoreFolder>();
    const ensure = (folderPath: string): StoreFolder => {
      const existing = folders.get(folderPath);
      if (existing) return existing;
      const name =
        folderPath === ""
          ? "(raíz)"
          : folderPath.slice(folderPath.lastIndexOf("/") + 1);
      const folder: StoreFolder = {
        path: folderPath,
        name,
        files: [],
        childFolders: [],
        size: 0,
        maxComplexity: 0,
        risk: 0
      };
      folders.set(folderPath, folder);
      if (folderPath !== "") {
        const parentPath = folderPath.includes("/")
          ? folderPath.slice(0, folderPath.lastIndexOf("/"))
          : "";
        ensure(parentPath).childFolders.push(folderPath);
      }
      return folder;
    };

    ensure("");
    for (const file of this.files) {
      const segments = file.path.split("/");
      const folderPaths = [""];
      let current = "";
      for (let index = 0; index < segments.length - 1; index++) {
        current = current ? `${current}/${segments[index]}` : (segments[index] as string);
        folderPaths.push(current);
      }
      for (const folderPath of folderPaths) {
        const folder = ensure(folderPath);
        folder.files.push(file);
        folder.size += file.size;
        folder.maxComplexity = Math.max(folder.maxComplexity, file.complexity);
        folder.risk = Math.max(folder.risk, file.risk);
      }
    }

    for (const folder of folders.values()) {
      folder.files.sort((left, right) => compareStrings(left.path, right.path));
      folder.childFolders.sort(compareStrings);
    }
    return folders;
  }

  private buildEdges(): StoreEdge[] {
    const byKey = new Map<string, StoreEdge>();
    for (const edge of this.snapshot.lenses?.dependency?.edges ?? []) {
      const from = this.filesById.get(edge.fromId);
      const to = this.filesById.get(edge.toId);
      if (!from || !to) continue;
      const weight = finiteNumber(edge.attributes?.weight) ?? 1;
      const typeOnly = finiteNumber(edge.attributes?.typeOnly) ?? 0;
      const key = `${edge.fromId}\u0000${edge.toId}`;
      const existing = byKey.get(key);
      if (existing) {
        existing.weight += weight;
        existing.typeOnly += typeOnly;
        existing.isCyclic = existing.isCyclic || edge.isCyclic === true;
      } else {
        byKey.set(key, {
          fromId: edge.fromId,
          toId: edge.toId,
          from: from.path,
          to: to.path,
          weight,
          typeOnly,
          isCyclic: edge.isCyclic === true
        });
      }
    }
    return [...byKey.values()].sort(
      (left, right) =>
        compareStrings(left.from, right.from) ||
        compareStrings(left.to, right.to)
    );
  }

  private indexEdges(): void {
    for (const file of this.files) {
      this.outgoing.set(file.id, []);
      this.incoming.set(file.id, []);
    }
    for (const edge of this.edges) {
      this.outgoing.get(edge.fromId)?.push(edge);
      this.incoming.get(edge.toId)?.push(edge);
    }
  }

  private computeCycles(): void {
    const adjacency = new Map<string, string[]>();
    const reverse = new Map<string, string[]>();
    for (const file of this.files) {
      adjacency.set(file.id, []);
      reverse.set(file.id, []);
    }
    for (const edge of this.edges) {
      // Los ciclos son de ejecución: los imports de tipos no cierran un ciclo.
      if (edge.weight <= edge.typeOnly) continue;
      adjacency.get(edge.fromId)?.push(edge.toId);
      reverse.get(edge.toId)?.push(edge.fromId);
    }
    const selfLoops = new Set(
      this.edges
        .filter((edge) => edge.fromId === edge.toId && edge.weight > edge.typeOnly)
        .map((edge) => edge.fromId)
    );
    const components = stronglyConnectedComponents(
      this.files.map((file) => file.id),
      adjacency,
      reverse
    );
    for (const component of components) {
      if (
        component.length <= 1 &&
        !(component.length === 1 && selfLoops.has(component[0] as string))
      ) {
        continue;
      }
      for (const id of component) {
        const file = this.filesById.get(id);
        if (!file) continue;
        file.inCycle = 1;
        file.cycleSize = component.length;
      }
    }
  }

  private indexReport(report: DiffReport): void {
    for (const file of report.files.added) {
      this.reportFiles.set(file.path, {
        status: "added",
        metrics: sortRecord(file.metrics)
      });
    }
    for (const file of report.files.removed) {
      this.reportFiles.set(file.path, {
        status: "removed",
        metrics: sortRecord(file.metrics)
      });
    }
    for (const file of report.files.changed) {
      const existing = this.reportFiles.get(file.path);
      this.reportFiles.set(file.path, {
        ...(existing ?? { status: "changed" as const }),
        status: existing?.status ?? "changed",
        changes: file.changes.map((change) => ({ ...change }))
      });
    }
    for (const hotspot of report.hotspots) {
      this.reportHotspots.set(hotspot.path, { ...hotspot });
      const existing = this.reportFiles.get(hotspot.path);
      this.reportFiles.set(hotspot.path, {
        ...(existing ?? { status: hotspot.change }),
        status: existing?.status ?? hotspot.change,
        hotspot: { ...hotspot }
      });
    }

    const statuses: ViolationStatus[] = [
      "introduced",
      "existing",
      "resolved"
    ];
    for (const status of statuses) {
      for (const violation of report.rules.violations[status]) {
        for (const filePath of violation.files) {
          const entries = this.reportViolations.get(filePath) ?? [];
          entries.push({ status, violation: { ...violation } });
          this.reportViolations.set(filePath, entries);
        }
      }
    }
    for (const entries of this.reportViolations.values()) {
      entries.sort(compareStatusViolations);
    }
  }

  private withSuggestions(input: string, normalized: string): string {
    const wanted = normalized.slice(normalized.lastIndexOf("/") + 1).toLowerCase();
    const suggestions = new Set<string>();
    for (const file of this.files) {
      if (file.name.toLowerCase() === wanted) suggestions.add(file.path);
    }
    for (const folder of this.folders.values()) {
      if (folder.name.toLowerCase() === wanted) suggestions.add(folder.path);
    }
    const suffix = [...suggestions].sort(compareStrings).slice(0, 3);
    const hint =
      suffix.length > 0
        ? ` Quizá quisiste decir: ${suffix.map((value) => `"${value}"`).join(", ")}.`
        : "";
    return `no encuentro "${input}" en el snapshot.${hint}`;
  }
}

export function loadArchitectureStore(
  options: LoadStoreOptions = {}
): ArchitectureStore {
  const root = path.resolve(options.root ?? process.cwd());
  const snapshotPath = path.resolve(
    root,
    options.snapshot ?? ".codarch/snapshot.cc.json"
  );
  if (!fs.existsSync(snapshotPath)) {
    throw new McpDataError(
      `no encuentro el snapshot ${snapshotPath}. Ejecuta "codarch analyze ." o pasa --snapshot.`
    );
  }

  let rawSnapshot: unknown;
  try {
    rawSnapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
  } catch (error) {
    throw new McpDataError(
      `no se pudo leer ${snapshotPath}: ${(error as Error).message}`
    );
  }

  let snapshot: CcJson;
  try {
    snapshot = parseCcJson(rawSnapshot);
  } catch (error) {
    throw new McpDataError(
      `snapshot inválido en ${snapshotPath}: ${(error as Error).message}`
    );
  }

  const explicitReport = options.report !== undefined && options.report !== null;
  const noReport = options.report === null;
  const reportPath = noReport
    ? null
    : explicitReport
      ? path.resolve(root, options.report as string)
      : path.resolve(root, ".codarch/report.json");
  let report: DiffReport | null = null;
  if (reportPath && fs.existsSync(reportPath)) {
    let rawReport: unknown;
    try {
      rawReport = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    } catch (error) {
      throw new McpDataError(
        `no se pudo leer ${reportPath}: ${(error as Error).message}`
      );
    }
    report = parseDiffReport(rawReport, reportPath);
  } else if (explicitReport) {
    throw new McpDataError(`no encuentro el reporte ${reportPath}`);
  }

  return new ArchitectureStore(snapshot, {
    root,
    snapshotPath,
    reportPath: report ? reportPath : null,
    report
  });
}

function parseDiffReport(input: unknown, source: string): DiffReport {
  // El lector es el del paquete de métricas: un reporte de una versión
  // anterior se reconstruye a la actual.
  const report = parseReport(input);
  if (!report) {
    throw new McpDataError(
      `reporte inválido en ${source}: no parece un reporte CodArch (schemaVersion ${REPORT_SCHEMA_VERSION})`
    );
  }
  return report;
}

function relativePath(
  root: CcNode,
  fullPath: string,
  leaf: CcNode,
  stripRootName: boolean
): string {
  if (!stripRootName) return fullPath;
  if (fullPath === root.name) return leaf.name;
  const prefix = `${root.name}/`;
  return fullPath.startsWith(prefix) ? fullPath.slice(prefix.length) : fullPath;
}

function stronglyConnectedComponents(
  nodes: readonly string[],
  adjacency: ReadonlyMap<string, readonly string[]>,
  reverse: ReadonlyMap<string, readonly string[]>
): string[][] {
  const visited = new Set<string>();
  const order: string[] = [];

  for (const start of nodes) {
    if (visited.has(start)) continue;
    visited.add(start);
    const stack: Array<{ node: string; index: number }> = [
      { node: start, index: 0 }
    ];
    while (stack.length > 0) {
      const frame = stack[stack.length - 1] as { node: string; index: number };
      const neighbors = adjacency.get(frame.node) ?? [];
      if (frame.index < neighbors.length) {
        const next = neighbors[frame.index] as string;
        frame.index++;
        if (!visited.has(next)) {
          visited.add(next);
          stack.push({ node: next, index: 0 });
        }
      } else {
        order.push(frame.node);
        stack.pop();
      }
    }
  }

  const assigned = new Set<string>();
  const components: string[][] = [];
  for (let index = order.length - 1; index >= 0; index--) {
    const start = order[index] as string;
    if (assigned.has(start)) continue;
    const component: string[] = [];
    const stack = [start];
    assigned.add(start);
    while (stack.length > 0) {
      const node = stack.pop() as string;
      component.push(node);
      for (const previous of reverse.get(node) ?? []) {
        if (!assigned.has(previous)) {
          assigned.add(previous);
          stack.push(previous);
        }
      }
    }
    components.push(component);
  }
  return components;
}

function metricValue(
  metrics: Record<string, number>,
  key: string | null
): number {
  if (!key) return 0;
  return finiteNumber(metrics[key]) ?? 0;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function isUnder(filePath: string, prefix: string): boolean {
  return prefix === "" || filePath.startsWith(`${prefix}/`);
}

function isUnderOrAt(filePath: string, prefix: string): boolean {
  return prefix === "" || filePath === prefix || isUnder(filePath, prefix);
}

function cloneState(state: ReportFileState): ReportFileState {
  return {
    status: state.status,
    ...(state.metrics ? { metrics: { ...state.metrics } } : {}),
    ...(state.changes
      ? { changes: state.changes.map((change) => ({ ...change })) }
      : {}),
    ...(state.hotspot ? { hotspot: { ...state.hotspot } } : {})
  };
}

function cloneStatusViolation(entry: StatusViolation): StatusViolation {
  return {
    status: entry.status,
    violation: {
      ...entry.violation,
      files: [...entry.violation.files],
      ...(entry.violation.edge
        ? { edge: { ...entry.violation.edge } }
        : {}),
      ...(entry.violation.metric
        ? { metric: { ...entry.violation.metric } }
        : {}),
      ...(entry.violation.cycle
        ? {
            cycle: {
              ...entry.violation.cycle,
              nodes: entry.violation.cycle.nodes.map((node) => ({ ...node }))
            }
          }
        : {})
    }
  };
}

function sortRecord(values: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(values).sort(([left], [right]) => compareStrings(left, right))
  );
}

function compareStatusViolations(
  left: StatusViolation,
  right: StatusViolation
): number {
  return (
    statusOrder(left.status) - statusOrder(right.status) ||
    severityOrder(left.violation.severity) -
      severityOrder(right.violation.severity) ||
    compareStrings(left.violation.rule, right.violation.rule) ||
    compareStrings(left.violation.key, right.violation.key)
  );
}

function statusOrder(status: ViolationStatus): number {
  return status === "introduced" ? 0 : status === "existing" ? 1 : 2;
}

function severityOrder(severity: RuleViolation["severity"]): number {
  return severity === "error" ? 0 : severity === "warn" ? 1 : 2;
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
