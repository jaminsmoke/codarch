import {
  walkTree,
  type CcJson,
  type CcMigrationLanguage,
  type CcMigrationSummary
} from "@codarch/schema/browser";
import type { CachedParse, ParseCache } from "./cache";
import type { FileSystem } from "./fs";
import { buildGraph, type DependencyLink } from "./graph";
import {
  buildMigration,
  isNativeLanguage,
  isTsJsLanguage,
  jsIsBridge,
  languageForPath,
  measureRustSource,
  rustIsBridge,
  MIGRATION_EXTENSIONS,
  type MigrationFileInput,
  type MigrationLinkInput
} from "./migration";
import { ImportTargetIndex } from "./import-targets";
import { extensionsFor, parserFor } from "./parsers";
import * as path from "./path";
import { ImportResolver, isAssetSpecifier } from "./resolve";
import { buildSnapshot, type SnapshotFile } from "./snapshot";
import type {
  FileParseResult,
  ImportTargets,
  Metrics,
  ParsedImport,
  ParserProject,
  SourceParser
} from "./types";
import { walkSourceFiles, type WalkedFile } from "./walk";

export interface ChurnMetric {
  commits: number;
  authors: number;
}

export interface ChurnResult {
  metrics: Map<string, ChurnMetric>;
  warnings: string[];
  enabled: boolean;
  commits: number;
  authors: number;
  shallow: boolean;
}

export interface AnalyzeCoreOptions {
  /** Puerto de ficheros: el disco en el CLI, memoria en el navegador. */
  fileSystem: FileSystem;
  /** Raíz virtual del análisis. */
  root?: string;
  /**
   * Nombre del proyecto cuando no hay `package.json`.
   *
   * El nombre de la raíz entra en el checksum, así que el CLI y el navegador
   * tienen que usar el mismo: el de la carpeta.
   */
  fallbackName?: string;
  projectName?: string;
  ignore?: readonly string[];
  extensions?: readonly string[];
  /**
   * Los parsers del análisis: se elige por extensión (ADR 0090).
   *
   * El nativo del CLI y el WASM del navegador cubren TS/JS. Un repositorio
   * que solo tenga esos ficheros da el mismo resultado que con un parser
   * único: el registro no añade nada.
   */
  parsers: readonly SourceParser[];
  /**
   * El parseo de la vez anterior, si hay (ADR 0056).
   *
   * Un puerto sin `stat` (el navegador) no la usa: analiza entero, que es lo
   * que hace hoy porque analiza una vez la carpeta que se elige.
   */
  cache?: ParseCache;
  /** El commit del repo, si el puerto de ficheros lo conoce (el CLI con git). */
  commitHash?: string;
  /**
   * Métricas de historial por ruta relativa.
   *
   * El navegador no tiene git, así que no lo pasa: su snapshot sale sin
   * churn, como el del CLI con `--no-git`.
   */
  churn?: (relativePaths: string[]) => ChurnResult;
  /**
   * Avisa del progreso fichero a fichero.
   *
   * El navegador lo usa para pintar una barra y para saber cuándo puede
   * cancelar: el análisis es síncrono y solo se puede interrumpir entre
   * ficheros.
   */
  onProgress?: (progress: AnalyzeProgress) => void;
}

export interface AnalyzeProgress {
  /** Ficheros ya procesados. */
  done: number;
  /** Ficheros totales. */
  total: number;
  /** Ruta del fichero en curso. */
  current: string;
}

export interface UnresolvedImportIssue {
  file: string;
  /** Línea 1-based. */
  line: number;
  specifier: string;
  reason: string;
}

/** Un `using` que espera a saber qué ficheros declaran su espacio de nombres. */
interface PendingNamespaceImport {
  file: string;
  /** Las métricas del fichero: el recuento se cierra cuando se resuelve. */
  metrics: Metrics;
  imported: ParsedImport;
  namespaces: string[];
  builtin: boolean;
}

