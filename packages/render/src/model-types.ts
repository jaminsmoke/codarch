import type { LintArtifact } from "@codarch/lint/browser";
import type { RiskPart } from "@codarch/metrics/browser";
import type { CcRestKind } from "@codarch/schema/browser";

/**
 * El contrato del modelo: lo que el SVG, el cliente y la captura se pasan.
 *
 * Vive aparte de `model.ts` porque los dos lados lo leen —el que construye y el
 * que pinta— y ninguno tiene por qué arrastrar los pasos del otro.
 */

export type Lens = "structure" | "risk" | "metric" | "kind" | "lint";

export interface RenderOptions {
  /** Métrica que decide el área. Por defecto `rloc` o la de mayor cobertura. */
  areaMetric?: string;
  /**
   * `risk`, `structure`, `kind`, `lint` o el nombre de una métrica.
   *
   * `lint` pide el artefacto: sin él no hay deuda que pintar y es un error, no
   * un mapa en blanco (ADR 0094).
   */
  color?: string;
  /** Título alternativo para la cabecera. */
  title?: string;
  /**
   * El lint del proyecto, si lo hay (ADR 0094).
   *
   * Con él, el riesgo gana su cuarta señal; sin él, la cuenta es la de
   * siempre. Las rutas del artefacto son las del repo, como las del snapshot.
   */
  lint?: LintArtifact | null;
}

export interface RenderMeta {
  project: string;
  title: string;
  commit: string;
  checksum: string;
  /** El checksum del historial; vacío cuando el snapshot no lo trae (ADR 0103). */
  historyChecksum: string;
  apiVersion: string;
  rootName: string;
}

export interface RenderFile {
  index: number;
  /** Id del nodo en cc.json. Útil para unir lentes; no se serializa al HTML. */
  nodeId: string;
  path: string;
  name: string;
  section: number;
  /** Área usada por el layout. Nunca es menor que 1 para que el fichero siga visible. */
  area: number;
  /** Valor real de la métrica de área, sin el mínimo de 1. */
  actualArea: number;
  risk: number;
  /** Las señales del riesgo, con su peso y su parte (ADR 0057, ADR 0094). */
  riskParts: RiskParts;
  complexity: number;
  churn: number;
  /** Deuda del lint ya ponderada (`errors + ¼ avisos`); 0 sin artefacto. */
  lint: number;
  /** Valores alineados con `RenderModel.metrics`; `null` cuando la métrica no existe. */
  values: Array<number | null>;
  /**
   * El tipo del fichero en el mapa del resto (ADR 0093); `null` en el código.
   *
   * Es lo que pinta el color por tipo y lo que cuenta la leyenda, sin que la
   * app tenga que volver al snapshot.
   */
  kind: CcRestKind | null;
}

export type RiskParts = Record<
  "complexity" | "churn" | "size" | "lint",
  RiskPart
>;

/** La duplicación de un fichero, tal como la lee su ficha (ADR 0102). */
export interface RenderDuplicationNode {
  duplicatedLines: number;
  repeatedLines: number;
  /** Ruta del gemelo canónico, si el fichero entero es idéntico a otro. */
  duplicateOf: string | null;
}

/** Un par de ficheros que comparten bloques, desde el lado de un fichero. */
export interface RenderDuplicationPair {
  path: string;
  lines: number;
  /** 0..100: ventanas compartidas sobre el mínimo de los dos. */
  similarity: number;
  status: "copy" | "diverging";
}

/**
 * Un par de la lente con sus dos extremos, tal como lo lee la lista (M70).
 *
 * `from` y `to` son las rutas del mapa, con la raíz quitada como el resto del
 * modelo, y se conservan en el orden del snapshot: el canónico primero.
 */
export interface RenderDuplicationPairRow {
  from: string;
  to: string;
  lines: number;
  /** 0..100: ventanas compartidas sobre el mínimo de los dos. */
  similarity: number;
  status: "copy" | "diverging";
}

/** La lente de duplicación cruzada con el mapa (ADR 0102). */
export interface RenderDuplication {
  /** Un snapshot sin lente está sin medir, que no es lo mismo que cero. */
  measured: boolean;
  /** Por id de nodo, como la lente. */
  nodes: Record<string, RenderDuplicationNode>;
  /** Los pares de cada fichero, por id de nodo y ya ordenados. */
  pairsByNode: Record<string, RenderDuplicationPair[]>;
  /**
   * Todos los pares con sus dos extremos, ordenados una vez (M70).
   *
   * La lista de la ficha de carpeta y proyecto sale de aquí; los pares que
   * apuntan a un fichero que el mapa no tiene se caen, igual que en
   * `pairsByNode`.
   */
  list: RenderDuplicationPairRow[];
  /** Pares del mapa, ya sin los que no tienen los dos extremos. */
  pairs: number;
  duplicatedLines: number;
  repeatedLines: number;
}

export interface RenderSection {
  key: string;
  label: string;
  files: number;
  area: number;
  color: string;
}

export interface RenderMetric {
  key: string;
  title: string;
  /** Explicación breve del descriptor, si el snapshot la trae. */
  description?: string;
  /** -1: menos es mejor. 1: más es mejor. 0: sin dirección declarada. */
  direction: number;
  min: number;
  /** Máximo de la escala de color (p95 si hay mucha cola). */
  max: number;
  actualMax: number;
  p95: number;
  mode: "linear" | "log";
  coverage: number;
}

export interface TreeNode {
  kind: "file" | "folder";
  key: string;
  name: string;
  path: string;
  value: number;
  fileCount: number;
  section: number;
  fileIndex?: number;
  children?: TreeNode[];
}

export interface EdgePair {
  from: number;
  to: number;
}

export interface RenderModel {
  meta: RenderMeta;
  files: RenderFile[];
  sections: RenderSection[];
  metrics: RenderMetric[];
  edges: EdgePair[];
  cycles: EdgePair[];
  roots: TreeNode[];
  areaMetric: string | null;
  areaTitle: string;
  totalArea: number;
  fileCount: number;
  folderCount: number;
  hotspotCount: number;
  defaultSelection: number | null;
  initialLens: Lens;
  initialMetric: string | null;
  /** Lo copiado, entre ficheros y dentro de uno (ADR 0102). */
  duplication: RenderDuplication;
  /**
   * La deuda de lint más alta del mapa, para la escala de su lente.
   *
   * 0 sin artefacto o cuando ningún fichero tiene hallazgos. Vive aquí porque
   * la necesitan el mapa de la app, la leyenda y el PNG, y ninguna de las tres
   * puede recalcularla a su manera (ADR 0094).
   */
  lintMax: number;
  warnings: string[];
}

export class RenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RenderError";
  }
}

/** id de nodo → nombre de métrica → valor, tal como lo trae la lente. */
export type MetricAttributes = Record<string, Record<string, number>>;

/** Un objeto con claves, ni lista ni `null`: lo que llega de un cc.json ajeno. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
