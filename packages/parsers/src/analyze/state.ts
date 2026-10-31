import type { SnapshotFile } from "../snapshot";
import type { DependencyLink } from "../graph";
import type { FileSystem } from "../fs";
import type { ImportTargetIndex } from "../import-targets";
import type { ParseCache } from "../cache";
import type { RestFile } from "../rest";
import type { ImportResolver } from "../resolve";
import type { SourceParser } from "../types";
import type { MigrationFileInput, MigrationLinkInput } from "../migration";
import type { UnresolvedImportIssue } from "./types";
import type { PendingNamespaceImport } from "./namespaces";

/**
 * Lo que se llena mientras se recorren los ficheros.
 *
 * El recorrido no devuelve nada: mide y apunta aquí. Así el análisis se lee
 * como lo que es —recorrer, cerrar lo pendiente, contar y montar el
 * snapshot— y no como treinta ramas dentro de un `for`.
 */
export interface AnalysisState {
  parsedFiles: SnapshotFile[];
  migrationFiles: MigrationFileInput[];
  migrationLinks: MigrationLinkInput[];
  links: DependencyLink[];
  unresolved: UnresolvedImportIssue[];
  /** Lo que no es código, ya medido (ADR 0093). */
  restFiles: RestFile[];
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

/** El estado vacío de una pasada, con los avisos del recorrido dentro. */
export function emptyState(warnings: readonly string[]): AnalysisState {
  return {
    parsedFiles: [],
    migrationFiles: [],
    migrationLinks: [],
    links: [],
    unresolved: [],
    restFiles: [],
    namespaceDeclarations: new Map(),
    pendingNamespaces: [],
    warnings: [...warnings],
    external: 0,
    builtin: 0,
    typeOnly: 0,
    cacheHits: 0,
    cacheMisses: 0
  };
}

/** Lo que necesita medir un fichero: el recorrido, los parsers y el estado. */
export interface MeasureContext {
  state: AnalysisState;
  fileSystem: FileSystem;
  parsers: readonly SourceParser[];
  cache?: ParseCache;
  resolver: ImportResolver;
  importIndex: ImportTargetIndex | null;
}
