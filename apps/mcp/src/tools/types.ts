// Las entradas y salidas de las herramientas del MCP. Un solo sitio para
// saber qué pide cada una y qué devuelve, sin abrir su implementación.

import type { LayerConfig, RuleConfigEntry } from "@codarch/metrics";
import type { RepoAddon } from "@codarch/addons";
import type {
  AffectedFile,
  LintSeverity,
  LintSummary,
  LintSystem,
  LintTotals,
  ScopeHealth
} from "@codarch/lint/browser";
import {
  CcMigrationLanguage,
  CcMigrationLanguageStats,
  CcMigrationStatus,
  type ChainsPayload
} from "@codarch/schema";
import type { Shot } from "@codarch/render/node";
import type { LintRuleCount } from "@codarch/lint/browser";
import type { Suggestion } from "@codarch/metrics";
import { ArchitectureStore, type StatusViolation } from "../store";

/** Un símbolo de un fichero: una función, una clase, un tipo. */

/** El catálogo de perfiles de arquitectura (la consulta de `codarch profiles`). */

/**
 * Comprueba que el snapshot encaja con la historia (ADR 0026).
 *
 * Usa el snapshot que el store ya cargó, no una segunda lectura del disco: es
 * la misma comprobación que `codarch verify` sobre el mismo dato (ADR 0074).
 */

/**
 * La captura del mapa que pide el agente (ADR 0091).
 *
 * El PNG y su resumen salen del mismo modelo que pinta la app, con el área y el
 * color pedidos. La captura ocupa una de las dos ranuras de `.codarch/shots/`,
 * así que la de antes sigue ahí para comparar.
 */

/**
 * La línea del tiempo del repositorio: las fotos guardadas con
 * `codarch analyze --history`.
 */

/** Un mensaje del lint con el fichero al que pertenece. */

/**
 * El lint del proyecto, con sus sistemas, sus reglas activas y sus hallazgos.
 *
 * Lee el artefacto que dejan `codarch lint` y `serve` al lado del snapshot
 * (ADR 0094, ADR 0096). No lanza herramientas: el MCP no mide, cuenta lo
 * medido, igual que hace con el resto del modelo. Sin artefacto no es
 * «limpio»: es «sin medir».
 */

export interface ArchitectureMapInput {
  folder?: string;
  depth?: number;
  limit?: number;
  includeFiles?: boolean;
}

export interface MapNode {
  kind: "folder" | "file";
  path: string;
  name: string;
  id?: string;
  files: number;
  metrics: {
    size: number;
    maxComplexity: number;
    risk: number;
  };
  change?: "added" | "changed";
  changes?: {
    added: number;
    changed: number;
    removed: number;
    hotspots: number;
    violations: number;
  };
  childFolders: number;
  children?: MapNode[];
  truncated?: number;
}

export interface ArchitectureMap {
  projectName: string;
  /** Checksum del código (ADR 0103). */
  checksum: string;
  /** Checksum del historial: cambia sin que cambie el código (ADR 0103). */
  historyChecksum: string;
  commitHash: string;
  apiVersion: string;
  scope: string;
  sizeMetric: string | null;
  aggregation: {
    size: string;
    maxComplexity: string;
    risk: string;
  };
  stats: ReturnType<ArchitectureStore["summary"]>;
  /** Lo que hay dentro de los ficheros: símbolos y la función más compleja. */
  symbols?: {
    available: boolean;
    total: number;
    functions: number;
    classes: number;
    interfaces: number;
    types: number;
    enums: number;
    /** Variables del módulo: constantes y declaraciones con valor. */
    variables: number;
    mostComplex: Array<{
      path: string;
      name: string;
      complexity: number;
      line: number;
    }>;
  };
  root: MapNode;
}

export type HotspotScope = "snapshot" | "diff";

export interface FindHotspotsInput {
  scope?: HotspotScope;
  metric?: string;
  folder?: string;
  limit?: number;
  minValue?: number;
}

export interface HotspotEntry {
  rank: number;
  id?: string;
  path: string;
  value: number;
  risk?: number;
  base?: number;
  head?: number;
  delta?: number;
  change?: "added" | "changed";
}

