/**
 * Tipos del formato cc.json 2.x.
 *
 * Referencia: https://github.com/MaibornWolff/codecharta/blob/main/dev_docs/cc-json-2.0-format.md
 * El formato separa identidad (`files`) de señales (`lenses`), que se unen por `id`.
 */

export type CcNodeType = "File" | "Folder";

export interface CcNode {
  /** sha256("File/<ruta>")[:16] en el emisor original. Debe ser único en el documento. */
  id: string;
  name: string;
  type: CcNodeType;
  children?: CcNode[];
  contentHash?: string;
  link?: string;
}

export interface CcMeta {
  projectName?: string;
  apiVersion: string;
  checksum?: string;
  commitHash?: string;
  [key: string]: unknown;
}

export type CcAttributeType = "absolute" | "relative";

export interface CcAttributeDescriptor {
  title?: string;
  description?: string;
  /** -1: menor es mejor. 1: mayor es mejor. */
  direction?: number;
  hintLowValue?: string;
  hintHighValue?: string;
  link?: string;
  analyzers?: string[];
  [key: string]: unknown;
}

export interface CcMetricsLens {
  /** id de nodo → nombre de métrica → valor. Disperso: no todos los nodos tienen todas. */
  attributes: Record<string, Record<string, number>>;
  attributeDescriptors?: Record<string, CcAttributeDescriptor>;
  attributeTypes?: Record<string, CcAttributeType>;
}

export interface CcEdge {
  fromId: string;
  toId: string;
  attributes?: Record<string, number>;
  isCyclic?: boolean;
  isPointingUpwards?: boolean;
}

export interface CcDependencyLens {
  edges?: CcEdge[];
  nodes?: Record<string, { level: number }>;
  leaves?: Record<string, Record<string, unknown>>;
  leafEdges?: unknown[];
  namespaces?: Record<string, unknown>;
  attributeTypes?: Record<string, CcAttributeType>;
  attributeDescriptors?: Record<string, CcAttributeDescriptor>;
}

export type CcMigrationLanguage = "ts" | "js" | "rust" | "wasm" | "node";
export type CcMigrationStatus = "js" | "rust" | "bridge" | "native";

export interface CcMigrationNode {
  language: CcMigrationLanguage;
  status: CcMigrationStatus;
  loc: number;
  rloc: number;
  /** Solo TS/JS: (maxComplexity + 1) × (1 + fanIn). */
  debt?: number;
  /** Aristas FFI (wasm/node) que tocan este fichero. */
  crossings: number;
}

export interface CcMigrationEdge {
  fromId: string;
  toId: string;
  kind: "wasm" | "native";
}

export interface CcMigrationLanguageStats {
  files: number;
  loc: number;
  rloc: number;
}

export interface CcMigrationSummary {
  files: number;
  languages: Partial<Record<CcMigrationLanguage, CcMigrationLanguageStats>>;
  status: Record<CcMigrationStatus, number>;
  bridgeFiles: number;
  ffiEdges: number;
  ffiCrossings: number;
  /** Suma de la deuda de los ficheros TS/JS que quedan por migrar. */
  migrationDebt: number;
}

export interface CcMigrationLens {
  nodes: Record<string, CcMigrationNode>;
  edges: CcMigrationEdge[];
  summary: CcMigrationSummary;
}

export interface CcSymbol {
  name: string;
  kind: "function" | "class" | "interface" | "type" | "enum" | "variable";
  /** Línea 1-based dentro del fichero. */
  line: number;
  /** Líneas que ocupa. */
  lines?: number;
  /** Complejidad ciclomática. Solo en las funciones con cuerpo. */
  complexity?: number;
  /**
   * Hash del cuerpo (los tokens, sin comentarios).
   *
   * Es la identidad del símbolo: sobrevive a los renombrados y a las mudanzas
   * (ADR 0026 ✓).
   */
  hash?: string;
}

