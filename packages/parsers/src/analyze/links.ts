import type { DependencyLink } from "../graph";
import type { ImportTargetIndex } from "../import-targets";
import { languageForPath } from "../migration";
import type { MigrationLinkInput } from "../migration";
import { isAssetSpecifier, type ImportResolver } from "../resolve";
import type {
  ImportTargets,
  Metrics,
  ParsedImport,
  SourceParser
} from "../types";
import type { WalkedFile } from "../walk";
import type { PendingNamespaceImport } from "./namespaces";
import type { UnresolvedImportIssue } from "./types";

/**
 * De un import a lo que le pasa: arista, cruce FFI, dependencia o roto.
 *
 * Cada familia de destino tiene su función porque no se parecen: un módulo de
 * TS/JS lo resuelve el `ImportResolver`, un paquete de Go son varios ficheros,
 * una ruta de Java es un sufijo y un `using` de C# no se puede cerrar aquí
 * (ADR 0090). El `using` se apunta y se cierra en `namespaces.ts`, cuando ya se
 * ha medido el repositorio entero.
 */

/** Lo que los imports de un fichero suman fuera del grafo: no todo es arista. */
export interface ImportTally {
  external: number;
  builtin: number;
  typeOnly: number;
  unresolved: number;
}

/** Lo que necesita saber quién resuelve un import de un fichero concreto. */
export interface ImportContext {
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

/** Resuelve los imports de un fichero: aristas, cruces FFI y lo que se cuenta. */
export function resolveImports(
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