export interface AnalyzeCoreResult {
  snapshot: CcJson;
  files: number;
  /** Carpetas del árbol, sin contar la raíz sintética. */
  folders: number;
  edges: number;
  cycles: string[][];
  metricNames: string[];
  warnings: string[];
  unresolved: UnresolvedImportIssue[];
  externalImports: number;
  builtinImports: number;
  typeOnlyImports: number;
  unresolvedImports: number;
  migration: CcMigrationSummary;
  /** Resumen del historial, si lo hubo. */
  churn: ChurnResult | null;
  /** Ficheros reutilizados de la caché y ficheros parseados de nuevo. */
  cache: { hits: number; misses: number };
  durationMs: number;
}

/**
 * Núcleo del análisis, sin node:fs ni git.
 *
 * Es lo que corre en el navegador: recibe los ficheros por el puerto y los
 * parsers, y devuelve el mismo `cc.json` que el CLI.
 */
/**
 * Lo que se llena mientras se recorren los ficheros.
 *
 * El recorrido no devuelve nada: mide y apunta aquí. Así el análisis se lee
 * como lo que es —recorrer, cerrar lo pendiente, contar y montar el
 * snapshot— y no como treinta ramas dentro de un `for`.
 */
interface AnalysisState {
  parsedFiles: SnapshotFile[];
  migrationFiles: MigrationFileInput[];
  migrationLinks: MigrationLinkInput[];
  links: DependencyLink[];
  unresolved: UnresolvedImportIssue[];
  /**
   * Los espacios de nombres que declara cada fichero (C#), por nombre.
   *
   * Un `using` no se puede resolver mientras se mide el fichero que lo escribe:
   * el espacio de nombres puede estar declarado en cualquier otro.
   */
  namespaceDeclarations: Map<string, string[]>;
  pendingNamespaces: PendingNamespaceImport[];
  warnings: string[];
  external: number;
  builtin: number;
  typeOnly: number;
  cacheHits: number;
  cacheMisses: number;
}

/** Lo que necesita medir un fichero: el recorrido, los parsers y el estado. */
interface MeasureContext {
  state: AnalysisState;
  fileSystem: FileSystem;
  parsers: readonly SourceParser[];
  cache?: ParseCache;
  resolver: ImportResolver;
  importIndex: ImportTargetIndex | null;
}

/**
 * Núcleo del análisis, sin node:fs ni git.
 *
 * Es lo que corre en el navegador: recibe los ficheros por el puerto y los
 * parsers, y devuelve el mismo `cc.json` que el CLI.
 */
