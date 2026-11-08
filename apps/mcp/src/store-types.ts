import type {
  DiffReport,
  Hotspot,
  MetricChange,
  RiskBreakdown,
  RuleViolation
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
  /**
   * El objeto que devolvió `riskBreakdown` para este fichero.
   * `null` si el snapshot no trae métricas. No se escribe en `cc.json`.
   */
  riskBreakdown: RiskBreakdown | null;
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

/** Qué reporte describen los cambios: el del working tree o el de un PR. */
export type ReportSource = "head" | "report" | null;

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
  headReportPath?: string | null;
  /**
   * Lo tocado desde el último commit (ADR 0072).
   *
   * Manda sobre `report.json`: es el cambio que la app enseña en **Cambios**, y
   * el MCP tiene que contestar lo mismo que la interfaz (ADR 0074).
   */
  headReport?: DiffReport | null;
}

export interface LoadStoreOptions {
  root?: string;
  snapshot?: string;
  /** `null` desactiva el reporte; si falta, se busca `.codarch/report.json`. */
  report?: string | null;
  /** `null` desactiva el reporte HEAD; si falta, se busca `.codarch/head-report.json`. */
  headReport?: string | null;
}

export interface StoreSummary {
  projectName: string;
  /** Checksum del código (ADR 0103). */
  checksum: string;
  /** Checksum del historial: el calor puede cambiar sin tocar el código (ADR 0103). */
  historyChecksum: string;
  commitHash: string;
  apiVersion: string;
  files: number;
  folders: number;
  edges: number;
  sizeMetric: string | null;
  metrics: string[];
  reportLoaded: boolean;
  /** De dónde sale el reporte de cambios que están usando las consultas. */
  reportSource: ReportSource;
}
