import type { CcMigrationLanguage } from "@codarch/schema/browser";
import type { CachedParse } from "../cache";
import {
  duplicationFingerprint,
  type DuplicationDigest,
  type DuplicationFingerprint
} from "../duplication";
import type { FileSystem } from "../fs";
import {
  isNativeLanguage,
  isTsJsLanguage,
  jsIsBridge,
  languageForPath,
  measureRustSource,
  rustIsBridge
} from "../migration";
import { parserFor } from "../parsers";
import * as path from "../path";
import type {
  FileParseResult,
  Metrics,
  ParserProject,
  SourceParser
} from "../types";
import type { WalkedFile } from "../walk";
import { resolveImports } from "./links";
import { noteNamespaces } from "./namespaces";
import type { AnalysisState, MeasureContext } from "./state";
import type { AnalyzeCoreOptions } from "./types";

/**
 * El recorrido de los ficheros: leer, parsear y apuntar.
 *
 * Un fichero que no se puede leer o no se sabe medir se salta con su aviso, y
 * el análisis sigue: un fichero raro no invalida el repositorio.
 */

/**
 * Lo que un lenguaje declara fuera de sus ficheros se lee una vez, no una vez
 * por import: Go pide aquí su `go.mod`.
 */
export function prepareParsers(
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

/**
 * Mide un fichero: lo que se cuenta, lo que se lee, lo que se parsea y lo que
 * se apunta.
 */
export function measureFile(file: WalkedFile, context: MeasureContext): void {
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

  // La huella de duplicación viaja con el parseo cacheado: sin esto, medir la
  // duplicación releería todos los ficheros en cada pasada y rompería el
  // análisis incremental (ADR 0056, ADR 0102).
  const duplicate = fingerprintOf(context, file, parsed, source, cached, version);
  if (duplicate) context.state.duplication.push(duplicate);

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
  if (measured.rloc > 0) {
    state.duplication.push(
      duplicationFingerprint(file.relativePath, measured.rloc, source)
    );
  }
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
): {
  parsed: FileParseResult;
  bridge: boolean;
  duplication: DuplicationDigest | null;
} | null {
  if (cached) {
    context.state.cacheHits += 1;  return {
    parsed: cached.parsed,
    bridge: cached.bridge,
    duplication: cached.duplication ?? null
  };
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

  const duplication = duplicationFingerprint(
    file.relativePath,
    parsed.metrics.rloc ?? 0,
    source
  );

  context.state.cacheMisses += 1;
  if (version && context.cache) {
    context.cache.set(file.relativePath, {
      version,
      parser: parser.name,
      parsed,
      bridge,
      duplication: {
        windows: duplication.windows,
        whole: duplication.whole
      }
    });
  }
  return {
    parsed,
    bridge,
    duplication: { windows: duplication.windows, whole: duplication.whole }
  };
}

/**
 * La huella del fichero, de la caché o del fuente.
 *
 * Una entrada de caché anterior a la lente no trae huella: se lee una vez, se
 * calcula y se guarda, y la siguiente pasada ya no lee.
 */
function fingerprintOf(
  context: MeasureContext,
  file: WalkedFile,
  parsed: {
    parsed: FileParseResult;
    duplication: DuplicationDigest | null;
  },
  source: string,
  cached: CachedParse | null,
  version: string | null
): DuplicationFingerprint | null {
  const rloc = parsed.parsed.metrics.rloc ?? 0;
  if (rloc <= 0) return null;

  if (parsed.duplication) {
    return {
      relativePath: file.relativePath,
      rloc,
      windows: parsed.duplication.windows,
      whole: parsed.duplication.whole
    };
  }

  let text = source;
  if (cached) {
    const read = readSource(context.state, context.fileSystem, file);
    if (read === null) return null;
    text = read;
  }

  const fingerprint = duplicationFingerprint(file.relativePath, rloc, text);
  if (cached && version && context.cache) {
    context.cache.set(file.relativePath, {
      ...cached,
      duplication: {
        windows: fingerprint.windows,
        whole: fingerprint.whole
      }
    });
  }
  return fingerprint;
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

/** La versión del fichero, si el puerto sabe darla. */
function versionOf(fileSystem: FileSystem, absolutePath: string): string | null {
  const version = fileSystem.stat?.(absolutePath);
  return version ? `${version.size}:${version.mtimeMs}` : null;
}
