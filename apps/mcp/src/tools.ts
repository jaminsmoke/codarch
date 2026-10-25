import type {
  CcMigrationLanguage,
  CcMigrationLanguageStats,
  CcMigrationStatus
} from "@codarch/schema";
import {
  chainsPayload,
  historyFileName,
  historyLocation,
  loadChains,
  parseHistoryIndex,
  readHistoryIndex,
  verifyChains,
  type ChainsPayload,
  type HistoryIndex
} from "@codarch/schema";
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { symbolRanking, symbolsOf } from "@codarch/schema";
import {
  CONFIG_VERSION,
  ConfigError,
  DOMAIN_PROFILES,
  loadIgnoreConfig,
  loadRuleConfig,
  suggestLayers,
  type LayerConfig,
  type RuleConfigEntry,
  type Suggestion
} from "@codarch/metrics";
import { ruleConfigAddon, type RepoAddon } from "@codarch/addons";
import { loadAddons, repoAddons } from "@codarch/addons/node";
import {
  ArchitectureStore,
  McpDataError,
  type StatusViolation,
  type StoreFile,
  type StoreFolder
} from "./store";

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
  checksum: string;
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

/** Un símbolo de un fichero: una función, una clase, un tipo. */
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
  checksum: string;
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
  violations: StatusViolation[];
}

export function getArchitectureMap(
  store: ArchitectureStore,
  input: ArchitectureMapInput = {}
): ArchitectureMap {
  const folderPath = store.normalizePath(input.folder ?? "");
  const folder = resolveFolder(store, folderPath, input.folder ?? "");
  const depth = clampInteger(input.depth, 2, 1, 6);
  const limit = clampInteger(input.limit, 20, 1, 100);
  const includeFiles = input.includeFiles ?? true;

  return {
    projectName: store.snapshot.meta.projectName ?? "",
    checksum: store.snapshot.meta.checksum ?? "",
    commitHash: store.snapshot.meta.commitHash ?? "",
    apiVersion: store.snapshot.meta.apiVersion,
    scope: folder.path,
    sizeMetric: store.sizeMetric,
    aggregation: {
      size: "suma del tamaño de los ficheros",
      maxComplexity: "máximo maxComplexity de los ficheros",
      risk: "máximo riesgo compuesto de los ficheros"
    },
    stats: store.summary(),
    symbols: {
      available: store.snapshot.lenses?.symbols !== undefined,
      total: store.snapshot.lenses?.symbols?.summary.symbols ?? 0,
      functions: store.snapshot.lenses?.symbols?.summary.functions ?? 0,
      classes: store.snapshot.lenses?.symbols?.summary.classes ?? 0,
      interfaces: store.snapshot.lenses?.symbols?.summary.interfaces ?? 0,
      types: store.snapshot.lenses?.symbols?.summary.types ?? 0,
      enums: store.snapshot.lenses?.symbols?.summary.enums ?? 0,
      variables: store.snapshot.lenses?.symbols?.summary.variables ?? 0,
      mostComplex: symbolRanking(store.snapshot, 5).map((symbol) => ({
        // Las rutas del store no llevan el nombre de la raíz.
        path: store.files.find((file) => file.id === symbol.id)?.path ?? symbol.path,
        name: symbol.name,
        complexity: symbol.complexity,
        line: symbol.line
      }))
    },
    root: mapFolder(store, folder, 0, depth, limit, includeFiles)
  };
}

/**
 * Plan de migración: cuánta deuda queda, dónde está y cómo ha cambiado.
 *
 * La migración es el motivo de ser del producto (ADR 0016): el agente tiene que
 * poder preguntar por ella con los mismos datos que ve el mapa.
 */
