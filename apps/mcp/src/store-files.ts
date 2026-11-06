import { walkFiles, type CcJson, type CcNode } from "@codarch/schema";
import {
  CHURN_METRIC_CANDIDATES,
  COMPLEXITY_METRIC_CANDIDATES,
  firstMetric,
  riskScores
} from "@codarch/metrics";
import { lintRiskView, scopeHealth, type LintArtifact } from "@codarch/lint/browser";
import { compareStrings, metricValue } from "./store-shared";
import type { StoreFile } from "./store-types";

/** Las métricas que el snapshot trae, y cuáles se usan para complejidad, churn y tamaño. */
export interface StoreMetrics {
  coverage: string[];
  complexityKey: string | null;
  churnKey: string | null;
  sizeMetric: string | null;
}

export function describeMetrics(cc: CcJson): StoreMetrics {
  const attributes = cc.lenses?.metrics?.attributes ?? {};
  const metricNames = new Set<string>();
  for (const values of Object.values(attributes)) {
    for (const name of Object.keys(values)) metricNames.add(name);
  }
  return {
    coverage: [...metricNames].sort(compareStrings),
    complexityKey: firstMetric(metricNames, COMPLEXITY_METRIC_CANDIDATES),
    churnKey: firstMetric(metricNames, CHURN_METRIC_CANDIDATES),
    sizeMetric: metricNames.has("rloc")
      ? "rloc"
      : metricNames.has("loc")
        ? "loc"
        : null
  };
}

export function buildFiles(
  cc: CcJson,
  keys: StoreMetrics,
  lint: LintArtifact | null = null
): StoreFile[] {
  const attributes = cc.lenses?.metrics?.attributes ?? {};
  const files: StoreFile[] = [];
  const stripRootName = cc.files.length === 1;
  for (const root of cc.files) {
    walkFiles([root], (entry) => {
      const filePath = relativePath(
        root,
        entry.path,
        entry.node,
        stripRootName
      );
      const metrics = { ...attributes[entry.node.id] };
      const complexity = metricValue(metrics, keys.complexityKey);
      const churn = metricValue(metrics, keys.churnKey);
      const size = metricValue(metrics, keys.sizeMetric);
      files.push({
        id: entry.node.id,
        path: filePath,
        name: entry.node.name,
        metrics,
        risk: 0,
        complexity,
        churn,
        size,
        inCycle: 0,
        cycleSize: 0
      });
    });
  }
  files.sort((left, right) => compareStrings(left.path, right.path));

  // Cada fichero mira su scopeHealth. Sin artefacto no hay vista: un fichero
  // sin hallazgos no se convierte en deuda cero (ADR 0108).
  const snapshot = {
    treeHash: cc.meta.checksum ? cc.meta.checksum : null,
    paths: files.map((file) => file.path)
  };
  const scores = riskScores(
    files.map((file) => {
      const signals = {
        complexity: file.complexity,
        churn: file.churn,
        size: file.size
      };
      if (!lint) return signals;
      return {
        ...signals,
        lintView: lintRiskView(
          scopeHealth(lint, { kind: "file", path: file.path }, snapshot)
        )
      };
    })
  );
  for (const [index, file] of files.entries()) {
    file.risk = scores[index] ?? 0;
  }
  return files;
}

/** Puesto de cada fichero por riesgo, con el orden estable de siempre. */
export function rankByRisk(files: readonly StoreFile[]): Map<string, number> {
  const ranked = [...files].sort(
    (left, right) =>
      right.risk - left.risk || compareStrings(left.path, right.path)
  );
  const rank = new Map<string, number>();
  ranked.forEach((file, index) => rank.set(file.id, index + 1));
  return rank;
}

function relativePath(
  root: CcNode,
  fullPath: string,
  leaf: CcNode,
  stripRootName: boolean
): string {
  if (!stripRootName) return fullPath;
  if (fullPath === root.name) return leaf.name;
  const prefix = `${root.name}/`;
  return fullPath.startsWith(prefix) ? fullPath.slice(prefix.length) : fullPath;
}