export function analyzeFiles(
  options: AnalyzeCoreOptions
): AnalyzeCoreResult {
  const started = Date.now();
  const fileSystem = options.fileSystem;
  const root = options.root ?? "/";
  const projectName =
    options.projectName ?? readProjectName(fileSystem, root, options.fallbackName);
  const walked = walkSourceFiles(fileSystem, {
    ignore: options.ignore,
    // Lo que un parser sabe leer se recorre; lo que solo mide la lente de
    // migración (Rust, wasm, node), también.
    extensions:
      options.extensions ??
      extensionsFor(options.parsers, MIGRATION_EXTENSIONS)
  });
  const state: AnalysisState = {
    parsedFiles: [],
    migrationFiles: [],
    migrationLinks: [],
    links: [],
    unresolved: [],
    namespaceDeclarations: new Map(),
    pendingNamespaces: [],
    warnings: [...walked.warnings],
    external: 0,
    builtin: 0,
    typeOnly: 0,
    cacheHits: 0,
    cacheMisses: 0
  };
  // Los ficheros borrados no ocupan sitio en la caché.
  options.cache?.retain(walked.files.map((file) => file.relativePath));
  const resolver = new ImportResolver(root, walked.files, fileSystem);
  state.warnings.push(...resolver.warnings);
  prepareParsers(options, root, fileSystem);
  const context: MeasureContext = {
    state,
    fileSystem,
    parsers: options.parsers,
    cache: options.cache,
    resolver,
    importIndex: importIndexFor(options, walked.files, fileSystem)
  };

  let processed = 0;
  for (const file of walked.files) {
    processed += 1;
    options.onProgress?.({
      done: processed,
      total: walked.files.length,
      current: file.relativePath
    });
    measureFile(file, context);
  }

  // Los `using` de C# se resuelven ahora, que ya se sabe qué declara cada
  // fichero. Antes de esto, un import de espacio de nombres no tenía destino.
  closeNamespaces(state);

  const churnResult = applyChurn(state, options.churn);
  const graph = buildGraph(
    state.parsedFiles.map((file) => file.relativePath),
    state.links
  );
  applyGraph(state, graph);
  const migration = buildMigration(state.migrationFiles, state.migrationLinks);
  applyMigration(state, migration);

  if (state.unresolved.length > 0) {
    state.warnings.push(
      `${state.unresolved.length} imports sin resolver; se excluyen del grafo`
    );
  }

  const snapshot = buildSnapshot({
    projectName,
    files: state.parsedFiles,
    graph,
    migration,
    commitHash: options.commitHash
  });

  let folders = 0;
  walkTree(snapshot.files, (entry) => {
    if (entry.node.type === "Folder" && entry.depth > 0) folders++;
  });

  const metricNames = new Set<string>();
  for (const file of state.parsedFiles) {
    for (const metric of Object.keys(file.metrics)) metricNames.add(metric);
  }

  state.warnings.sort();

  return {
    snapshot,
    files: state.parsedFiles.length,
    folders,
    edges: graph.edges.length,
    cycles: graph.cycles,
    metricNames: [...metricNames].sort(),
    warnings: state.warnings,
    unresolved: state.unresolved,
    externalImports: state.external,
    builtinImports: state.builtin,
    typeOnlyImports: state.typeOnly,
    unresolvedImports: state.unresolved.length,
    migration: migration.summary,
    churn: churnResult,
    cache: { hits: state.cacheHits, misses: state.cacheMisses },
    durationMs: Date.now() - started
  };
}

/**
 * Lo que un lenguaje declara fuera de sus ficheros se lee una vez, no una vez
 * por import: Go pide aquí su `go.mod`.
 */
function prepareParsers(
  options: AnalyzeCoreOptions,
  root: string,
  fileSystem: FileSystem
): void {
  const project: ParserProject = {
    readFile: (relativePath) => {
      try {
        return fileSystem.readFile(path.join(root, relativePath));
      } catch {
        return null;
      }
    }
  };
  for (const parser of options.parsers) parser.prepare?.(project);
}

/** El índice de rutas, solo si algún lenguaje declara sus imports como rutas. */
function importIndexFor(
  options: AnalyzeCoreOptions,
  files: readonly WalkedFile[],
  fileSystem: FileSystem
): ImportTargetIndex | null {
  // Lo usan Java y Python, que apuntan a un fichero por sufijo.
  if (!options.parsers.some((parser) => parser.importTargets)) return null;
  return new ImportTargetIndex(
    files.map((file) => file.relativePath),
    fileSystem.caseSensitive
  );
}

/**
 * Mide un fichero: lo que se cuenta, lo que se lee, lo que se parsea y lo que
 * se apunta.
 *
 * Un fichero que no se puede leer o no se sabe medir se salta con su aviso, y
 * el análisis sigue: un fichero raro no invalida el repositorio.
 */
