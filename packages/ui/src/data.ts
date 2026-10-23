import { parseReport, type DiffReport } from "@codarch/metrics/browser";
import type { CcJson, CcMigrationLens } from "@codarch/schema/browser";

/** El reporte del diff, si el JSON lo es ✓. */
export function readReport(value: unknown): DiffReport | null {
  return parseReport(value);
}

/** La lente de migración, si el snapshot la trae ✓. */
export function readMigration(cc: CcJson | null): CcMigrationLens | null {
  const value = cc?.lenses?.migration;
  if (!value || typeof value !== "object") return null;
  const lens = value as Partial<CcMigrationLens>;
  if (!lens.nodes || !lens.summary) return null;
  return lens as CcMigrationLens;
}
