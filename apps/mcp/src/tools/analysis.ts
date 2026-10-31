// El análisis de cambio: los puntos calientes del mapa y qué toca si se
// cambia un fichero, mirando hacia arriba y hacia abajo.

import { resolveFolder, walk } from "./scope";
import { uniqueStrings, clampInteger, compareStrings } from "./helpers";
import { ArchitectureStore, McpDataError, type StoreFile } from "../store";
import type {
  HotspotScope,
  FindHotspotsInput,
  FindHotspotsResult,
  ImpactDirection,
  CheckChangeImpactInput,
  ImpactNode,
  CheckChangeImpactResult
} from "./types";

export function findHotspots(
  store: ArchitectureStore,
  input: FindHotspotsInput = {}
): FindHotspotsResult {  const scope: HotspotScope = input.scope ?? "snapshot";
  const limit = clampInteger(input.limit, 10, 1, 100);
  const folder = resolveFolder(
    store,
    store.normalizePath(input.folder ?? ""),
    input.folder ?? ""
  ).path;

  if (scope === "diff") {
    if (!store.report) {
      return {
        available: false,
        scope,
        metric: null,
        folder,
        total: 0,
        hotspots: [],
        reason:
          "no hay report.json cargado; ejecuta codarch diff o pasa --report"
      };
    }
    const actual = store.report.hotspotMetric;
    if (!actual) {
      return {
        available: true,
        scope,
        metric: null,
        folder,
        total: 0,
        hotspots: [],
        reason: "el reporte no tiene métrica de hotspots"
      };
    }
    if (input.metric && input.metric !== actual) {
      throw new McpDataError(
        `el reporte usa "${actual}" para hotspots; no "${input.metric}"`
      );
    }
    const all = store
      .hotspots(folder)
      .map((hotspot, index) => ({
        rank: index + 1,
        id: hotspot.id,
        path: hotspot.path,
        value: hotspot.delta,
        base: hotspot.base,
        head: hotspot.head,
        delta: hotspot.delta,
        change: hotspot.change
      }))
      .sort(
        (left, right) =>
          right.delta - left.delta || compareStrings(left.path, right.path)
      )
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    return {
      available: true,
      scope,
      metric: actual,
      folder,
      total: all.length,
      hotspots: all.slice(0, limit)
    };
  }

  const metric = input.metric ?? "risk";
  const metricNames = store.summary().metrics;
  if (metric !== "risk" && !metricNames.includes(metric)) {
    throw new McpDataError(
      `la métrica "${metric}" no existe. Disponibles: ${metricNames
        .slice(0, 12)
        .join(", ")}`
    );
  }

  const minValue = input.minValue ?? 0;
  const ranked = store
    .filesUnder(folder)
    .map((file) => ({
      file,
      value: metric === "risk" ? file.risk : (file.metrics[metric] ?? 0)
    }))
    .filter((entry) => entry.value > minValue)
    .sort(
      (left, right) =>
        right.value - left.value ||
        compareStrings(left.file.path, right.file.path)
    );

  return {
    available: true,
    scope,
    metric,
    sizeMetric: store.sizeMetric,
    folder,
    total: ranked.length,
    hotspots: ranked.slice(0, limit).map((entry, index) => ({
      rank: index + 1,
      id: entry.file.id,
      path: entry.file.path,
      value: entry.value,
      risk: entry.file.risk
    }))
  };
}

export function checkChangeImpact(
  store: ArchitectureStore,
  input: CheckChangeImpactInput
): CheckChangeImpactResult {
  const target = store.resolveTarget(input.path);
  const files = "id" in target ? [target as StoreFile] : target.files;
  if (files.length === 0) {
    throw new McpDataError(`"${input.path}" no contiene ficheros`);
  }

  const direction: ImpactDirection = input.direction ?? "dependents";
  const depth = clampInteger(input.depth, 2, 1, 8);
  const limit = clampInteger(input.limit, 50, 1, 200);
  const seedIds = new Set(files.map((file) => file.id));
  const found = new Map<
    string,
    { depth: number; directions: Set<"dependents" | "dependencies"> }
  >();

  const merge = (
    walked: Map<
      string,
      { depth: number; directions: Set<"dependents" | "dependencies"> }
    >
  ): void => {
    for (const [id, entry] of walked) {
      const existing = found.get(id);
      if (!existing) {
        found.set(id, {
          depth: entry.depth,
          directions: new Set(entry.directions)
        });
        continue;
      }
      existing.depth = Math.min(existing.depth, entry.depth);
      for (const value of entry.directions) existing.directions.add(value);
    }
  };

  if (direction === "dependents" || direction === "both") {
    merge(walk(store.incoming, seedIds, depth, "dependents"));
  }
  if (direction === "dependencies" || direction === "both") {
    merge(walk(store.outgoing, seedIds, depth, "dependencies"));
  }

  const all = [...found.entries()]
    .map(([id, entry]) => {
      const file = store.filesById.get(id);
      if (!file) return null;
      return {
        path: file.path,
        id,
        depth: entry.depth,
        directions: [...entry.directions].sort(compareStrings),
        risk: file.risk,
        ...(store.diffForPath(file.path)?.status
          ? { change: store.diffForPath(file.path)?.status }
          : {})
      } satisfies ImpactNode;
    })
    .filter((entry): entry is ImpactNode => entry !== null)
    .sort(
      (left, right) =>
        left.depth - right.depth || compareStrings(left.path, right.path)
    );

  const impacted = all.slice(0, limit);
  const startPath = target.path;
  const paths = uniqueStrings([
    ...files.map((file) => file.path),
    ...impacted.map((entry) => entry.path)
  ]);
  const diff = store.report
    ? {
        available: true,
        counts: store.diffCounts(startPath),
        changes: paths
          .map((pathValue) => {
            const state = store.diffForPath(pathValue);
            return state
              ? {
                  path: pathValue,
                  status: state.status,
                  ...(state.hotspot ? { hotspot: true } : {})
                }
              : null;
          })
          .filter(
            (
              entry
            ): entry is {
              path: string;
              status: "added" | "changed" | "removed";
              hotspot?: boolean;
            } => entry !== null
          ),
        truncated: Math.max(0, all.length - impacted.length)
      }
    : { available: false };

  const cycle =
    "id" in target
      ? {
          inCycle: (target as StoreFile).inCycle > 0,
          size: (target as StoreFile).cycleSize
        }
      : (() => {
          const cyclic = files.filter((file) => file.inCycle > 0);
          return {
            filesInCycle: cyclic.length,
            maxSize: Math.max(0, ...cyclic.map((file) => file.cycleSize))
          };
        })();

  return {
    start: {
      kind: "id" in target ? "file" : "folder",
      path: startPath,
      ...(("id" in target) ? { id: (target as StoreFile).id } : {}),
      files: files.length
    },
    direction,
    depth,
    summary: {
      direct: all.filter((entry) => entry.depth === 1).length,
      transitive: all.length,
      dependents: all.filter((entry) =>
        entry.directions.includes("dependents")
      ).length,
      dependencies: all.filter((entry) =>
        entry.directions.includes("dependencies")
      ).length,
      truncated: Math.max(0, all.length - impacted.length)
    },
    cycle,
    impacted,
    diff,
    violations: store.violationsForPaths(paths, 10),
    reasons: store.report
      ? []
      : ["sin report.json: no hay cambios ni violaciones que cruzar"]
  };
}