function measureFile(file: WalkedFile, context: MeasureContext): void {
  const language = languageForPath(file.relativePath);
  const parser = parserFor(context.parsers, file.relativePath);
  // Sin lenguaje ni parser no hay nada que medir: el recorrido puede traer
  // extensiones que solo atiende un parser apagado.
  if (!language && !parser) return;

  if (language && isNativeLanguage(language)) {
    pushUnmeasured(context.state, file, language);
    return;
  }

  // Si la versión no cambió, se reutiliza el parseo y no se lee el fichero.
  const version = versionOf(context.fileSystem, file.absolutePath);
  // La versión dice que el fichero no cambió; el parser, que se midió con el
  // mismo árbol (ADR 0090).
  const cached =
    version && parser
      ? context.cache?.get(file.relativePath, version, parser.name) ?? null
      : null;
  const source = cached
    ? ""
    : readSource(context.state, context.fileSystem, file);
  if (source === null) return;

  // Una extensión que ningún parser declara solo llega aquí para la lente de
  // migración, y no tiene árbol que medir.
  if (!parser) {
    // Rust se mide en cada pasada: son pocos ficheros y su medida es barata.
    if (language === "rust") measureRustFile(context.state, file, source);
    return;
  }

  const parsed = parseFile(context, file, parser, source, cached, version);
  if (!parsed) return;

  // Los espacios de nombres del fichero, para lo que busquen los `using` de
  // los demás.
  noteNamespaces(
    parsed.parsed.namespaces ?? [],
    file.relativePath,
    context.state.namespaceDeclarations
  );

  recordFile(context, file, language, parser, parsed.parsed, parsed.bridge);
}

/** Un `.wasm` o un `.node`: es un nodo, y no hay fuente que medir. */
function pushUnmeasured(
  state: AnalysisState,
  file: WalkedFile,
  language: CcMigrationLanguage
): void {
  state.parsedFiles.push({
    relativePath: file.relativePath,
    metrics: { loc: 0, rloc: 0 }
  });
  state.migrationFiles.push({
    relativePath: file.relativePath,
    language,
    loc: 0,
    rloc: 0,
    maxComplexity: 0,
    fanIn: 0,
    bridge: false
  });
}

/** Rust sin parser: cuentan las líneas y si puentea a JavaScript. */
function measureRustFile(
  state: AnalysisState,
  file: WalkedFile,
  source: string
): void {
  const measured = measureRustSource(source);
  state.parsedFiles.push({
    relativePath: file.relativePath,
    metrics: { loc: measured.loc, rloc: measured.rloc }
  });
  state.migrationFiles.push({
    relativePath: file.relativePath,
    language: "rust",
    loc: measured.loc,
    rloc: measured.rloc,
    maxComplexity: 0,
    fanIn: 0,
    bridge: rustIsBridge(source)
  });
}

/** Lee el fichero, o devuelve `null` y deja el aviso. */
function readSource(
  state: AnalysisState,
  fileSystem: FileSystem,
  file: WalkedFile
): string | null {
  try {
    // Las líneas no son código (ADR 0076): el mismo fichero con CRLF y con
    // LF es el mismo fichero. Sin normalizar, el export del HEAD en Windows
    // sale con CRLF y el árbol de trabajo con LF, y Cambios enseña ficheros
    // que nadie ha tocado.
    return fileSystem.readFile(file.absolutePath).replace(/\r\n?/g, "\n");
  } catch (error) {
    state.warnings.push(
      `no se pudo leer ${file.relativePath}: ${(error as Error).message}`
    );
    return null;
  }
}

/**
 * El parseo del fichero: de la caché si está, del parser si no.
 *
 * Un parser que revienta deja el aviso y el fichero fuera del análisis, con lo
 * que no aporta métricas que nadie pueda comparar.
 */
function parseFile(
  context: MeasureContext,
  file: WalkedFile,
  parser: SourceParser,
  source: string,
  cached: CachedParse | null,
  version: string | null
): { parsed: FileParseResult; bridge: boolean } | null {
  if (cached) {
    context.state.cacheHits += 1;
    return { parsed: cached.parsed, bridge: cached.bridge };
  }

  let parsed: FileParseResult;
  try {
    parsed = parser.parse(source, file.relativePath);
  } catch (error) {
    context.state.warnings.push(
      `no se pudo analizar ${file.relativePath}: ${(error as Error).message}`
    );
    return null;
  }

  // El puente es una propiedad de JS/TS hacia otro lenguaje: un fichero de
  // otro lenguaje no puentea a nada, aunque tenga imports.
  const language = languageForPath(file.relativePath);
  const bridge =
    language !== null && isTsJsLanguage(language)
      ? jsIsBridge(
          source,
          parsed.imports.map((imported) => imported.specifier)
        )
      : false;

  context.state.cacheMisses += 1;
  if (version && context.cache) {
    context.cache.set(file.relativePath, {
      version,
      parser: parser.name,
      parsed,
      bridge
    });
  }
  return { parsed, bridge };
}

