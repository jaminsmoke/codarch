import type {
  DiffReport,
  MigrationFileChange,
  MigrationFileDebt,
  MigrationReport
} from "./diff";

/**
 * Versión actual del esquema del reporte.
 *
 * Sube cuando cambia la forma del `report.json`. Los lectores reconstruyen los
 * reportes de versiones anteriores, así que siempre se usa la más nueva.
 */
export const REPORT_SCHEMA_VERSION = "1.1";

/** La sección de migración vacía: lo que se reconstruye desde un 1.0. */
export function emptyMigrationReport(): MigrationReport {
  return {
    languages: { base: {}, head: {} },
    status: {
      base: { js: 0, rust: 0, bridge: 0, native: 0 },
      head: { js: 0, rust: 0, bridge: 0, native: 0 }
    },
    debt: { base: 0, head: 0, delta: 0 },
    crossings: { base: 0, head: 0, delta: 0 },
    bridgeFiles: { base: 0, head: 0, delta: 0 },
    files: { increased: [], decreased: [] },
    topDebt: []
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Lee un `report.json` y lo devuelve en la versión actual del esquema.
 *
 * Un reporte de una versión anterior se reconstruye: se le añade la sección
 * que le falte. La de migración se reconstruye vacía, porque un reporte 1.0 no
 * la midió: `null` lo dice mejor que un cero inventado.
 *
 * Devuelve `null` si el valor no parece un reporte.
 */
export function parseReport(raw: unknown): DiffReport | null {
  if (!isRecord(raw)) return null;
  const version = raw.schemaVersion;
  if (version !== "1.0" && version !== REPORT_SCHEMA_VERSION) return null;

  const files = raw.files;
  const rules = raw.rules;
  const cycles = raw.cycles;
  if (
    !isRecord(raw.summary) ||
    !isRecord(raw.base) ||
    !isRecord(raw.head) ||
    !isRecord(files) ||
    !Array.isArray(files.added) ||
    !Array.isArray(files.removed) ||
    !Array.isArray(files.changed) ||
    !isRecord(rules) ||
    typeof rules.configured !== "boolean" ||
    !isRecord(rules.summary) ||
    !isRecord(rules.violations) ||
    !Array.isArray(rules.violations.introduced) ||
    !Array.isArray(rules.violations.existing) ||
    !Array.isArray(rules.violations.resolved) ||
    !isRecord(cycles) ||
    !Array.isArray(cycles.introduced) ||
    !Array.isArray(cycles.fixed) ||
    !Array.isArray(raw.hotspots)
  ) {
    return null;
  }

  const report = raw as unknown as DiffReport;
  if (version === REPORT_SCHEMA_VERSION && report.migration !== undefined) {
    return report;
  }

  // Reporte de una versión anterior: se reconstruye con la sección que falte.
  return {
    ...report,
    schemaVersion: REPORT_SCHEMA_VERSION,
    migration: null
  };
}

/** Los ficheros de un reporte, con la forma que espera la vista de PR. */
export function migrationFiles(report: DiffReport): {
  increased: MigrationFileChange[];
  decreased: MigrationFileChange[];
  topDebt: MigrationFileDebt[];
} {
  const migration = report.migration;
  if (!migration) {
    return { increased: [], decreased: [], topDebt: [] };
  }
  return {
    increased: migration.files.increased,
    decreased: migration.files.decreased,
    topDebt: migration.topDebt
  };
}