export function getMigrationPlan(
  store: ArchitectureStore,
  input: MigrationPlanInput = {}
): MigrationPlanResult {
  const limit = clampInteger(input.limit, 15, 1, 100);
  const folder = resolveFolder(
    store,
    store.normalizePath(input.folder ?? ""),
    input.folder ?? ""
  ).path;

  const lens = store.snapshot.lenses?.migration;
  if (!lens) {
    return {
      available: false,
      folder,
      summary: null,
      topDebt: [],
      changes: {
        available: false,
        reason:
          "el snapshot no tiene la lente de migración; analiza con una versión que la incluya"
      }
    };
  }

  const paths = new Map<string, string>();
  for (const file of store.files) paths.set(file.id, file.path);

  const topDebt: MigrationFileEntry[] = [];
  for (const [id, node] of Object.entries(lens.nodes)) {
    // La deuda solo existe en lo que falta por migrar: lo ya migrado (rust,
    // nativo) no tiene nada que migrar.
    if (!node.debt) continue;
    const path = paths.get(id);
    if (!path) continue;
    if (folder !== "" && !path.startsWith(`${folder}/`)) continue;
    topDebt.push({
      path,
      id,
      language: node.language,
      status: node.status,
      debt: node.debt ?? 0,
      rloc: node.rloc,
      crossings: node.crossings
    });
  }
  topDebt.sort(
    (left, right) => right.debt - left.debt || compareStrings(left.path, right.path)
  );

  const report = store.report;
  if (!report) {
    return {
      available: true,
      folder,
      summary: {
        files: lens.summary.files,
        languages: lens.summary.languages,
        status: lens.summary.status,
        debt: lens.summary.migrationDebt,
        crossings: lens.summary.ffiCrossings,
        bridgeFiles: lens.summary.bridgeFiles
      },
      topDebt: topDebt.slice(0, limit),
      changes: {
        available: false,
        reason:
          "no hay report.json cargado; ejecuta codarch diff o pasa --report"
      }
    };
  }

  const toChange = (entry: {
    id: string;
    path: string;
    language: CcMigrationLanguage;
    status: CcMigrationStatus;
    base: number | null;
    head: number | null;
    delta: number | null;
  }): MigrationChangeEntry => ({ ...entry });

  const migration = report.migration;

  return {
    available: true,
    folder,
    summary: {
      files: lens.summary.files,
      languages: lens.summary.languages,
      status: lens.summary.status,
      debt: lens.summary.migrationDebt,
      crossings: lens.summary.ffiCrossings,
      bridgeFiles: lens.summary.bridgeFiles
    },
    topDebt: topDebt.slice(0, limit),
    changes: migration
      ? {
          available: true,
          increased: migration.files.increased.map(toChange),
          decreased: migration.files.decreased.map(toChange),
          debt: migration.debt
        }
      : {
          available: false,
          reason:
            "el reporte no tiene sección de migración; se generó con una versión anterior"
        }
  };
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

/**
 * La línea del tiempo del repositorio: las fotos guardadas con
 * `codarch analyze --history`.
 */
export function getHistory(
  store: ArchitectureStore,
  input: GetHistoryInput = {}
): GetHistoryResult {
  const limit = clampInteger(input.limit, 10, 1, 100);
  const location = historyLocation(store.root);

  let index: HistoryIndex;
  try {
    const raw = readFileSync(location.indexFile, "utf8");
    index = parseHistoryIndex(JSON.parse(raw) as unknown);
  } catch {
    return {
      available: false,
      root: store.root,
      entries: [],
      reason:
        "no hay historial en este repositorio; se guarda con codarch analyze --history"
    };
  }

  const entries = index.entries.slice(-limit).reverse();

  if (!input.snapshot) {
    return { available: true, root: store.root, entries };
  }

  const needle = input.snapshot.trim().toLowerCase();
  const entry = index.entries.find(
    (item) =>
      item.date.toLowerCase().includes(needle) ||
      item.checksum.toLowerCase().startsWith(needle)
  );
  if (!entry) {
    return {
      available: true,
      root: store.root,
      entries,
      reason: `no hay ninguna foto con "${input.snapshot}"`
    };
  }

  const name = historyFileName(entry);
  try {
    const raw = readFileSync(join(location.directory, name), "utf8");
    return {
      available: true,
      root: store.root,
      entries,
      snapshot: JSON.parse(raw) as unknown
    };
  } catch (cause) {
    return {
      available: true,
      root: store.root,
      entries,
      reason: `no se pudo leer la foto: ${(cause as Error).message}`
    };
  }
}

/**
 * La configuración del repo, como la lee el CLI (la guía, §4.9).
 *
 * Responde a "¿qué perfiles, reglas y addons rigen este proyecto?" sin abrir
 * ficheros a mano. Es la otra mitad del mapa: el snapshot dice cómo es el
 * código y la configuración dice qué se espera de él.
 */
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

export function getProjectConfig(store: ArchitectureStore): ProjectConfigResult {
  const loaded = loadAddons(store.root);
  const summary = repoAddons(store.root);
  const errors = [...summary.errors];
  const file = configFile(store.root);

  if (!file) {
    return {
      available: false,
      file: null,
      profile: null,
      layers: [],
      rules: [],
      ignore: [],
      addons: [],
      errors,
      reason:
        "no hay .codarch.yml en el repo: no hay perfiles, reglas, alcance ni addons que enseñar"
    };
  }

  try {
    // Igual que `codarch diff`: el archivo dice qué addons usa y sus reglas
    // entran con `source: "addon:<nombre>"` (ADR 0029).
    const config = loadRuleConfig(file, loaded.addons.map(ruleConfigAddon));
    return {
      available: true,
      file: basename(file),
      profile: config.profile,
      layers: config.layers,
      rules: config.rules,
      ignore: config.ignore,
      addons: summary.addons,
      errors
    };
  } catch (error) {
    if (!(error instanceof ConfigError)) throw error;
    let ignore: string[] = [];
    try {
      ignore = loadIgnoreConfig(file);
    } catch {
      // El alcance tampoco se pudo leer; se devuelve vacío con el motivo.
    }
    return {
      available: true,
      file: basename(file),
      profile: null,
      layers: [],
      rules: [],
      ignore,
      addons: summary.addons,
      errors,
      reason: error.message
    };
  }
}

/** El `.codarch.yml` del repo, si lo hay. */
function configFile(root: string): string | null {
  for (const name of [".codarch.yml", ".codarch.yaml"]) {
    const candidate = join(root, name);
    try {
      readFileSync(candidate);
      return candidate;
    } catch {
      // Se prueba el siguiente.
    }
  }
  return null;
}

/**
 * La vida de un símbolo: su cadena a lo largo del historial.
 *
 * Responde a "¿esta función es la misma que la de hace un año?" y a
 * "¿cuántas veces se ha reescrito esto?" ✓.
 */
export function getSymbolChain(
  store: ArchitectureStore,
  input: SymbolChainInput = {}
): SymbolChainResult {
  // Sin símbolo también hay respuesta: el calor del repo. Si hay símbolo, el
  // payload busca solo cadenas de símbolo, por su nombre actual o por uno
  // anterior, y respeta el límite (ADR 0039).
  const symbol = input.symbol?.trim() || null;
  const limit = clampInteger(input.limit, 10, 1, 50);
  const payload = chainsPayload(store.root, symbol, limit);
  if (!payload.available) {
    return {
      available: false,
      reason:
        "no hay historial en este repositorio; se guarda con codarch analyze --history",
      chains: [],
      heat: []
    };
  }

  return {
    available: true,
    reason: undefined,
    chains: payload.chains,
    heat: payload.heat
  };
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

export function findHotspots(
  store: ArchitectureStore,
  input: FindHotspotsInput = {}
): FindHotspotsResult {  const scope: HotspotScope = input.scope ?? "snapshot";
  const limit = clampInteger(input.limit, 10, 1, 100);
  const folder = resolveFolder(
    store,
    store.normalizePath(input.folder ?? ""),
    input.folder ?? ""
  ).path;

  if (scope === "diff") {
    if (!store.report) {
      return {
        available: false,
        scope,
        metric: null,
        folder,
        total: 0,
        hotspots: [],
        reason:
          "no hay report.json cargado; ejecuta codarch diff o pasa --report"
      };
    }
    const actual = store.report.hotspotMetric;
    if (!actual) {
      return {
        available: true,
        scope,
        metric: null,
        folder,
        total: 0,
        hotspots: [],
        reason: "el reporte no tiene métrica de hotspots"
      };
    }
    if (input.metric && input.metric !== actual) {
      throw new McpDataError(
        `el reporte usa "${actual}" para hotspots; no "${input.metric}"`
      );
    }
    const all = store
      .hotspots(folder)
      .map((hotspot, index) => ({
        rank: index + 1,
        id: hotspot.id,
        path: hotspot.path,
        value: hotspot.delta,
        base: hotspot.base,
        head: hotspot.head,
        delta: hotspot.delta,
        change: hotspot.change
      }))
      .sort(
        (left, right) =>
          right.delta - left.delta || compareStrings(left.path, right.path)
      )
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    return {
      available: true,
      scope,
      metric: actual,
      folder,
      total: all.length,
      hotspots: all.slice(0, limit)
    };
  }

  const metric = input.metric ?? "risk";
  const metricNames = store.summary().metrics;
  if (metric !== "risk" && !metricNames.includes(metric)) {
    throw new McpDataError(
      `la métrica "${metric}" no existe. Disponibles: ${metricNames
        .slice(0, 12)
        .join(", ")}`
    );
  }

  const minValue = input.minValue ?? 0;
  const ranked = store
    .filesUnder(folder)
    .map((file) => ({
      file,
      value: metric === "risk" ? file.risk : (file.metrics[metric] ?? 0)
    }))
    .filter((entry) => entry.value > minValue)
    .sort(
      (left, right) =>
        right.value - left.value ||
        compareStrings(left.file.path, right.file.path)
    );

  return {
    available: true,
    scope,
    metric,
    sizeMetric: store.sizeMetric,
    folder,
    total: ranked.length,
    hotspots: ranked.slice(0, limit).map((entry, index) => ({
      rank: index + 1,
      id: entry.file.id,
      path: entry.file.path,
      value: entry.value,
      risk: entry.file.risk
    }))
  };
}

export function checkChangeImpact(
  store: ArchitectureStore,
  input: CheckChangeImpactInput
): CheckChangeImpactResult {
  const target = store.resolveTarget(input.path);
  const files = "id" in target ? [target as StoreFile] : target.files;
  if (files.length === 0) {
    throw new McpDataError(`"${input.path}" no contiene ficheros`);
  }

  const direction: ImpactDirection = input.direction ?? "dependents";
  const depth = clampInteger(input.depth, 2, 1, 8);
  const limit = clampInteger(input.limit, 50, 1, 200);
  const seedIds = new Set(files.map((file) => file.id));
  const found = new Map<
    string,
    { depth: number; directions: Set<"dependents" | "dependencies"> }
  >();

  const merge = (
    walked: Map<
      string,
      { depth: number; directions: Set<"dependents" | "dependencies"> }
    >
  ): void => {
    for (const [id, entry] of walked) {
      const existing = found.get(id);
      if (!existing) {
        found.set(id, {
          depth: entry.depth,
          directions: new Set(entry.directions)
        });
        continue;
      }
      existing.depth = Math.min(existing.depth, entry.depth);
      for (const value of entry.directions) existing.directions.add(value);
    }
  };

  if (direction === "dependents" || direction === "both") {
    merge(walk(store.incoming, seedIds, depth, "dependents"));
  }
  if (direction === "dependencies" || direction === "both") {
    merge(walk(store.outgoing, seedIds, depth, "dependencies"));
  }

  const all = [...found.entries()]
    .map(([id, entry]) => {
      const file = store.filesById.get(id);
      if (!file) return null;
      return {
        path: file.path,
        id,
        depth: entry.depth,
        directions: [...entry.directions].sort(compareStrings),
        risk: file.risk,
        ...(store.diffForPath(file.path)?.status
          ? { change: store.diffForPath(file.path)?.status }
          : {})
      } satisfies ImpactNode;
    })
    .filter((entry): entry is ImpactNode => entry !== null)
    .sort(
      (left, right) =>
        left.depth - right.depth || compareStrings(left.path, right.path)
    );

  const impacted = all.slice(0, limit);
  const startPath = target.path;
  const paths = uniqueStrings([
    ...files.map((file) => file.path),
    ...impacted.map((entry) => entry.path)
  ]);
  const diff = store.report
    ? {
        available: true,
        counts: store.diffCounts(startPath),
        changes: paths
          .map((pathValue) => {
            const state = store.diffForPath(pathValue);
            return state
              ? {
                  path: pathValue,
                  status: state.status,
                  ...(state.hotspot ? { hotspot: true } : {})
                }
              : null;
          })
          .filter(
            (
              entry
            ): entry is {
              path: string;
              status: "added" | "changed" | "removed";
              hotspot?: boolean;
            } => entry !== null
          ),
        truncated: Math.max(0, all.length - impacted.length)
      }
    : { available: false };

  const cycle =
    "id" in target
      ? {
          inCycle: (target as StoreFile).inCycle > 0,
          size: (target as StoreFile).cycleSize
        }
      : (() => {
          const cyclic = files.filter((file) => file.inCycle > 0);
          return {
            filesInCycle: cyclic.length,
            maxSize: Math.max(0, ...cyclic.map((file) => file.cycleSize))
          };
        })();

  return {
    start: {
      kind: "id" in target ? "file" : "folder",
      path: startPath,
      ...(("id" in target) ? { id: (target as StoreFile).id } : {}),
      files: files.length
    },
    direction,
    depth,
    summary: {
      direct: all.filter((entry) => entry.depth === 1).length,
      transitive: all.length,
      dependents: all.filter((entry) =>
        entry.directions.includes("dependents")
      ).length,
      dependencies: all.filter((entry) =>
        entry.directions.includes("dependencies")
      ).length,
      truncated: Math.max(0, all.length - impacted.length)
    },
    cycle,
    impacted,
    diff,
    violations: store.violationsForPaths(paths, 10),
    reasons: store.report
      ? []
      : ["sin report.json: no hay cambios ni violaciones que cruzar"]
  };
}

export function listViolations(
  store: ArchitectureStore,
  input: ListViolationsInput = {}
): ListViolationsResult {
  if (!store.report) {
    return {
      available: false,
      configured: false,
      profile: null,
      counts: {
        introduced: 0,
        existing: 0,
        resolved: 0,
        introducedErrors: 0,
        introducedWarnings: 0
      },
      total: 0,
      violations: [],
      reason:
        "no hay report.json cargado; ejecuta codarch diff para evaluar reglas"
    };
  }

  const status = input.status ?? "all";
  const severity = input.severity ?? "all";
  const type = input.type ?? "all";
  const limit = clampInteger(input.limit, 20, 1, 100);
  const all = store.allViolations().filter((entry) => {
    if (status !== "all" && entry.status !== status) return false;
    if (severity !== "all" && entry.violation.severity !== severity) {
      return false;
    }
    if (type !== "all" && entry.violation.type !== type) return false;
    if (input.rule && entry.violation.rule !== input.rule) return false;
    return true;
  });

  const summary = store.report.rules.summary;
  return {
    available: true,
    configured: store.report.rules.configured,
    profile: store.report.rules.profile ?? null,
    counts: {
      introduced: summary.introduced,
      existing: summary.existing,
      resolved: summary.resolved,
      introducedErrors: summary.introducedErrors,
      introducedWarnings: summary.introducedWarnings
    },
    total: all.length,
    violations: all.slice(0, limit)
  };
}

export function explainModule(
  store: ArchitectureStore,
  input: ExplainModuleInput
): ExplainModuleResult {
  const target = store.resolveTarget(input.path);
  const limit = clampInteger(input.limit, 5, 1, 50);
  const base = {
    projectName: store.snapshot.meta.projectName ?? "",
    checksum: store.snapshot.meta.checksum ?? "",
    sizeMetric: store.sizeMetric,
    violations: [] as StatusViolation[],
    metrics: {} as Record<string, number>,
    risk: 0,
    complexity: 0,
    files: 0,
    name: target.name,
    path: target.path
  };

  if ("id" in target) {
    const file = target as StoreFile;
    const dependencies = edgeViews(store.outgoing.get(file.id) ?? [], "to", limit);
    const dependents = edgeViews(store.incoming.get(file.id) ?? [], "from", limit);
    const state = store.diffForPath(file.path);
    return {
      ...base,
      kind: "file",
      id: file.id,
      files: 1,
      metrics: sortMetrics(file.metrics),
      risk: file.risk,
      complexity: file.complexity,
      symbols: symbolsOf(store.snapshot, file.id)
        .slice(0, limit)
        .map((symbol) => ({
          name: symbol.name,
          kind: symbol.kind,
          line: symbol.line,
          ...(symbol.complexity === undefined
            ? {}
            : { complexity: symbol.complexity }),
          ...(symbol.lines === undefined ? {} : { lines: symbol.lines })
        })),
      riskRank: store.riskRank.get(file.id),
      cycle: {
        inCycle: file.inCycle > 0,
        size: file.cycleSize
      },
      dependencies: {
        total: (store.outgoing.get(file.id) ?? []).length,
        edges: dependencies,
        truncated: Math.max(
          0,
          (store.outgoing.get(file.id) ?? []).length - dependencies.length
        )
      },
      dependents: {
        total: (store.incoming.get(file.id) ?? []).length,
        edges: dependents,
        truncated: Math.max(
          0,
          (store.incoming.get(file.id) ?? []).length - dependents.length
        )
      },
      diff: store.report
        ? {
            available: true,
            state: state
              ? {
                  status: state.status,
                  ...(state.hotspot ? { hotspot: true } : {}),
                  ...(state.changes ? { changes: state.changes.length } : {})
                }
              : null
          }
        : {
            available: false,
            reason:
              "no hay report.json cargado; no sé si este fichero cambió en el PR"
          },
      violations: store.violationsForPaths([file.path], 10)
    };
  }

  const folder = target as StoreFolder;
  const folderFiles = store.filesUnder(folder.path);
  const ids = new Set(folderFiles.map((file) => file.id));
  const outgoing = store.edges.filter(
    (edge) => ids.has(edge.fromId) && !ids.has(edge.toId)
  );
  const incoming = store.edges.filter(
    (edge) => ids.has(edge.toId) && !ids.has(edge.fromId)
  );
  const outgoingPaths = aggregateEdgeViews(outgoing, "to");
  const incomingPaths = aggregateEdgeViews(incoming, "from");
  const cyclic = folderFiles.filter((file) => file.inCycle > 0);
  const topFiles = [...folderFiles]
    .sort(
      (left, right) =>
        right.risk - left.risk || compareStrings(left.path, right.path)
    )
    .slice(0, limit)
    .map((file) => ({
      path: file.path,
      risk: file.risk,
      size: file.size
    }));

  return {
    ...base,
    kind: "folder",
    files: folder.files.length,
    metrics: {
      size: folder.size,
      maxComplexity: folder.maxComplexity,
      risk: folder.risk
    },
    risk: folder.risk,
    complexity: folder.maxComplexity,
    cycle: {
      filesInCycle: cyclic.length,
      maxSize: Math.max(0, ...cyclic.map((file) => file.cycleSize))
    },
    childFolders: folder.childFolders.slice(0, limit),
    topFiles,
    dependencies: {
      total: outgoingPaths.length,
      edges: outgoingPaths.slice(0, limit),
      truncated: Math.max(0, outgoingPaths.length - limit)
    },
    dependents: {
      total: incomingPaths.length,
      edges: incomingPaths.slice(0, limit),
      truncated: Math.max(0, incomingPaths.length - limit)
    },
    diff: store.report
      ? {
          available: true,
          state: null,
          counts: store.diffCounts(folder.path)
        }
      : {
          available: false,
          reason:
            "no hay report.json cargado; no sé qué cambió bajo esta carpeta"
        },
    violations: store.violationsForPaths(
      folderFiles.map((file) => file.path),
      10
    )
  };
}

/**
 * Qué arquitectura tiene ya el código, como propuesta para `.codarch.yml`.
 *
 * Es la consulta de `codarch suggest`: mira el grafo y deduce qué carpetas
 * están hacia dentro y cuáles hacia fuera. Propone; el equipo decide (ADR 0023).
 */
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

export function suggestArchitecture(
  store: ArchitectureStore
): SuggestArchitectureResult {
  const suggestion = suggestLayers(store.snapshot);
  return {
    available: true,
    configVersion: CONFIG_VERSION,
    detected: suggestion.detected,
    layers: suggestion.layers,
    rules: suggestion.rules,
    proposal: suggestion.proposal,
    profile: suggestion.profile,
    ungrouped: suggestion.ungrouped,
    notes: suggestion.notes,
    fits: suggestion.fits
  };
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

/** El catálogo de perfiles de arquitectura (la consulta de `codarch profiles`). */
export function listProfiles(): ListProfilesResult {
  return {
    configVersion: CONFIG_VERSION,
    profiles: DOMAIN_PROFILES.map((profile) => ({
      id: profile.id,
      title: profile.title,
      description: profile.description,
      when: profile.when,
      layers: profile.layers.map((layer) => ({
        name: layer.name,
        patterns: layer.patterns
      })),
      rules: profile.rules.map((rule) => ({
        name: rule.name,
        from: rule.from,
        to: rule.to,
        severity: rule.severity,
        message: rule.message ?? null
      }))
    }))
  };
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

/**
 * Comprueba que el snapshot encaja con la historia (ADR 0026).
 *
 * Usa el snapshot que el store ya cargó, no una segunda lectura del disco: es
 * la misma comprobación que `codarch verify` sobre el mismo dato (ADR 0074).
 */
export function verifyHistory(
  store: ArchitectureStore
): VerifyHistoryResult {
  const index = readHistoryIndex(store.root);
  if (index.entries.length === 0) {
    return {
      available: false,
      ok: false,
      checked: 0,
      projectHead: "",
      mismatches: [],
      reason:
        "no hay historial en este repositorio; se guarda con `codarch analyze . --history`"
    };
  }

  const chains = loadChains(store.root, index.entries);
  const result = verifyChains(chains, store.snapshot);
  return {
    available: true,
    ok: result.ok,
    checked: result.checked,
    projectHead: result.projectHead,
    mismatches: result.mismatches
  };
}

function mapFolder(
  store: ArchitectureStore,
  folder: StoreFolder,
  level: number,
  depth: number,
  limit: number,
  includeFiles: boolean
): MapNode {
  const diff = store.report ? store.diffCounts(folder.path) : null;
  const node: MapNode = {
    kind: "folder",
    path: folder.path,
    name: folder.name,
    files: folder.files.length,
    metrics: {
      size: folder.size,
      maxComplexity: folder.maxComplexity,
      risk: folder.risk
    },
    childFolders: folder.childFolders.length,
    ...(diff
      ? {
          changes: {
            added: diff.files.added,
            changed: diff.files.changed,
            removed: diff.files.removed,
            hotspots: diff.hotspots,
            violations:
              diff.violations.introduced +
              diff.violations.existing +
              diff.violations.resolved
          }
        }
      : {})
  };

  if (level >= depth) {
    const directFiles = includeFiles
      ? folder.files.filter((file) => parentPath(file.path) === folder.path)
          .length
      : 0;
    const omitted = folder.childFolders.length + directFiles;
    if (omitted > 0) node.truncated = omitted;
    return node;
  }

  const children: MapNode[] = [];
  for (const childPath of folder.childFolders) {
    const child = store.folder(childPath);
    if (!child) continue;
    children.push(mapFolder(store, child, level + 1, depth, limit, includeFiles));
  }
  if (includeFiles) {
    for (const file of folder.files) {
      if (parentPath(file.path) !== folder.path) continue;
      const state = store.diffForPath(file.path);
      children.push({
        kind: "file",
        path: file.path,
        name: file.name,
        id: file.id,
        files: 1,
        metrics: {
          size: file.size,
          maxComplexity: file.complexity,
          risk: file.risk
        },
        ...(state && state.status !== "removed" ? { change: state.status } : {}),
        childFolders: 0
      });
    }
  }

  children.sort(
    (left, right) =>
      right.metrics.size - left.metrics.size ||
      compareStrings(left.path, right.path)
  );
  const kept = children.slice(0, limit);
  node.children = kept;
  if (children.length > kept.length) node.truncated = children.length - kept.length;
  return node;
}

function resolveFolder(
  store: ArchitectureStore,
  folderPath: string,
  original: string
): StoreFolder {
  const folder = store.folder(folderPath);
  if (folder) return folder;
  const target = store.resolveTarget(original);
  if ("id" in target) {
    throw new McpDataError(`"${original}" es un fichero, no una carpeta`);
  }
  return target as StoreFolder;
}

function walk(
  adjacency: Map<string, Array<{ fromId: string; toId: string }>>,
  seeds: Set<string>,
  depth: number,
  direction: "dependents" | "dependencies"
): Map<
  string,
  { depth: number; directions: Set<"dependents" | "dependencies"> }
> {
  const found = new Map<
    string,
    { depth: number; directions: Set<"dependents" | "dependencies"> }
  >();
  let frontier = new Set(seeds);
  for (let currentDepth = 1; currentDepth <= depth; currentDepth++) {
    const next = new Set<string>();
    for (const id of frontier) {
      for (const edge of adjacency.get(id) ?? []) {
        const neighbor =
          direction === "dependents" ? edge.fromId : edge.toId;
        if (seeds.has(neighbor)) continue;
        const existing = found.get(neighbor);
        if (existing) {
          existing.directions.add(direction);
          existing.depth = Math.min(existing.depth, currentDepth);
          continue;
        }
        found.set(neighbor, {
          depth: currentDepth,
          directions: new Set([direction])
        });
        next.add(neighbor);
      }
    }
    if (next.size === 0) break;
    frontier = next;
  }
  return found;
}

function edgeViews(
  edges: Array<{
    from: string;
    to: string;
    weight: number;
    typeOnly: number;
    isCyclic: boolean;
  }>,
  side: "from" | "to",
  limit: number
): EdgeView[] {
  return edges.slice(0, limit).map((edge) => ({
    path: edge[side],
    weight: edge.weight,
    typeOnly: edge.typeOnly,
    isCyclic: edge.isCyclic
  }));
}

function aggregateEdgeViews(
  edges: readonly {
    from: string;
    to: string;
    weight: number;
    typeOnly: number;
    isCyclic: boolean;
  }[],
  side: "from" | "to"
): EdgeView[] {
  const byPath = new Map<string, EdgeView>();
  for (const edge of edges) {
    const pathValue = edge[side];
    const existing = byPath.get(pathValue);
    if (existing) {
      existing.weight += edge.weight;
      existing.typeOnly += edge.typeOnly;
      existing.isCyclic = existing.isCyclic || edge.isCyclic;
    } else {
      byPath.set(pathValue, {
        path: pathValue,
        weight: edge.weight,
        typeOnly: edge.typeOnly,
        isCyclic: edge.isCyclic
      });
    }
  }
  return [...byPath.values()].sort(
    (left, right) =>
      right.weight - left.weight || compareStrings(left.path, right.path)
  );
}

function sortMetrics(
  metrics: Record<string, number>
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(metrics).sort(([left], [right]) => compareStrings(left, right))
  );
}

function parentPath(pathValue: string): string {
  const index = pathValue.lastIndexOf("/");
  return index === -1 ? "" : pathValue.slice(0, index);
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function clampInteger(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
