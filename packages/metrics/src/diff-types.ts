import { REPORT_SCHEMA_VERSION } from "@codarch/versions";
import type {
  CcJson,
  CcMigrationLanguage,
  CcMigrationLanguageStats,
  CcMigrationStatus
} from "@codarch/schema";
import type { RuleConfig } from "./config";
import type { RuleReport } from "./rules";
import type { DiffSymbolReport, FileSource } from "./symbol-diff";

/**
 * El contrato del reporte: lo que se compara y lo que sale.
 *
 * Vive aparte de `diff.ts` porque lo leen los dos lados —el que compara y el
 * que reconstruye un reporte viejo— y ninguno tiene por qué arrastrar el otro.
 */

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
  /**
   * Líneas de código que han cambiado.
   *
   * Los recuentos de ficheros no dicen cuánto ha cambiado el código: añadir
   * tres funciones a un fichero de mil líneas es un cambio mayor que tocar
   * veinte ficheros de cinco líneas.
   */
  addedRloc: number;
  removedRloc: number;
  /** Delta de rloc de los ficheros que cambiaron (con signo). */
  changedRloc: number;
}

export interface DiffReport {
  schemaVersion: typeof REPORT_SCHEMA_VERSION;
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
  /**
   * Cómo ha cambiado la migración: es el motivo de ser del producto.
   *
   * Es `null` cuando no se midió (un reporte reconstruido desde una versión
   * anterior, o snapshots sin la lente de migración).
   */
  migration: MigrationReport | null;
  /**
   * Qué pasó dentro de los ficheros: los símbolos que se añadieron, se quitaron
   * o cambiaron.
   *
   * Es `null` cuando no se midió (un reporte reconstruido desde una versión
   * anterior, o snapshots sin la lente de símbolos).
   */
  symbols: DiffSymbolReport | null;
}

export interface DiffOptions {
  /** Número máximo de hotspots; por defecto 10. */
  top?: number;
  /** Métrica usada para ordenar hotspots; por defecto `maxComplexity`, luego `rloc`. */
  hotspotMetric?: string;
  /** Reglas de arquitectura; si falta, el reporte no evalúa violaciones. */
  rules?: RuleConfig;
  /**
   * Las fuentes de los dos lados.
   *
   * Sin esto el reporte sabe que un símbolo cambió y cuánto mide, pero no
   * cuántas líneas entran y salen: eso hay que leerlo del texto, y desde dos
   * `cc.json` no hay texto que leer ✓.
   */
  source?: FileSource;
}

/** Una arista del snapshot, ya agregada por par de nodos. */
export interface IndexedEdge {
  fromId: string;
  toId: string;
  weight: number;
  typeOnly: number;
  isCyclic: boolean;
}

/**
 * Un cc.json listo para comparar: rutas por id, nodos en orden y aristas por
 * par. Se indexa una vez por lado y todo lo demás lee de aquí.
 */
export interface IndexedSnapshot {
  cc: CcJson;
  paths: Map<string, string>;
  nodes: string[];
  metrics: Record<string, Record<string, number>>;
  edges: Map<string, IndexedEdge>;
}