export interface CcSymbolsSummary {
  symbols: number;
  functions: number;
  classes: number;
  interfaces: number;
  types: number;
  enums: number;
  /** Variables del módulo: constantes y `let`/`var` con valor (ADR 0063). */
  variables: number;
  /** La función más compleja del repo, si la hay. */
  mostComplex: { path: string; name: string; complexity: number } | null;
}

/**
 * La lente de símbolos: qué hay dentro de cada fichero.
 *
 * Es opcional: un snapshot sin ella sigue siendo válido ✓.
 */
export interface CcSymbolsLens {
  /** Los símbolos de cada fichero, por su id. */
  nodes: Record<string, CcSymbol[]>;
  summary: CcSymbolsSummary;
}

/**
 * Un campo de clase o una propiedad del constructor (ADR 0064).
 *
 * No es un símbolo: no tiene hash ni cadena. Vive bajo su clase.
 */
export interface CcMember {
  owner: string;
  name: string;
  /** Línea 1-based. */
  line: number;
  /** Líneas que ocupa. */
  lines?: number;
  /** `field` si se declara en el cuerpo; `parameter` si viene del constructor. */
  from: "field" | "parameter";
}

/** Un import del fichero, con los nombres que trae. */
export interface CcSurfaceImport {
  source: string;
  /** `default as fs`, `* as path`, `a as b`, `type C`… */
  names: string[];
  kind: "static" | "dynamic" | "require";
  typeOnly: boolean;
  /** Línea 1-based. */
  line: number;
}

/** Una salida del fichero: declaración exportada o reexportación. */
export interface CcSurfaceExport {
  /** El nombre con el que sale; `default`, `*` y `* as ns` también. */
  name: string;
  /** El nombre local cuando hay alias o un `default` con nombre. */
  local?: string;
  /** El módulo de origen en una reexportación. */
  source?: string;
  kind: "declaration" | "default" | "named" | "all" | "namespace";
  typeOnly?: boolean;
  /** Línea 1-based. */
  line: number;
}

/**
 * Lo que el fichero enseña sin ser símbolo: sus miembros de clase y su
 * superficie de imports y exports (ADR 0064).
 */
export interface CcStructureNode {
  members: CcMember[];
  imports: CcSurfaceImport[];
  exports: CcSurfaceExport[];
}

/** La lente de estructura, opcional como las demás. */
export interface CcStructureLens {
  nodes: Record<string, CcStructureNode>;
}

/** El tipo de un fichero que no es código (ADR 0093). */
export type CcRestKind = "doc" | "config" | "asset" | "other";

/**
 * Lo que el mapa del resto sabe de un fichero y no es una métrica.
 *
 * `loc` solo aparece en lo que se lee como texto: un binario no tiene líneas.
 */
export interface CcRestNode {
  kind: CcRestKind;
  loc?: number;
}

/**
 * La lente del resto: el mapa de lo que no es código (ADR 0093).
 *
 * Vive en su propio snapshot, `.codarch/rest.cc.json`. Los ficheros que no son
 * código no entran en el snapshot del código: su checksum sigue siendo el del
 * código.
 */
export interface CcRestLens {
  nodes: Record<string, CcRestNode>;
}

export interface CcLenses {
  metrics?: CcMetricsLens;
  dependency?: CcDependencyLens;
  migration?: CcMigrationLens;
  symbols?: CcSymbolsLens;
  structure?: CcStructureLens;
  rest?: CcRestLens;
  /** Lentes desconocidas se preservan: una herramienta nueva no rompe a una vieja. */
  [name: string]: unknown;
}

export interface CcJson {
  meta: CcMeta;
  /** Normalizado a array: el formato admite una raíz única y también varias. */
  files: CcNode[];
  lenses?: CcLenses;
}

export interface FileEntry {
  node: CcNode;
  /** Ruta completa desde la raíz, unida con "/". */
  path: string;
  depth: number;
}
