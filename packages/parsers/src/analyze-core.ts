import {
  walkTree,
  type CcJson,
  type CcMigrationSummary
} from "@codarch/schema/browser";
import type { ParseCache } from "./cache";
import type { FileSystem } from "./fs";
import { buildGraph, type DependencyLink } from "./graph";
import {
  buildMigration,
  isNativeLanguage,
  jsIsBridge,
  languageForPath,
  measureRustSource,
  rustIsBridge,
  MIGRATION_EXTENSIONS,
  type MigrationFileInput,
  type MigrationLinkInput
} from "./migration";
import * as path from "./path";
import { ImportResolver, isAssetSpecifier } from "./resolve";
import { buildSnapshot, type SnapshotFile } from "./snapshot";
import type { SourceParser } from "./types";
import { walkSourceFiles } from "./walk";

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
  /** Parser de TS/JS: nativo en el CLI, WASM en el navegador. */
  parser: SourceParser;
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
 * Es lo que corre en el navegador: recibe los ficheros por el puerto y un
 * parser, y devuelve el mismo `cc.json` que el CLI.
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
    extensions: options.extensions ?? MIGRATION_EXTENSIONS
  });
  const warnings = [...walked.warnings];
  // Los ficheros borrados no ocupan sitio en la caché.
  options.cache?.retain(walked.files.map((file) => file.relativePath));
  const resolver = new ImportResolver(root, walked.files, fileSystem);
  warnings.push(...resolver.warnings);

  const parser = options.parser;
  const parsedFiles: SnapshotFile[] = [];
  const migrationFiles: MigrationFileInput[] = [];
  const migrationLinks: MigrationLinkInput[] = [];
  const links: DependencyLink[] = [];
  const unresolved: UnresolvedImportIssue[] = [];
  let externalImports = 0;
  let builtinImports = 0;
  let typeOnlyImports = 0;
  let processed = 0;
  let cacheHits = 0;
  let cacheMisses = 0;

  for (const file of walked.files) {
    processed += 1;
    options.onProgress?.({
      done: processed,
      total: walked.files.length,
      current: file.relativePath
    });

    const language = languageForPath(file.relativePath);
    if (!language) continue;

    if (isNativeLanguage(language)) {
      parsedFiles.push({
        relativePath: file.relativePath,
        metrics: { loc: 0, rloc: 0 }
      });
      migrationFiles.push({
        relativePath: file.relativePath,
        language,
        loc: 0,
        rloc: 0,
        maxComplexity: 0,
        fanIn: 0,
        bridge: false
      });
      continue;
    }

    // Si la versión no cambió, se reutiliza el parseo y no se lee el fichero.
    const version = versionOf(fileSystem, file.absolutePath);
    const cached = version
      ? (options.cache?.get(file.relativePath, version) ?? null)
      : null;

    let source = "";
    if (!cached) {
      try {
        // Las líneas no son código (ADR 0076): el mismo fichero con CRLF y con
        // LF es el mismo fichero. Sin normalizar, el export del HEAD en Windows
        // sale con CRLF y el árbol de trabajo con LF, y Cambios enseña ficheros
        // que nadie ha tocado.
        source = fileSystem.readFile(file.absolutePath).replace(/\r\n?/g, "\n");
      } catch (error) {
        warnings.push(
          `no se pudo leer ${file.relativePath}: ${(error as Error).message}`
        );
        continue;
      }
    }

    // Rust se mide en cada pasada: son pocos ficheros y su medida es barata.
    if (language === "rust") {
      const measured = measureRustSource(source);
      parsedFiles.push({
        relativePath: file.relativePath,
        metrics: { loc: measured.loc, rloc: measured.rloc }
      });
      migrationFiles.push({
        relativePath: file.relativePath,
        language,
        loc: measured.loc,
        rloc: measured.rloc,
        maxComplexity: 0,
        fanIn: 0,
        bridge: rustIsBridge(source)
      });
      continue;
    }

    let parsed;
    let bridge: boolean;
    if (cached) {
      parsed = cached.parsed;
      bridge = cached.bridge;
      cacheHits++;
    } else {
      try {
        parsed = parser.parse(source, file.relativePath);
      } catch (error) {
        warnings.push(
          `no se pudo analizar ${file.relativePath}: ${(error as Error).message}`
        );
        continue;
      }
      bridge = jsIsBridge(
        source,
        parsed.imports.map((imported) => imported.specifier)
      );
      cacheMisses++;
      if (version && options.cache) {
        options.cache.set(file.relativePath, { version, parsed, bridge });
      }
    }

    let fileExternalImports = 0;
    let fileBuiltinImports = 0;
    let fileTypeOnlyImports = 0;
    let fileUnresolvedImports = 0;

    for (const imported of parsed.imports) {
      if (imported.typeOnly) fileTypeOnlyImports++;
      if (isAssetSpecifier(imported.specifier)) continue;

      const result = resolver.resolve(file.absolutePath, imported.specifier);
      if (result.kind === "internal") {
        const targetLanguage = languageForPath(result.file.relativePath);
        if (targetLanguage === "wasm" || targetLanguage === "node") {
          migrationLinks.push({
            from: file.relativePath,
            to: result.file.relativePath,
            kind: targetLanguage === "wasm" ? "wasm" : "native"
          });
        } else {
          links.push({
            from: file.relativePath,
            to: result.file.relativePath,
            typeOnly: imported.typeOnly
          });
        }
      } else if (result.kind === "external") {
        if (result.builtin) fileBuiltinImports++;
        else fileExternalImports++;
      } else {
        fileUnresolvedImports++;
        unresolved.push({
          file: file.relativePath,
          line: imported.line,
          specifier: imported.specifier,
          reason: result.reason
        });
      }
    }

    externalImports += fileExternalImports;
    builtinImports += fileBuiltinImports;
    typeOnlyImports += fileTypeOnlyImports;

    parsedFiles.push({
      relativePath: file.relativePath,
      symbols: parsed.symbols ?? [],
      imports: parsed.imports,
      exports: parsed.exports ?? [],
      members: parsed.members ?? [],
      metrics: {
        ...parsed.metrics,
        imports: parsed.imports.length,
        externalImports: fileExternalImports,
        builtinImports: fileBuiltinImports,
        typeOnlyImports: fileTypeOnlyImports,
        unresolvedImports: fileUnresolvedImports
      }
    });
    migrationFiles.push({
      relativePath: file.relativePath,
      language,
      loc: parsed.metrics.loc ?? 0,
      rloc: parsed.metrics.rloc ?? 0,
      maxComplexity: parsed.metrics.maxComplexity ?? 0,
      fanIn: 0,
      bridge
    });
  }

  let churnResult: ChurnResult | null = null;
  if (options.churn) {
    churnResult = options.churn(parsedFiles.map((file) => file.relativePath));
    warnings.push(...churnResult.warnings);
    for (const file of parsedFiles) {
      const metrics = churnResult.metrics.get(file.relativePath);
      if (!metrics) continue;
      file.metrics.number_of_commits = metrics.commits;
      file.metrics.number_of_authors = metrics.authors;
    }
  }

  const graph = buildGraph(
    parsedFiles.map((file) => file.relativePath),
    links
  );
  for (const file of parsedFiles) {
    const metrics = graph.metrics.get(file.relativePath);
    if (metrics) {
      file.metrics.fanIn = metrics.fanIn;
      file.metrics.fanOut = metrics.fanOut;
      file.metrics.inCycle = metrics.inCycle;
      file.metrics.cycleSize = metrics.cycleSize;
      file.metrics.dependencyLevel = metrics.dependencyLevel;
    }
  }

  for (const file of migrationFiles) {
    file.fanIn = graph.metrics.get(file.relativePath)?.fanIn ?? 0;
  }
  const migration = buildMigration(migrationFiles, migrationLinks);
  for (const file of parsedFiles) {
    const node = migration.nodes.get(file.relativePath);
    if (!node) continue;
    file.metrics.ffiCrossings = node.crossings;
    if (node.debt !== undefined) file.metrics.migrationDebt = node.debt;
  }

  if (unresolved.length > 0) {
    warnings.push(
      `${unresolved.length} imports sin resolver; se excluyen del grafo`
    );
  }

  const snapshot = buildSnapshot({
    projectName,
    files: parsedFiles,
    graph,
    migration,
    commitHash: options.commitHash
  });

  let folders = 0;
  walkTree(snapshot.files, (entry) => {
    if (entry.node.type === "Folder" && entry.depth > 0) folders++;
  });

  const metricNames = new Set<string>();
  for (const file of parsedFiles) {
    for (const metric of Object.keys(file.metrics)) metricNames.add(metric);
  }

  warnings.sort();

  return {
    snapshot,
    files: parsedFiles.length,
    folders,
    edges: graph.edges.length,
    cycles: graph.cycles,
    metricNames: [...metricNames].sort(),
    warnings,
    unresolved,
    externalImports,
    builtinImports,
    typeOnlyImports,
    unresolvedImports: unresolved.length,
    migration: migration.summary,
    churn: churnResult,
    cache: { hits: cacheHits, misses: cacheMisses },
    durationMs: Date.now() - started
  };
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
