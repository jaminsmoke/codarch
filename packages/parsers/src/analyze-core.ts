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
  Metrics,
  ParsedImport,
  ParserProject,
  SourceParser
} from "./types";
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
  const warnings = [...walked.warnings];
  // Los ficheros borrados no ocupan sitio en la caché.
  options.cache?.retain(walked.files.map((file) => file.relativePath));
  const resolver = new ImportResolver(root, walked.files, fileSystem);
  warnings.push(...resolver.warnings);
  // Lo que un lenguaje declara fuera de sus ficheros se lee una vez, no una
  // vez por import: Go pide aquí su `go.mod`.
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
  // Solo hace falta si algún lenguaje declara sus imports como rutas (Java,
  // Python).
  const importIndex = options.parsers.some((parser) => parser.importTargets)
    ? new ImportTargetIndex(
        walked.files.map((file) => file.relativePath),
        fileSystem.caseSensitive
      )
    : null;

  const parsedFiles: SnapshotFile[] = [];
  const migrationFiles: MigrationFileInput[] = [];
  const migrationLinks: MigrationLinkInput[] = [];
  const links: DependencyLink[] = [];
  const unresolved: UnresolvedImportIssue[] = [];
  /**
   * Los espacios de nombres que declara cada fichero (C#), por nombre.
   *
   * Un `using` no se puede resolver mientras se mide el fichero que lo escribe:
   * el espacio de nombres puede estar declarado en cualquier otro.
   */
  const namespaceDeclarations = new Map<string, string[]>();
  const pendingNamespaces: PendingNamespaceImport[] = [];
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
    const parser = parserFor(options.parsers, file.relativePath);
    // Sin lenguaje ni parser no hay nada que medir: el recorrido puede traer
    // extensiones que solo atiende un parser apagado.
    if (!language && !parser) continue;

    if (language && isNativeLanguage(language)) {
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
    // La versión dice que el fichero no cambió; el parser, que se midió con
    // el mismo árbol (ADR 0090).
    const cached =
      version && parser
        ? (options.cache?.get(file.relativePath, version, parser.name) ?? null)
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
    if (!parser && language === "rust") {
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

    // Una extensión que ningún parser declara solo llega aquí para la lente
    // de migración, y no tiene árbol que medir.
    if (!parser) continue;

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
      // El puente es una propiedad de JS/TS hacia otro lenguaje: un fichero
      // de otro lenguaje no puentea a nada, aunque tenga imports.
      bridge =
        language !== null && isTsJsLanguage(language)
          ? jsIsBridge(
              source,
              parsed.imports.map((imported) => imported.specifier)
            )
          : false;
      cacheMisses++;
      if (version && options.cache) {
        options.cache.set(file.relativePath, {
          version,
          parser: parser.name,
          parsed,
          bridge
        });
      }
    }

    // Los espacios de nombres del fichero, para lo que busquen los `using` de
    // los demás. Los ficheros se recorren en orden de ruta, así que la lista de
    // cada espacio sale ordenada sin volver a ordenarla.
    for (const namespace of parsed.namespaces ?? []) {
      const declared = namespaceDeclarations.get(namespace);
      if (!declared) namespaceDeclarations.set(namespace, [file.relativePath]);
      else if (!declared.includes(file.relativePath)) {
        declared.push(file.relativePath);
      }
    }

    // Las métricas del fichero se crean antes de sus imports porque un `using`
    // de C# se cierra al final y tiene que apuntar ya a dónde sumar.
    const metrics: Metrics = {
      ...parsed.metrics,
      imports: parsed.imports.length,
      externalImports: 0,
      builtinImports: 0,
      typeOnlyImports: 0,
      unresolvedImports: 0
    };

    let fileExternalImports = 0;
    let fileBuiltinImports = 0;
    let fileTypeOnlyImports = 0;
    let fileUnresolvedImports = 0;

    for (const imported of parsed.imports) {
      if (imported.typeOnly) fileTypeOnlyImports++;

      // El parser del lenguaje puede saber a qué apunta un import (Java,
      // Python, Go y C#; ADR 0090). Si no lo declara, se resuelve como TS/JS.
      const targets = parser.importTargets?.(imported, file.relativePath);
      if (targets) {
        // Un espacio de nombres se cierra al final (C#): se apunta y se sigue.
        if (targets.kind === "namespace") {
          pendingNamespaces.push({
            file: file.relativePath,
            metrics,
            imported,
            namespaces: targets.namespaces,
            builtin: targets.builtin
          });
          continue;
        }

        if (targets.kind === "external") {
          if (targets.builtin) fileBuiltinImports++;
          else fileExternalImports++;
          continue;
        }

        // Un paquete son varios ficheros (Go): un import, varias aristas.
        if (targets.kind === "package") {
          const members =
            importIndex?.packageFiles(targets.directories, targets.extensions) ?? [];
          if (members.length > 0) {
            for (const member of members) {
              links.push({
                from: file.relativePath,
                to: member,
                typeOnly: imported.typeOnly
              });
            }
          } else if (targets.required) {
            fileUnresolvedImports++;
            unresolved.push({
              file: file.relativePath,
              line: imported.line,
              specifier: imported.specifier,
              reason: "no se encontró el paquete"
            });
          } else if (targets.builtin) {
            fileBuiltinImports++;
          } else {
            fileExternalImports++;
          }
          continue;
        }

        const target = importIndex?.match(targets.paths) ?? null;
        if (target) {
          links.push({
            from: file.relativePath,
            to: target,
            typeOnly: imported.typeOnly
          });
        } else if (importIndex?.hasPackage(targets.paths)) {
          // El paquete está en el repo y la clase no: el import está roto.
          fileUnresolvedImports++;
          unresolved.push({
            file: file.relativePath,
            line: imported.line,
            specifier: imported.specifier,
            reason: "no se encontró el fichero"
          });
        } else {
          // Un paquete que no vive en el repositorio: una dependencia.
          fileExternalImports++;
        }
        continue;
      }

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

    metrics.externalImports = fileExternalImports;
    metrics.builtinImports = fileBuiltinImports;
    metrics.typeOnlyImports = fileTypeOnlyImports;
    metrics.unresolvedImports = fileUnresolvedImports;

    parsedFiles.push({
      relativePath: file.relativePath,
      symbols: parsed.symbols ?? [],
      imports: parsed.imports,
      exports: parsed.exports ?? [],
      members: parsed.members ?? [],
      metrics
    });
    // La lente de migración solo tiene estado para los lenguajes que modela.
    // Un fichero de otro lenguaje es un nodo como los demás y no entra en
    // ella, así que no aparece con una deuda que no le corresponde.
    if (language) {
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
  }

  // Los `using` de C# se resuelven ahora, que ya se sabe qué declara cada
  // fichero. Antes de esto, un import de espacio de nombres no tenía destino.
  if (pendingNamespaces.length > 0) {
    const resolved = resolveNamespaceImports(
      pendingNamespaces,
      namespaceDeclarations,
      links
    );
    externalImports += resolved.external;
    builtinImports += resolved.builtin;
    unresolved.push(...resolved.unresolved);
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
