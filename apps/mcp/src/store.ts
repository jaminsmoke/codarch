import path from "node:path";
import {
  CODARCH_DIR,
  SNAPSHOT_FILE,
  type CcJson
} from "@codarch/schema";
import { readStoredReport } from "@codarch/parsers";
import type { DiffReport, Hotspot } from "@codarch/metrics";
import { isUnder } from "./store-shared";
import {
  buildFiles,
  describeMetrics,
  rankByRisk
} from "./store-files";
import { buildFolders } from "./store-folders";
import { buildEdges, indexEdges } from "./store-edges";
import { markCycles } from "./store-cycles";
import { normalizePath, resolveTarget } from "./store-paths";
import {
  allViolations,
  countDiffs,
  fileState,
  indexReport,
  listHotspots,
  violationsForPaths,
  type ReportIndex
} from "./store-report";
import { explicitReport, loadSnapshot } from "./store-load";
import {
  McpDataError,
  type DiffCounts,
  type LoadStoreOptions,
  type ReportFileState,
  type ReportSource,
  type StatusViolation,
  type StoreEdge,
  type StoreFile,
  type StoreFolder,
  type StoreOptions,
  type StoreSummary
} from "./store-types";

export * from "./store-types";

/**
 * Índice de solo lectura sobre un snapshot `cc.json` y, opcionalmente, un
 * `report.json`. No analiza código ni evalúa reglas: consume lo que ya existe.
 */
export class ArchitectureStore {
  readonly root: string;
  readonly snapshotPath: string | null;
  readonly reportPath: string | null;
  readonly headReportPath: string | null;
  readonly snapshot: CcJson;
  /** El reporte que describen las consultas de cambio: el HEAD si lo hay. */
  readonly report: DiffReport | null;
  readonly headReport: DiffReport | null;
  readonly reportSource: ReportSource;
  readonly rootName: string | null;
  readonly sizeMetric: string | null;
  readonly files: StoreFile[];
  readonly folders: Map<string, StoreFolder>;
  readonly edges: StoreEdge[];
  readonly filesById = new Map<string, StoreFile>();
  readonly filesByPath = new Map<string, StoreFile>();
  readonly outgoing: Map<string, StoreEdge[]>;
  readonly incoming: Map<string, StoreEdge[]>;
  readonly riskRank: Map<string, number>;

  private readonly complexityKeys: ReturnType<typeof describeMetrics>;
  private readonly reportIndex: ReportIndex | null;

  constructor(cc: CcJson, options: StoreOptions = {}) {
    this.root = path.resolve(options.root ?? process.cwd());
    this.snapshotPath = options.snapshotPath
      ? path.resolve(options.snapshotPath)
      : null;
    this.reportPath = options.reportPath ? path.resolve(options.reportPath) : null;
    this.headReportPath = options.headReportPath
      ? path.resolve(options.headReportPath)
      : null;
    this.snapshot = cc;
    // Lo tocado desde el último commit manda: es lo que la app enseña (ADR 0072).
    this.headReport = options.headReport ?? null;
    this.report = options.headReport ?? options.report ?? null;
    this.reportSource = options.headReport
      ? "head"
      : options.report
        ? "report"
        : null;
    this.rootName = cc.files.length === 1 ? (cc.files[0]?.name ?? null) : null;

    this.complexityKeys = describeMetrics(cc);
    this.sizeMetric = this.complexityKeys.sizeMetric;

    this.files = buildFiles(cc, this.complexityKeys);
    for (const file of this.files) {
      this.filesById.set(file.id, file);
      if (this.filesByPath.has(file.path)) {
        throw new McpDataError(
          `el snapshot contiene dos ficheros con la ruta "${file.path}"`
        );
      }
      this.filesByPath.set(file.path, file);
    }

    this.folders = buildFolders(this.files);
    this.edges = buildEdges(cc, this.filesById);
    const indexes = indexEdges(this.files, this.edges);
    this.outgoing = indexes.outgoing;
    this.incoming = indexes.incoming;
    markCycles(this.files, this.edges, this.filesById);
    this.riskRank = rankByRisk(this.files);

    this.reportIndex = this.report ? indexReport(this.report) : null;
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
      metrics: this.complexityKeys.coverage,
      reportLoaded: this.report !== null,
      reportSource: this.reportSource
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
    return normalizePath(input);
  }

  resolveTarget(input: string): StoreFile | StoreFolder {
    return resolveTarget(
      {
        files: this.files,
        filesById: this.filesById,
        filesByPath: this.filesByPath,
        folders: this.folders,
        rootName: this.rootName
      },
      input
    );
  }

  diffForPath(pathValue: string): ReportFileState | null {
    return fileState(this.reportIndex, pathValue);
  }

  diffCounts(prefix: string): DiffCounts {
    return countDiffs(this.reportIndex, prefix);
  }

  hotspots(prefix: string): Hotspot[] {
    return listHotspots(this.reportIndex, prefix);
  }

  violationsForPaths(
    paths: readonly string[],
    limit = 20
  ): StatusViolation[] {
    return violationsForPaths(this.reportIndex, paths, limit);
  }

  allViolations(): StatusViolation[] {
    return allViolations(this.reportIndex);
  }
}

export function loadArchitectureStore(
  options: LoadStoreOptions = {}
): ArchitectureStore {
  const root = path.resolve(options.root ?? process.cwd());
  const snapshotPath = path.resolve(
    root,
    options.snapshot ?? `${CODARCH_DIR}/${SNAPSHOT_FILE}`
  );
  const snapshot = loadSnapshot(snapshotPath);
  // Los dos reportes de `.codarch/`, con sus nombres y su precedencia en un solo
  // módulo (ADR 0101). Una ruta explícita manda sobre el que haya guardado.
  const report =
    options.report === undefined
      ? readStoredReport(root, "artifact")
      : explicitReport(root, options.report, "reporte");
  const headReport =
    options.headReport === undefined
      ? readStoredReport(root, "worktree")
      : explicitReport(root, options.headReport, "reporte HEAD");

  return new ArchitectureStore(snapshot, {
    root,
    snapshotPath,
    reportPath: report ? report.path : null,
    report: report?.report ?? null,
    headReportPath: headReport ? headReport.path : null,
    headReport: headReport?.report ?? null
  });
}