/**
 * Apunta un fichero ya parseado: métricas, aristas y su nodo de migración.
 *
 * Las métricas se crean antes de sus imports porque un `using` de C# se cierra
 * al final y tiene que apuntar ya a dónde sumar.
 */
function recordFile(
  context: MeasureContext,
  file: WalkedFile,
  language: CcMigrationLanguage | null,
  parser: SourceParser,
  parsed: FileParseResult,
  bridge: boolean
): void {
  const state = context.state;
  const metrics: Metrics = {
    ...parsed.metrics,
    imports: parsed.imports.length,
    externalImports: 0,
    builtinImports: 0,
    typeOnlyImports: 0,
    unresolvedImports: 0
  };

  const tally = resolveImports(parsed.imports, {
    file,
    parser,
    metrics,
    resolver: context.resolver,
    importIndex: context.importIndex,
    links: state.links,
    migrationLinks: state.migrationLinks,
    unresolved: state.unresolved,
    pendingNamespaces: state.pendingNamespaces
  });

  state.external += tally.external;
  state.builtin += tally.builtin;
  state.typeOnly += tally.typeOnly;

  metrics.externalImports = tally.external;
  metrics.builtinImports = tally.builtin;
  metrics.typeOnlyImports = tally.typeOnly;
  metrics.unresolvedImports = tally.unresolved;

  state.parsedFiles.push({
    relativePath: file.relativePath,
    symbols: parsed.symbols ?? [],
    imports: parsed.imports,
    exports: parsed.exports ?? [],
    members: parsed.members ?? [],
    metrics
  });
  // La lente de migración solo tiene estado para los lenguajes que modela.
  // Un fichero de otro lenguaje es un nodo como los demás y no entra en ella,
  // así que no aparece con una deuda que no le corresponde.
  if (language) {
    state.migrationFiles.push({
      relativePath: file.relativePath,
      language,
      loc: parsed.metrics.loc ?? 0,
      rloc: parsed.metrics.rloc ?? 0,
      maxComplexity: parsed.metrics.maxComplexity ?? 0,
      fanIn: 0,
      bridge
    });
  }
}

/** Cierra los `using` pendientes: ya se sabe quién declara cada espacio. */
function closeNamespaces(state: AnalysisState): void {
  if (state.pendingNamespaces.length === 0) return;
  const resolved = resolveNamespaceImports(
    state.pendingNamespaces,
    state.namespaceDeclarations,
    state.links
  );
  state.external += resolved.external;
  state.builtin += resolved.builtin;
  state.unresolved.push(...resolved.unresolved);
}

/** El historial, si el puerto lo trae (el navegador no tiene git). */
function applyChurn(
  state: AnalysisState,
  churn: AnalyzeCoreOptions["churn"]
): ChurnResult | null {
  if (!churn) return null;
  const result = churn(state.parsedFiles.map((file) => file.relativePath));
  state.warnings.push(...result.warnings);
  for (const file of state.parsedFiles) {
    const metrics = result.metrics.get(file.relativePath);
    if (!metrics) continue;
    file.metrics.number_of_commits = metrics.commits;
    file.metrics.number_of_authors = metrics.authors;
  }
  return result;
}

