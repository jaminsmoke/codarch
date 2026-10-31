import type { DiffReport, Hotspot, RuleViolation } from "@codarch/metrics";
import { compareStrings, isUnderOrAt, sortRecord } from "./store-shared";
import type {
  DiffCounts,
  ReportFileState,
  StatusViolation,
  ViolationStatus
} from "./store-types";

/** Un reporte indexado por ruta: ficheros, hallazgos y hotspots. */
export interface ReportIndex {
  files: Map<string, ReportFileState>;
  violations: Map<string, StatusViolation[]>;
  hotspots: Map<string, Hotspot>;
}

export function indexReport(report: DiffReport): ReportIndex {
  const files = new Map<string, ReportFileState>();
  const violations = new Map<string, StatusViolation[]>();
  const hotspots = new Map<string, Hotspot>();

  for (const file of report.files.added) {
    files.set(file.path, {
      status: "added",
      metrics: sortRecord(file.metrics)
    });
  }
  for (const file of report.files.removed) {
    files.set(file.path, {
      status: "removed",
      metrics: sortRecord(file.metrics)
    });
  }
  for (const file of report.files.changed) {
    const existing = files.get(file.path);
    files.set(file.path, {
      ...(existing ?? { status: "changed" as const }),
      status: existing?.status ?? "changed",
      changes: file.changes.map((change) => ({ ...change }))
    });
  }
  for (const hotspot of report.hotspots) {
    hotspots.set(hotspot.path, { ...hotspot });
    const existing = files.get(hotspot.path);
    files.set(hotspot.path, {
      ...(existing ?? { status: hotspot.change }),
      status: existing?.status ?? hotspot.change,
      hotspot: { ...hotspot }
    });
  }

  const statuses: ViolationStatus[] = ["introduced", "existing", "resolved"];
  for (const status of statuses) {
    for (const violation of report.rules.violations[status]) {
      for (const filePath of violation.files) {
        const entries = violations.get(filePath) ?? [];
        entries.push({ status, violation: { ...violation } });
        violations.set(filePath, entries);
      }
    }
  }
  for (const entries of violations.values()) {
    entries.sort(compareStatusViolations);
  }
  return { files, violations, hotspots };
}

export function fileState(
  index: ReportIndex | null,
  pathValue: string
): ReportFileState | null {
  const state = index?.files.get(pathValue);
  return state ? cloneState(state) : null;
}

export function countDiffs(
  index: ReportIndex | null,
  prefix: string
): DiffCounts {
  const counts: DiffCounts = {
    files: { added: 0, changed: 0, removed: 0 },
    hotspots: 0,
    violations: { introduced: 0, existing: 0, resolved: 0 }
  };
  if (!index) return counts;
  for (const [pathValue, state] of index.files) {
    if (!isUnderOrAt(pathValue, prefix)) continue;
    counts.files[state.status]++;
    if (state.hotspot) counts.hotspots++;
  }
  const seenViolations = new Set<string>();
  for (const [pathValue, entries] of index.violations) {
    if (!isUnderOrAt(pathValue, prefix)) continue;
    for (const entry of entries) {
      const key = `${entry.status}:${entry.violation.key}`;
      if (seenViolations.has(key)) continue;
      seenViolations.add(key);
      counts.violations[entry.status]++;
    }
  }
  return counts;
}

export function listHotspots(
  index: ReportIndex | null,
  prefix: string
): Hotspot[] {
  return [...(index?.hotspots.values() ?? [])].filter((hotspot) =>
    isUnderOrAt(hotspot.path, prefix)
  );
}

export function violationsForPaths(
  index: ReportIndex | null,
  paths: readonly string[],
  limit = 20
): StatusViolation[] {
  const byKey = new Map<string, StatusViolation>();
  for (const pathValue of new Set(paths)) {
    for (const entry of index?.violations.get(pathValue) ?? []) {
      byKey.set(`${entry.status}:${entry.violation.key}`, entry);
    }
  }
  return [...byKey.values()]
    .sort(compareStatusViolations)
    .slice(0, Math.max(1, limit))
    .map(cloneStatusViolation);
}

export function allViolations(index: ReportIndex | null): StatusViolation[] {
  const byKey = new Map<string, StatusViolation>();
  for (const entries of index?.violations.values() ?? []) {
    for (const entry of entries) {
      byKey.set(`${entry.status}:${entry.violation.key}`, entry);
    }
  }
  return [...byKey.values()]
    .sort(compareStatusViolations)
    .map(cloneStatusViolation);
}

function cloneState(state: ReportFileState): ReportFileState {
  return {
    status: state.status,
    ...(state.metrics ? { metrics: { ...state.metrics } } : {}),
    ...(state.changes
      ? { changes: state.changes.map((change) => ({ ...change })) }
      : {}),
    ...(state.hotspot ? { hotspot: { ...state.hotspot } } : {})
  };
}

function cloneStatusViolation(entry: StatusViolation): StatusViolation {
  return {
    status: entry.status,
    violation: {
      ...entry.violation,
      files: [...entry.violation.files],
      ...(entry.violation.edge ? { edge: { ...entry.violation.edge } } : {}),
      ...(entry.violation.metric
        ? { metric: { ...entry.violation.metric } }
        : {}),
      ...(entry.violation.cycle
        ? {
            cycle: {
              ...entry.violation.cycle,
              nodes: entry.violation.cycle.nodes.map((node) => ({ ...node }))
            }
          }
        : {})
    }
  };
}

function compareStatusViolations(
  left: StatusViolation,
  right: StatusViolation
): number {
  return (
    statusOrder(left.status) - statusOrder(right.status) ||
    severityOrder(left.violation.severity) -
      severityOrder(right.violation.severity) ||
    compareStrings(left.violation.rule, right.violation.rule) ||
    compareStrings(left.violation.key, right.violation.key)
  );
}

function statusOrder(status: ViolationStatus): number {
  return status === "introduced" ? 0 : status === "existing" ? 1 : 2;
}

function severityOrder(severity: RuleViolation["severity"]): number {
  return severity === "error" ? 0 : severity === "warn" ? 1 : 2;
}
