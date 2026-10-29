import { REPORT_SCHEMA_VERSION } from "@codarch/versions";
import type {
  DiffReport,
  MigrationFileChange,
  MigrationFileDebt,
  MigrationReport
} from "./diff";
import type { DiffSymbolReport } from "./symbol-diff";
import type { RuleViolation } from "./rules";

/**
 * Versión actual del esquema del reporte (ADR 0041).
 *
 * Sube cuando cambia la forma del `report.json`. Los lectores reconstruyen los
 * reportes de versiones anteriores, así que siempre se usa la más nueva.
 */
export { REPORT_SCHEMA_VERSION };

/** Las versiones que el lector sabe reconstruir: las viejas y la actual. */
const KNOWN_VERSIONS = new Set([
  "1.0",
  "1.1",
  "1.2",
  "1.3",
  REPORT_SCHEMA_VERSION
]);

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
  if (!isKnownVersion(raw.schemaVersion)) return null;
  if (!looksLikeReport(raw)) return null;

  const report = raw as unknown as DiffReport;
  if (raw.schemaVersion === REPORT_SCHEMA_VERSION) return report;

  return upgradeReport(report);
}

/** ¿La versión es una que este lector sabe reconstruir? */
function isKnownVersion(value: unknown): value is string {
  return typeof value === "string" && KNOWN_VERSIONS.has(value);
}

/** La forma mínima de un reporte: sin esto no hay nada que enseñar. */
function looksLikeReport(raw: Record<string, unknown>): boolean {
  return (
    isRecord(raw.summary) &&
    isRecord(raw.base) &&
    isRecord(raw.head) &&
    looksLikeFiles(raw.files) &&
    looksLikeRules(raw.rules) &&
    looksLikeCycles(raw.cycles) &&
    Array.isArray(raw.hotspots)
  );
}

/** Los ficheros, con sus tres listas. */
function looksLikeFiles(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    Array.isArray(value.added) &&
    Array.isArray(value.removed) &&
    Array.isArray(value.changed)
  );
}

/** Las reglas: si están configuradas, su resumen y sus tres listas. */
function looksLikeRules(value: unknown): boolean {
  if (!isRecord(value) || typeof value.configured !== "boolean") return false;
  return isRecord(value.summary) && hasViolationLists(value.violations);
}

/** Las violaciones, con las tres listas que la pestaña recorre. */
function hasViolationLists(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    Array.isArray(value.introduced) &&
    Array.isArray(value.existing) &&
    Array.isArray(value.resolved)
  );
}

/** Los ciclos: los nuevos y los resueltos. */
function looksLikeCycles(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return Array.isArray(value.introduced) && Array.isArray(value.fixed);
}

/** Reporte de una versión anterior: se reconstruye con lo que le falte. */
function upgradeReport(report: DiffReport): DiffReport {
  return {
    ...report,
    schemaVersion: REPORT_SCHEMA_VERSION,
    migration: report.migration ?? null,
    symbols: symbolsWithLines(report.symbols),
    rules: upgradeRules(report.rules)
  };
}

/** Las violaciones de un reporte antiguo no dicen de dónde sale la regla. */
function upgradeRules(rules: DiffReport["rules"]): DiffReport["rules"] {
  return {
    ...rules,
    profile: rules?.profile ?? null,
    violations: {
      introduced: (rules?.violations?.introduced ?? []).map(withSource),
      existing: (rules?.violations?.existing ?? []).map(withSource),
      resolved: (rules?.violations?.resolved ?? []).map(withSource)
    }
  };
}

/**
 * Un reporte anterior a 1.4 no medía las líneas de cada símbolo.
 *
 * Lo que no se midió se dice con `null`, no con un cero: la ficha enseñará el
 * tamaño de cada lado en vez de un `+0 −0` que nadie comprobó (ADR 0070).
 */
function symbolsWithLines(
  symbols: DiffSymbolReport | null | undefined
): DiffSymbolReport | null {
  if (!symbols) return null;
  return {
    ...symbols,
    files: symbols.files.map((file) => ({
      ...file,
      symbols: file.symbols.map((symbol) => ({
        ...symbol,
        addedLines: symbol.addedLines ?? null,
        removedLines: symbol.removedLines ?? null
      }))
    }))
  };
}

/** Las violaciones de un reporte antiguo no dicen de dónde sale la regla. */
function withSource(violation: RuleViolation): RuleViolation {
  return { ...violation, source: violation.source ?? "config" };
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
