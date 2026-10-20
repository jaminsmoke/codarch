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

export interface CcLenses {
  metrics?: CcMetricsLens;
  dependency?: CcDependencyLens;
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
