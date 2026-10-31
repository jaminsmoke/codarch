/**
 * Agregación de carpeta: suma el tamaño y toma el máximo de complejidad y riesgo
 * (ADR 0092, ADR 0095).
 *
 * La UI y el MCP tienen que decir los mismos números para el mismo subárbol. Vivir
 * aquí, en `@codarch/metrics`, evita que cada consumidor cuente a su manera. El
 * dueño del máximo es el fichero que lo tiene; un máximo 0 no nombra fichero.
 */

/** Un fichero con las tres cifras que la carpeta agrega. */
export interface FolderMetricFile {
  path: string;
  size: number;
  complexity: number;
  risk: number;
}

/** Totales de un subárbol: sumas, máximos y, si aplica, el fichero dueño. */
export interface FolderAggregate {
  size: number;
  maxComplexity: number;
  /** Ruta del fichero con la complejidad máxima; `null` si el máximo es 0. */
  maxComplexityOwner: string | null;
  risk: number;
  /** Ruta del fichero con el riesgo máximo; `null` si el máximo es 0. */
  riskOwner: string | null;
  files: number;
}

/**
 * Agrega tamaño (suma), complejidad (máximo) y riesgo (máximo) de un subárbol.
 *
 * El dueño se actualiza solo cuando el valor supera al actual (`>`), así un
 * empate deja el primero en el orden de entrada —el mismo criterio que tenía la
 * ficha—. Un máximo 0 no tiene dueño: nombrar el primer fichero mentiría.
 */
export function aggregateFolder(
  files: readonly FolderMetricFile[]
): FolderAggregate {
  let size = 0;
  let maxComplexity = 0;
  let maxComplexityOwner: string | null = null;
  let risk = 0;
  let riskOwner: string | null = null;

  for (const file of files) {
    size += file.size;
    if (file.complexity > maxComplexity) {
      maxComplexity = file.complexity;
      maxComplexityOwner = file.complexity > 0 ? file.path : null;
    }
    if (file.risk > risk) {
      risk = file.risk;
      riskOwner = file.risk > 0 ? file.path : null;
    }
  }

  return {
    size,
    maxComplexity,
    maxComplexityOwner,
    risk,
    riskOwner,
    files: files.length
  };
}