/** Fan-in, fan-out, ciclos y nivel: lo que dice el grafo de cada fichero. */
function applyGraph(
  state: AnalysisState,
  graph: ReturnType<typeof buildGraph>
): void {
  for (const file of state.parsedFiles) {
    const metrics = graph.metrics.get(file.relativePath);
    if (!metrics) continue;
    file.metrics.fanIn = metrics.fanIn;
    file.metrics.fanOut = metrics.fanOut;
    file.metrics.inCycle = metrics.inCycle;
    file.metrics.cycleSize = metrics.cycleSize;
    file.metrics.dependencyLevel = metrics.dependencyLevel;
  }
  for (const file of state.migrationFiles) {
    file.fanIn = graph.metrics.get(file.relativePath)?.fanIn ?? 0;
  }
}

/** Los cruces FFI y la deuda de migración de cada fichero. */
function applyMigration(
  state: AnalysisState,
  migration: ReturnType<typeof buildMigration>
): void {
  for (const file of state.parsedFiles) {
    const node = migration.nodes.get(file.relativePath);
    if (!node) continue;
    file.metrics.ffiCrossings = node.crossings;
    if (node.debt !== undefined) file.metrics.migrationDebt = node.debt;
  }
}

/** Lo que los imports de un fichero suman fuera del grafo: no todo es arista. */
interface ImportTally {
  external: number;
  builtin: number;
  typeOnly: number;
  unresolved: number;
}

/** Lo que necesita saber quién resuelve un import de un fichero concreto. */
interface ImportContext {
  file: WalkedFile;
  parser: SourceParser;
  /** Las métricas del fichero, donde el `using` pendiente de C# suma al final. */
  metrics: Metrics;
  resolver: ImportResolver;
  importIndex: ImportTargetIndex | null;
  links: DependencyLink[];
  migrationLinks: MigrationLinkInput[];
  unresolved: UnresolvedImportIssue[];
  pendingNamespaces: PendingNamespaceImport[];
}

/**
 * Resuelve los imports de un fichero: aristas, cruces FFI y lo que se cuenta.
 *
 * Cada familia de destino tiene su función porque no se parecen: un módulo de
 * TS/JS lo resuelve el `ImportResolver`, un paquete de Go son varios ficheros,
 * una ruta de Java es un sufijo y un `using` de C# no se puede cerrar aquí
 * (ADR 0090). Antes todo esto vivía dentro del recorrido, que por eso era la
 * función más compleja del repositorio.
 */
function resolveImports(
  imports: readonly ParsedImport[],
  context: ImportContext
): ImportTally {
  const tally: ImportTally = {
    external: 0,
    builtin: 0,
    typeOnly: 0,
    unresolved: 0
  };

  for (const imported of imports) {
    if (imported.typeOnly) tally.typeOnly += 1;

    // El parser del lenguaje puede saber a qué apunta un import (Java, Python,
    // Go y C#). Si no lo declara, se resuelve como TS/JS.
    const targets = context.parser.importTargets?.(
      imported,
      context.file.relativePath
    );

    if (targets) linkTargets(imported, targets, context, tally);
    else linkModule(imported, context, tally);
  }

  return tally;
}

/** Un import cuyo destino lo decide el lenguaje. */
function linkTargets(
  imported: ParsedImport,
  targets: ImportTargets,
  context: ImportContext,
  tally: ImportTally
): void {
  if (targets.kind === "namespace") {
    // Se apunta y se sigue: se cierra cuando están todos los ficheros.
    context.pendingNamespaces.push({
      file: context.file.relativePath,
      metrics: context.metrics,
      imported,
      namespaces: targets.namespaces,
      builtin: targets.builtin
    });
    return;
  }

  if (targets.kind === "external") {
    countFallback(targets.builtin, tally);
    return;
  }

  if (targets.kind === "package") {
    linkPackage(imported, targets, context, tally);
    return;
  }

  linkPath(imported, targets.paths, context, tally);
}

