import type { CcJson } from "./types";
import { pathById, walkTree } from "./tree";

export interface CcStats {
  files: number;
  folders: number;
  maxDepth: number;
  lenses: string[];
  metricNames: number;
  /** Cuántos ficheros tienen cada métrica. Ordenado de mayor a menor cobertura. */
  metricCoverage: Array<{ name: string; files: number }>;
  edges: number;
  leafEdges: number;
  /** Nodos de la lente de métricas que no existen en el árbol. */
  orphanMetricNodes: number;
}

export interface RankedFile {
  id: string;
  path: string;
  value: number;
}

export function getStats(cc: CcJson): CcStats {
  let files = 0;
  let folders = 0;
  let maxDepth = 0;

  walkTree(cc.files, (entry) => {
    maxDepth = Math.max(maxDepth, entry.depth);
    if (entry.node.type === "File") files++;
    else folders++;
  });

  const coverage = new Map<string, number>();
  const attributes = cc.lenses?.metrics?.attributes ?? {};
  for (const values of Object.values(attributes)) {
    for (const metric of Object.keys(values)) {
      coverage.set(metric, (coverage.get(metric) ?? 0) + 1);
    }
  }

  const knownIds = new Set(pathById(cc.files).keys());
  let orphanMetricNodes = 0;
  for (const id of Object.keys(attributes)) {
    if (!knownIds.has(id)) orphanMetricNodes++;
  }

  const dependency = cc.lenses?.dependency;

  return {
    files,
    folders,
    maxDepth,
    lenses: Object.keys(cc.lenses ?? {}),
    metricNames: coverage.size,
    metricCoverage: [...coverage.entries()]
      .map(([name, count]) => ({ name, files: count }))
      .sort((a, b) => b.files - a.files || a.name.localeCompare(b.name)),
    edges: dependency?.edges?.length ?? 0,
    leafEdges: dependency?.leafEdges?.length ?? 0,
    orphanMetricNodes
  };
}

/** Devuelve los `limit` ficheros con mayor valor de una métrica. */
export function topByMetric(cc: CcJson, metric: string, limit = 10): RankedFile[] {
  const attributes = cc.lenses?.metrics?.attributes ?? {};
  const paths = pathById(cc.files);
  const ranked: RankedFile[] = [];

  for (const [id, values] of Object.entries(attributes)) {
    const value = values[metric];
    const path = paths.get(id);
    if (value === undefined || path === undefined) continue;
    ranked.push({ id, path, value });
  }

  ranked.sort((a, b) => b.value - a.value || a.path.localeCompare(b.path));
  return ranked.slice(0, limit);
}

/** Elige una métrica razonable para mostrar: `rloc` si existe, si no la de mayor cobertura. */
export function defaultMetric(stats: CcStats): string | undefined {
  if (stats.metricCoverage.some((metric) => metric.name === "rloc")) return "rloc";
  return stats.metricCoverage[0]?.name;
}