export interface FindHotspotsResult {
  available: boolean;
  scope: HotspotScope;
  metric: string | null;
  sizeMetric?: string | null;
  folder: string;
  total: number;
  hotspots: HotspotEntry[];
  reason?: string;
}

export type ImpactDirection = "dependents" | "dependencies" | "both";

export interface CheckChangeImpactInput {
  path: string;
  direction?: ImpactDirection;
  depth?: number;
  limit?: number;
}

export interface ImpactNode {
  path: string;
  id: string;
  depth: number;
  directions: Array<"dependents" | "dependencies">;
  risk: number;
  change?: "added" | "changed" | "removed";
}

export interface CheckChangeImpactResult {
  start: {
    kind: "file" | "folder";
    path: string;
    id?: string;
    files: number;
  };
  direction: ImpactDirection;
  depth: number;
  summary: {
    direct: number;
    transitive: number;
    dependents: number;
    dependencies: number;
    truncated: number;
  };
  cycle:
    | { inCycle: boolean; size: number }
    | { filesInCycle: number; maxSize: number };
  impacted: ImpactNode[];
  diff: {
    available: boolean;
    counts?: ReturnType<ArchitectureStore["diffCounts"]>;
    changes?: Array<{
      path: string;
      status: "added" | "changed" | "removed";
      hotspot?: boolean;
    }>;
    truncated?: number;
  };
  violations: StatusViolation[];
  reasons: string[];
}

export type ViolationStatusFilter =
  | "all"
  | "introduced"
  | "existing"
  | "resolved";

export interface MigrationPlanInput {
  /** Carpeta desde la que empezar; vacío = raíz. */
  folder?: string;
  /** Máximo de ficheros listados (por defecto 15). */
  limit?: number;
}

export interface MigrationFileEntry {
  path: string;
  id: string;
  language: CcMigrationLanguage;
  status: CcMigrationStatus;
  /** Deuda de migración del fichero. */
  debt: number;
  rloc: number;
  /** Aristas FFI que tocan el fichero. */
  crossings: number;
}

export interface MigrationChangeEntry {
  path: string;
  id: string;
  language: CcMigrationLanguage;
  status: CcMigrationStatus;
  base: number | null;
  head: number | null;
  delta: number | null;
}

export interface MigrationPlanResult {
  available: boolean;
  folder: string;
  summary: {
    files: number;
    languages: Partial<Record<CcMigrationLanguage, CcMigrationLanguageStats>>;
    status: Record<CcMigrationStatus, number>;
    debt: number;
    crossings: number;
    bridgeFiles: number;
  } | null;
  /** Ficheros con más deuda, de más a menos. */
  topDebt: MigrationFileEntry[];
  /** Cómo ha cambiado la deuda, si hay reporte. */
  changes:
    | { available: false; reason: string }
    | {
        available: true;
        increased: MigrationChangeEntry[];
        decreased: MigrationChangeEntry[];
        debt: { base: number; head: number; delta: number };
      };
  reason?: string;
}

export interface DuplicationReportInput {
  /** Carpeta o fichero del que enseñar los pares; vacío = todo el proyecto. */
  path?: string;
  /** Máximo de pares y de cambios listados (por defecto 20). */
  limit?: number;
}

/** Un par de la lente, tal como lo lee un agente. */
export interface DuplicationPairView {
  from: string;
  to: string;
  lines: number;
  similarity: number;
  status: "copy" | "diverging";
}

/** Un par que cambia en el reporte. */
export interface DuplicationChangeView {
  from: string;
  to: string;
  kind: "added" | "removed" | "diverging";
  lines: number;
  similarity: number;
  previousSimilarity: number | null;
  linesDelta: number | null;
}

