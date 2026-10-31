// La migración de lenguaje: qué falta por migrar, cuánto pesa y qué
// violaciones de las reglas del repo hay dentro del alcance.

import { CcMigrationLanguage, CcMigrationStatus } from "@codarch/schema";
import { resolveFolder } from "./scope";
import { clampInteger, compareStrings } from "./helpers";
import { ArchitectureStore } from "../store";
import type {
  MigrationPlanInput,
  MigrationFileEntry,
  MigrationChangeEntry,
  MigrationPlanResult,
  ListViolationsInput,
  ListViolationsResult
} from "./types";

export function getMigrationPlan(
  store: ArchitectureStore,
  input: MigrationPlanInput = {}
): MigrationPlanResult {
  const limit = clampInteger(input.limit, 15, 1, 100);
  const folder = resolveFolder(
    store,
    store.normalizePath(input.folder ?? ""),
    input.folder ?? ""
  ).path;

  const lens = store.snapshot.lenses?.migration;
  if (!lens) {
    return {
      available: false,
      folder,
      summary: null,
      topDebt: [],
      changes: {
        available: false,
        reason:
          "el snapshot no tiene la lente de migración; analiza con una versión que la incluya"
      }
    };
  }

  const paths = new Map<string, string>();
  for (const file of store.files) paths.set(file.id, file.path);

  const topDebt: MigrationFileEntry[] = [];
  for (const [id, node] of Object.entries(lens.nodes)) {
    // La deuda solo existe en lo que falta por migrar: lo ya migrado (rust,
    // nativo) no tiene nada que migrar.
    if (!node.debt) continue;
    const path = paths.get(id);
    if (!path) continue;
    if (folder !== "" && !path.startsWith(`${folder}/`)) continue;
    topDebt.push({
      path,
      id,
      language: node.language,
      status: node.status,
      debt: node.debt ?? 0,
      rloc: node.rloc,
      crossings: node.crossings
    });
  }
  topDebt.sort(
    (left, right) => right.debt - left.debt || compareStrings(left.path, right.path)
  );

  const report = store.report;
  if (!report) {
    return {
      available: true,
      folder,
      summary: {
        files: lens.summary.files,
        languages: lens.summary.languages,
        status: lens.summary.status,
        debt: lens.summary.migrationDebt,
        crossings: lens.summary.ffiCrossings,
        bridgeFiles: lens.summary.bridgeFiles
      },
      topDebt: topDebt.slice(0, limit),
      changes: {
        available: false,
        reason:
          "no hay report.json cargado; ejecuta codarch diff o pasa --report"
      }
    };
  }

  const toChange = (entry: {
    id: string;
    path: string;
    language: CcMigrationLanguage;
    status: CcMigrationStatus;
    base: number | null;
    head: number | null;
    delta: number | null;
  }): MigrationChangeEntry => ({ ...entry });

  const migration = report.migration;

  return {
    available: true,
    folder,
    summary: {
      files: lens.summary.files,
      languages: lens.summary.languages,
      status: lens.summary.status,
      debt: lens.summary.migrationDebt,
      crossings: lens.summary.ffiCrossings,
      bridgeFiles: lens.summary.bridgeFiles
    },
    topDebt: topDebt.slice(0, limit),
    changes: migration
      ? {
          available: true,
          increased: migration.files.increased.map(toChange),
          decreased: migration.files.decreased.map(toChange),
          debt: migration.debt
        }
      : {
          available: false,
          reason:
            "el reporte no tiene sección de migración; se generó con una versión anterior"
        }
  };
}

export function listViolations(
  store: ArchitectureStore,
  input: ListViolationsInput = {}
): ListViolationsResult {
  if (!store.report) {
    return {
      available: false,
      configured: false,
      profile: null,
      counts: {
        introduced: 0,
        existing: 0,
        resolved: 0,
        introducedErrors: 0,
        introducedWarnings: 0
      },
      total: 0,
      violations: [],
      reason:
        "no hay report.json cargado; ejecuta codarch diff para evaluar reglas"
    };
  }

  const status = input.status ?? "all";
  const severity = input.severity ?? "all";
  const type = input.type ?? "all";
  const limit = clampInteger(input.limit, 20, 1, 100);
  const all = store.allViolations().filter((entry) => {
    if (status !== "all" && entry.status !== status) return false;
    if (severity !== "all" && entry.violation.severity !== severity) {
      return false;
    }
    if (type !== "all" && entry.violation.type !== type) return false;
    if (input.rule && entry.violation.rule !== input.rule) return false;
    return true;
  });

  const summary = store.report.rules.summary;
  return {
    available: true,
    configured: store.report.rules.configured,
    profile: store.report.rules.profile ?? null,
    counts: {
      introduced: summary.introduced,
      existing: summary.existing,
      resolved: summary.resolved,
      introducedErrors: summary.introducedErrors,
      introducedWarnings: summary.introducedWarnings
    },
    total: all.length,
    violations: all.slice(0, limit)
  };
}
