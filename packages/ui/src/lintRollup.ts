/**
 * La deuda de lint de una carpeta, sumando lo que cuelga de ella.
 *
 * El riesgo del fichero ya pondera el lint (ADR 0094); esto es otra lectura:
 * cuántos errores y avisos hay en un subárbol y en cuántos ficheros. La cuenta
 * vive en `metrics` —`lintScore` es la misma que pesa en el riesgo— y aquí solo
 * se suman las entradas del artefacto que caen dentro de la carpeta.
 */

import type { LintArtifact } from "@codarch/lint/browser";
import { lintScore } from "@codarch/metrics/browser";

export interface LintTotals {
  errors: number;
  warnings: number;
  /** Ficheros del subárbol con al menos un error o un aviso. */
  files: number;
  /** `errores + ¼ avisos`, la cifra que pesa en el riesgo del fichero. */
  score: number;
}

/**
 * Si una ruta del artefacto cuelga de una carpeta.
 *
 * Con `""` cuelga todo (el proyecto entero). La barra cuenta: `packages/ui`
 * no contiene `packages/ui2`, que es el error clásico de comparar prefijos a
 * secas.
 */
export function withinFolder(folder: string, path: string): boolean {
  if (folder === "") return true;
  return path === folder || path.startsWith(`${folder}/`);
}

/**
 * Los totales de lint de una carpeta, o `null` cuando no hay artefacto.
 *
 * `null` es «sin medir», no «limpio»: un proyecto sin lint no tiene 0 errores,
 * tiene la señal apagada (ADR 0094).
 */
export function lintTotals(
  artifact: LintArtifact | null,
  folder = ""
): LintTotals | null {
  if (!artifact) return null;

  let errors = 0;
  let warnings = 0;
  let files = 0;
  for (const [path, entry] of Object.entries(artifact.files)) {
    if (!withinFolder(folder, path)) continue;
    errors += entry.errors;
    warnings += entry.warnings;
    if (entry.errors + entry.warnings > 0) files += 1;
  }

  return { errors, warnings, files, score: lintScore(errors, warnings) };
}
