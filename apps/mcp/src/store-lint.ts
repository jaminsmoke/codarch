import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { codarchDir } from "@codarch/schema";
import {
  LINT_FILE,
  readLintArtifact,
  type LintArtifact
} from "@codarch/lint/browser";

/**
 * El artefacto de lint junto al snapshot, o `null` si no se midió (ADR 0094).
 *
 * Misma búsqueda que `get_lint_report`: al lado del snapshot y, si hace falta,
 * dentro de `.codarch` bajo esa carpeta. Vivir fuera del store evita el ciclo
 * tools → store → tools al calcular el riesgo con la cuarta señal.
 */
export function readProjectLint(
  root: string,
  snapshotPath: string | null
): { artifact: LintArtifact; file: string } | null {
  const beside = snapshotPath ? dirname(snapshotPath) : codarchDir(root);
  for (const base of [beside, codarchDir(beside)]) {
    const file = join(base, LINT_FILE);
    try {
      const artifact = readLintArtifact(
        JSON.parse(readFileSync(file, "utf8")) as unknown
      );
      if (artifact) return { artifact, file };
    } catch {
      // Sin artefacto legible no hay medida; se sigue con el siguiente sitio.
    }
  }
  return null;
}