export interface DuplicationReportResult {
  /** `false` si el snapshot no trae la lente: sin medir, no limpio. */
  available: boolean;
  /** La carpeta o el fichero pedido; vacío es todo el proyecto. */
  scope: string;
  summary: {
    duplicatedLines: number;
    repeatedLines: number;
    /** 0..100 sobre el `rloc` del ámbito. */
    ratio: number;
    files: number;
    /** Ficheros del ámbito con alguna línea duplicada. */
    affected: number;
  } | null;
  /** Los pares actuales dentro del ámbito, de más a menos. */
  pairs: DuplicationPairView[];
  totalPairs: number;
  changes:
    | { available: false; reason: string }
    | {
        available: true;
        lines: { base: number; head: number; delta: number };
        counts: { added: number; removed: number; diverging: number };
        added: DuplicationChangeView[];
        removed: DuplicationChangeView[];
        diverging: DuplicationChangeView[];
      };
  reason?: string;
}

export interface ListViolationsInput {
  status?: ViolationStatusFilter;
  severity?: "all" | "info" | "warn" | "error";
  type?: "all" | "forbidden" | "threshold" | "cycles";
  rule?: string;
  limit?: number;
}

export interface ListViolationsResult {
  available: boolean;
  configured: boolean;
  /** Perfil del catálogo aplicado, si lo hubo. */
  profile: string | null;
  counts: {
    introduced: number;
    existing: number;
    resolved: number;
    introducedErrors: number;
    introducedWarnings: number;
  };
  total: number;
  violations: StatusViolation[];
  reason?: string;
}

export interface GetHistoryInput {
  /**
   * Foto concreta a cargar: un trozo de su fecha o de su checksum.
   *
   * Sin esto, la herramienta devuelve solo la línea del tiempo.
   */
  snapshot?: string;
  limit?: number;
}

export interface GetHistoryEntry {
  date: string;
  checksum: string;
  commit: string;
  files: number;
  rloc: number;
  debt: number;
  commits: number;
  authors: number;
  hottest: Array<{ path: string; commits: number; authors: number }>;
}

export interface GetHistoryResult {
  available: boolean;
  root: string;
  entries: GetHistoryEntry[];
  /** La foto pedida, si la hubo. */
  snapshot?: unknown;
  reason?: string;
}

export interface VerifyHistoryResult {
  available: boolean;
  /** `true` si cada símbolo del snapshot es la última versión de su cadena. */
  ok: boolean;
  checked: number;
  /** La cabeza del proyecto: los símbolos vivos del snapshot. */
  projectHead: string;
  mismatches: Array<{ path: string; name: string; reason: string }>;
  reason?: string;
}

export interface ExplainModuleInput {
  path: string;
  limit?: number;
}

export interface EdgeView {
  path: string;
  weight: number;
  typeOnly: number;
  isCyclic: boolean;
}

export interface SymbolView {
  name: string;
  kind: "function" | "class" | "interface" | "type" | "enum" | "variable";
  line: number;
  complexity?: number;
  lines?: number;
}

export interface ExplainModuleResult {
  kind: "file" | "folder";
  path: string;
  name: string;
  projectName: string;
  /** Checksum del código (ADR 0103). */
  checksum: string;
  /** Checksum del historial: cambia sin que cambie el código (ADR 0103). */
  historyChecksum: string;
  id?: string;
  files: number;
  sizeMetric: string | null;
  metrics: Record<string, number>;
  risk: number;
  complexity: number;
  riskRank?: number;
  cycle?:
    | { inCycle: boolean; size: number }
    | { filesInCycle: number; maxSize: number };
  dependencies?: {
    total: number;
    edges: EdgeView[];
    truncated: number;
  };
  dependents?: {
    total: number;
    edges: EdgeView[];
    truncated: number;
  };
  childFolders?: string[];
  topFiles?: Array<{ path: string; risk: number; size: number }>;
  /** Los símbolos del fichero, de la función más compleja a la más simple. */
  symbols?: SymbolView[];
  diff:
    | { available: false; reason: string }
    | {
        available: true;
        state:
          | {
              status: "added" | "changed" | "removed";
              hotspot?: boolean;
              changes?: number;
            }
          | null;
        counts?: ReturnType<ArchitectureStore["diffCounts"]>;
      };
  /** Totales de lint del ámbito; `null` si no se ha medido. */
  lint: LintTotals | null;
  /** Salud del mismo ámbito. `null` si no hay artefacto. */
  scopeHealth: ScopeHealth | null;
  violations: StatusViolation[];
}

export interface SymbolChainInput {
  /** El símbolo: su nombre o parte de él. */
  symbol?: string;
  limit?: number;
}