/** Un paquete son varios ficheros (Go): un import, varias aristas. */
function linkPackage(
  imported: ParsedImport,
  targets: Extract<ImportTargets, { kind: "package" }>,
  context: ImportContext,
  tally: ImportTally
): void {
  const members =
    context.importIndex?.packageFiles(targets.directories, targets.extensions) ??
    [];

  if (members.length > 0) {
    for (const member of members) {
      context.links.push({
        from: context.file.relativePath,
        to: member,
        typeOnly: imported.typeOnly
      });
    }
    return;
  }

  if (targets.required) {
    reportUnresolved(imported, context, tally, "no se encontró el paquete");
    return;
  }

  countFallback(targets.builtin === true, tally);
}

/** Una ruta (Java, Python): el primer sufijo que existe gana. */
function linkPath(
  imported: ParsedImport,
  paths: readonly string[],
  context: ImportContext,
  tally: ImportTally
): void {
  const target = context.importIndex?.match(paths) ?? null;
  if (target) {
    context.links.push({
      from: context.file.relativePath,
      to: target,
      typeOnly: imported.typeOnly
    });
    return;
  }

  if (context.importIndex?.hasPackage(paths)) {
    // El paquete está en el repo y la clase no: el import está roto.
    reportUnresolved(imported, context, tally, "no se encontró el fichero");
    return;
  }

  // Un paquete que no vive en el repositorio: una dependencia.
  tally.external += 1;
}

/** Un import de TS/JS: lo resuelve el `ImportResolver`. */
function linkModule(
  imported: ParsedImport,
  context: ImportContext,
  tally: ImportTally
): void {
  if (isAssetSpecifier(imported.specifier)) return;

  const result = context.resolver.resolve(
    context.file.absolutePath,
    imported.specifier
  );

  if (result.kind === "internal") {
    linkInternal(imported, result.file.relativePath, context);
    return;
  }

  if (result.kind === "external") {
    countFallback(result.builtin, tally);
    return;
  }

  reportUnresolved(imported, context, tally, result.reason);
}

/**
 * Un import interno: arista del grafo, o cruce FFI si apunta a un artefacto.
 *
 * Un `.wasm` o un `.node` no se ejecuta como módulo: cruza la frontera, y eso
 * lo mide la lente de migración, no el grafo de dependencias.
 */
function linkInternal(
  imported: ParsedImport,
  relativePath: string,
  context: ImportContext
): void {
  const targetLanguage = languageForPath(relativePath);

  if (targetLanguage === "wasm" || targetLanguage === "node") {
    context.migrationLinks.push({
      from: context.file.relativePath,
      to: relativePath,
      kind: targetLanguage === "wasm" ? "wasm" : "native"
    });
    return;
  }

  context.links.push({
    from: context.file.relativePath,
    to: relativePath,
    typeOnly: imported.typeOnly
  });
}

/** Lo que no es arista ni import roto: plataforma o dependencia. */
function countFallback(builtin: boolean, tally: ImportTally): void {
  if (builtin) tally.builtin += 1;
  else tally.external += 1;
}

function reportUnresolved(
  imported: ParsedImport,
  context: ImportContext,
  tally: ImportTally,
  reason: string
): void {
  tally.unresolved += 1;
  context.unresolved.push({
    file: context.file.relativePath,
    line: imported.line,
    specifier: imported.specifier,
    reason
  });
}

/**
 * Apunta los espacios de nombres de un fichero, sin repetirlo.
 *
 * Los ficheros se recorren en orden de ruta, así que la lista de cada espacio
 * sale ordenada sin volver a ordenarla.
 */
function noteNamespaces(
  namespaces: readonly string[],
  relativePath: string,
  declarations: Map<string, string[]>
): void {
  for (const namespace of namespaces) {
    const declared = declarations.get(namespace);
    if (!declared) declarations.set(namespace, [relativePath]);
    else if (!declared.includes(relativePath)) declared.push(relativePath);
  }
}

