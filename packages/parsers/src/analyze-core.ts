import { walkTree } from "@codarch/schema/browser";
import { applyChurn, applyGraph, applyMigration } from "./analyze/apply";
import { measureFile, prepareParsers } from "./analyze/measure";
import { closeNamespaces } from "./analyze/namespaces";
import {
  emptyState,
  type AnalysisState,
  type MeasureContext
} from "./analyze/state";
import type {
  AnalyzeCoreOptions,
  AnalyzeCoreResult
} from "./analyze/types";
import { buildGraph } from "./graph";
import type { FileSystem } from "./fs";
import { ImportTargetIndex } from "./import-targets";
import { buildMigration, MIGRATION_EXTENSIONS } from "./migration";
import { extensionsFor } from "./parsers";
import * as path from "./path";
import { ImportResolver } from "./resolve";
import { buildRestSnapshot, measureRestFile } from "./rest";
import { buildSnapshot } from "./snapshot";
import { walkCodeAndRest, type WalkedFile } from "./walk";

export type {
  AnalyzeCoreOptions,
  AnalyzeCoreResult,
  AnalyzeProgress,
  ChurnMetric,
  ChurnResult,
  UnresolvedImportIssue
} from "./analyze/types";

/**
 * Núcleo del análisis, sin node:fs ni git.
 *
 * Es lo que corre en el navegador: recibe los ficheros por el puerto y los
 * parsers, y devuelve el mismo `cc.json` que el CLI. Este fichero ordena las
 * fases y nada más: medir los ficheros vive en `analyze/measure.ts`, resolver
 * los imports en `analyze/links.ts`, cerrar los `using` de C# en
 * `analyze/namespaces.ts` y aplicar historial, grafo y migración en
 * `analyze/apply.ts`.
 */
export function analyzeFiles(
  options: AnalyzeCoreOptions
): AnalyzeCoreResult {
  const started = Date.now();
  const fileSystem = options.fileSystem;
  const root = options.root ?? "/";
  const projectName =
    options.projectName ?? readProjectName(fileSystem, root, options.fallbackName);
  // Un solo recorrido decide qué es código y qué es resto (ADR 0093).
  const walked = walkCodeAndRest(fileSystem, {
    ignore: options.ignore,
    // Lo que un parser sabe leer se recorre; lo que solo mide la lente de
    // migración (Rust, wasm, node), también.
    extensions:
      options.extensions ??
      extensionsFor(options.parsers, MIGRATION_EXTENSIONS)
  });
  const state: AnalysisState = emptyState(walked.warnings);
  // Los ficheros borrados no ocupan sitio en la caché.
  options.cache?.retain(walked.code.map((file) => file.relativePath));
  const resolver = new ImportResolver(root, walked.code, fileSystem);
  state.warnings.push(...resolver.warnings);
  prepareParsers(options, root, fileSystem);
  const context: MeasureContext = {
    state,
    fileSystem,
    parsers: options.parsers,
    cache: options.cache,
    resolver,
    importIndex: importIndexFor(options, walked.code, fileSystem)
  };

  let processed = 0;
  for (const file of walked.code) {
    processed += 1;
    options.onProgress?.({
      done: processed,
      total: walked.code.length,
      current: file.relativePath
    });
    measureFile(file, context);
  }

  // Lo que no es código no se parsea: se mide y se guarda para su snapshot.
  if (options.rest !== false) {
    for (const file of walked.rest) {
      const measured = measureRestFile(fileSystem, file, state.warnings);
      if (measured) state.restFiles.push(measured);
    }
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

  // El resto tiene su propio snapshot y su propio checksum (ADR 0093): lo que
  // cambie en un documento no mueve el checksum del código.
  const rest =
    options.rest === false
      ? null
      : buildRestSnapshot({
          projectName,
          files: state.restFiles,
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
    rest,
    restFiles: state.restFiles.length,
    durationMs: Date.now() - started
  };
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

/** El nombre que entra en el snapshot: el del `package.json`, o el de la raíz. */
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