export interface SymbolChainResult {
  available: boolean;
  reason?: string;
  chains: ChainsPayload["chains"];
  heat: ChainsPayload["heat"];
}

export interface LintFinding {
  path: string;
  rule: string;
  severity: LintSeverity;
  line?: number;
  column?: number;
  message: string;
}

export interface LintReportInput {
  /** Carpeta o fichero del que enseñar hallazgos; vacío = todo el proyecto. */
  path?: string;
  /** Una regla concreta, tal y como la nombra su herramienta. */
  rule?: string;
  severity?: "all" | LintSeverity;
  limit?: number;
}

export interface LintReportResult {
  /** `false` si no hay artefacto: el lint no se ha medido en este repo. */
  available: boolean;
  /** El artefacto leído, relativo al proyecto; `null` si no hay. */
  file: string | null;
  /** Las herramientas que midieron (`meta.tools`), ordenadas. */
  tools: string[];
  /** Los sistemas que el proyecto declara, con su config, sus reglas y su nota. */
  systems: LintSystem[];
  summary: LintSummary;
  /**
   * La config que ya está en `meta`, derivada. `null` si no hay artefacto.
   * No es un campo nuevo del fichero.
   */
  config: { tools: string[]; systems: LintSystem[] } | null;
  /** Salud del ámbito pedido. `null` si no hay artefacto: no es un cero. */
  health: ScopeHealth | null;
  /** Ficheros con hallazgos en ese ámbito, con sus cuentas. */
  affectedFiles: AffectedFile[];
  /** La carpeta o el fichero pedido; vacío es todo el proyecto. */
  scope: string;
  /** Ficheros con hallazgos dentro del ámbito y los filtros. */
  files: number;
  total: number;
  /** Las reglas con hallazgos en el ámbito, de más a menos. */
  rules: LintRuleCount[];
  findings: LintFinding[];
  reason?: string;
}

export interface ProjectConfigResult {
  available: boolean;
  /** El archivo leído, sin la ruta: `.codarch.yml` normalmente. */
  file: string | null;
  /** El perfil del catálogo que el equipo eligió, si lo hay. */
  profile: string | null;
  layers: LayerConfig[];
  /** Las reglas efectivas; su `source` dice de dónde sale cada una. */
  rules: RuleConfigEntry[];
  /** Patrones que el repo excluye del análisis (ADR 0038). */
  ignore: string[];
  /** Los addons declarados, con sus perfiles y sus vistas guardadas. */
  addons: RepoAddon[];
  /** Los addons que no se pudieron cargar, con su motivo. */
  errors: string[];
  reason?: string;
}

export interface SuggestArchitectureResult {
  available: boolean;
  /** La versión de configuración que espera el fragmento propuesto. */
  configVersion: number;
  detected: Suggestion["detected"];
  layers: Suggestion["layers"];
  rules: Suggestion["rules"];
  /** `layers` = deducido del grafo; `profile` = copiado del catálogo. */
  proposal: Suggestion["proposal"];
  profile: Suggestion["profile"];
  /** Carpetas con código que no encajan en ninguna capa. */
  ungrouped: Suggestion["ungrouped"];
  notes: Suggestion["notes"];
  /** Qué perfiles del catálogo encajan, de más a menos. */
  fits: Suggestion["fits"];
}

export interface ProfileRule {
  name: string;
  from: string;
  to: string;
  severity: string;
  message: string | null;
}

export interface ProfileEntry {
  id: string;
  title: string;
  description: string;
  /** Para qué proyecto está pensado. */
  when: string;
  layers: Array<{ name: string; patterns: string[] }>;
  rules: ProfileRule[];
}

export interface ListProfilesResult {
  /** La versión de configuración que hay que declarar para usar un perfil. */
  configVersion: number;
  profiles: ProfileEntry[];
}

export interface MapScreenshotArgs {
  area?: string;
  color?: string;
  width?: number;
  height?: number;
}

export interface MapScreenshot extends Shot {
  /** El PNG, para que el cliente lo pinte sin abrir el fichero. */
  png: Buffer;
}

export type { LintRuleCount };