/**
 * Cierra los `using` de C# cuando ya se ha medido el repositorio entero.
 *
 * La regla son tres preguntas, en este orden (ADR 0090):
 *
 * 1. ¿Algún fichero declara el espacio de nombres? Entonces son aristas, una
 *    por fichero: `using Acme.Billing;` depende de cada fichero que declare
 *    `Acme.Billing`, no de un fichero concreto.
 * 2. ¿El repositorio declara su raíz —`Acme` para `using Acme.Gone`—? Entonces
 *    el espacio falta y el import está roto: C# no compilaría.
 * 3. Si no: `System…` y `Microsoft…` son plataforma; el resto, dependencia.
 *
 * Un fichero no se importa a sí mismo: es lo normal en C# —el `using` del
 * espacio que el propio fichero declara— y una arista de un nodo a sí mismo
 * sería un ciclo que nadie tiene.
 */
function resolveNamespaceImports(
  pending: readonly PendingNamespaceImport[],
  declarations: ReadonlyMap<string, readonly string[]>,
  links: DependencyLink[]
): { external: number; builtin: number; unresolved: UnresolvedImportIssue[] } {
  const roots = new Set<string>();
  for (const namespace of declarations.keys()) {
    const root = namespace.split(".", 1)[0];
    if (root) roots.add(root);
  }

  let external = 0;
  let builtin = 0;
  const unresolved: UnresolvedImportIssue[] = [];

  for (const entry of pending) {
    const { targets, known } = namespaceTargets(entry, declarations);

    if (targets.size > 0) {
      for (const target of [...targets].sort()) {
        links.push({
          from: entry.file,
          to: target,
          typeOnly: entry.imported.typeOnly
        });
      }
      continue;
    }

    // El espacio es del repositorio y, quitando el propio fichero, no queda
    // nadie: es el `using` del espacio que uno mismo declara. Ni arista, ni
    // import roto, ni dependencia.
    if (known) continue;

    const local = entry.namespaces.some((namespace) => {
      const root = namespace.split(".", 1)[0];
      return root !== undefined && roots.has(root);
    });

    if (local) {
      entry.metrics.unresolvedImports =
        (entry.metrics.unresolvedImports ?? 0) + 1;
      unresolved.push({
        file: entry.file,
        line: entry.imported.line,
        specifier: entry.imported.specifier,
        reason: "no se encontró el espacio de nombres"
      });
    } else if (entry.builtin) {
      entry.metrics.builtinImports = (entry.metrics.builtinImports ?? 0) + 1;
      builtin += 1;
    } else {
      entry.metrics.externalImports = (entry.metrics.externalImports ?? 0) + 1;
      external += 1;
    }
  }

  return { external, builtin, unresolved };
}

/** Busca los declarantes, excluyendo el propio fichero y sin duplicar destinos. */
function namespaceTargets(
  entry: PendingNamespaceImport,
  declarations: ReadonlyMap<string, readonly string[]>
): { targets: Set<string>; known: boolean } {
  const targets = new Set<string>();
  let known = false;
  for (const namespace of entry.namespaces) {
    const files = declarations.get(namespace);
    if (!files) continue;
    known = true;
    for (const file of files) {
      if (file !== entry.file) targets.add(file);
    }
  }
  return { targets, known };
}

/** La versión del fichero, si el puerto sabe darla. */
function versionOf(fileSystem: FileSystem, absolutePath: string): string | null {
  const version = fileSystem.stat?.(absolutePath);
  return version ? `${version.size}:${version.mtimeMs}` : null;
}

function readProjectName(
  fileSystem: FileSystem,
  root: string,
  fallbackName?: string
): string {
  try {
    const text = fileSystem.readFile(path.join(root, "package.json"));
    const parsed: unknown = JSON.parse(text.replace(/^\uFEFF/, ""));
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed) &&
      typeof (parsed as Record<string, unknown>).name === "string"
    ) {
      const name = ((parsed as Record<string, unknown>).name as string).trim();
      if (name) return name;
    }
  } catch {
    // Sin package.json legible: el directorio es un nombre razonable.
  }
  return fallbackName ?? path.basename(root) ?? "Proyecto";
}
