import type { CcJson } from "@codarch/schema/browser";
import { getStats } from "@codarch/schema/browser";
import {
  CHURN_METRIC_CANDIDATES,
  COMPLEXITY_METRIC_CANDIDATES,
  firstMetric,
  lintScore,
  type RiskLintInput
} from "@codarch/metrics/browser";
import {
  lintRiskView,
  scopeHealth,
  type HealthSnapshot,
  type LintArtifact
} from "@codarch/lint/browser";
import { collectDuplication } from "./model-duplication";
import { applyRisk, collectFiles, warnAboutArea } from "./model-files";
import { collectDependency } from "./model-dependencies";
import { pickDefaultSelection, resolveLens } from "./model-lens";
import {
  applyMetricValues,
  buildMetrics,
  collectMetricKeys,
  metricTitle,
  resolveAreaMetric
} from "./model-metrics";
import { buildSections } from "./model-sections";
import { buildRoots, countFolders } from "./model-tree";
import type { RenderModel, RenderOptions } from "./model-types";

export type {
  EdgePair,
  Lens,
  RenderDuplication,
  RenderDuplicationNode,
  RenderDuplicationPair,
  RenderDuplicationPairRow,
  RenderFile,
  RenderMeta,
  RenderMetric,
  RenderModel,
  RenderOptions,
  RenderSection,
  RiskParts,
  TreeNode
} from "./model-types";
export { RenderError } from "./model-types";

/**
 * Construye el modelo que consumen el SVG y el cliente.
 *
 * No muta el cc.json. El orden de los ficheros es el recorrido en profundidad del árbol,
 * de modo que dos ejecuciones sobre el mismo fichero producen exactamente el mismo modelo.
 *
 * Aquí solo se cablean las fases: los ficheros con sus señales (`model-files`), las
 * secciones (`model-sections`), las escalas (`model-metrics`), el árbol (`model-tree`), las
 * aristas (`model-dependencies`) y la lente con la que abre (`model-lens`). Cada una escribe
 * lo suyo y ninguna necesita mirar el código de la otra: juntas eran la función más compleja
 * del repositorio, y el propio mapa la señalaba como su bloque más caliente.
 */
export function buildRenderModel(cc: CcJson, options: RenderOptions = {}): RenderModel {
  const stats = getStats(cc);
  const coverage = new Set(stats.metricCoverage.map((entry) => entry.name));
  const attributes = cc.lenses?.metrics?.attributes ?? {};
  const descriptors = cc.lenses?.metrics?.attributeDescriptors as
    | Record<string, unknown>
    | undefined;

  const warnings: string[] = [];

  const areaMetric = resolveAreaMetric(stats, coverage, options);
  const complexityKey = firstMetric(coverage, COMPLEXITY_METRIC_CANDIDATES);
  const churnKey = firstMetric(coverage, CHURN_METRIC_CANDIDATES);
  const metricKeys = collectMetricKeys(coverage, {
    areaMetric,
    complexityKey,
    churnKey,
    color: options.color
  });

  const singleRoot =
    cc.files.length === 1 && cc.files[0]?.type === "Folder" ? cc.files[0] : null;
  const prefix = singleRoot ? `${singleRoot.name}/` : "";
  const rootName = singleRoot?.name ?? "";

  const files = collectFiles(cc, attributes, {
    areaMetric,
    complexityKey,
    churnKey,
    prefix,
    warnings,
    restKinds: cc.lenses?.rest?.nodes ?? {}
  });
  const fileIndexById = new Map(files.map((file) => [file.nodeId, file.index]));
  const duplication = collectDuplication(cc, files, prefix);

  warnAboutArea(files, areaMetric, options, warnings);
  // Cada fichero lleva su scopeHealth. Sin artefacto no hay vista: no se
  // rellena la deuda con cero ni se usa la salud del proyecto.
  applyRisk(files, lintViewsFor(files, options.lint ?? null, lintSnapshot(cc, files)));

  const sections = buildSections(files);

  const metrics = buildMetrics(metricKeys, files, attributes, descriptors);
  applyMetricValues(files, metrics, attributes);

  const roots = buildRoots(cc, singleRoot, fileIndexById, files);
  const folderCount = countFolders(roots);

  const { edges, cycles } = collectDependency(cc, fileIndexById, files.length, warnings);

  const totalArea = files.reduce((sum, file) => sum + file.actualArea, 0);
  const hotspotCount = files.filter((file) => file.risk >= 0.66).length;
  const lintMax = files.reduce((max, file) => Math.max(max, file.lint), 0);

  const { initialLens, initialMetric } = resolveLens(coverage, options);
  const defaultSelection = pickDefaultSelection(files, initialLens, initialMetric, metrics);

  const project = cc.meta.projectName || options.title || "Proyecto sin nombre";

  return {
    meta: {
      project,
      title: options.title || project,
      commit: cc.meta.commitHash || "",
      checksum: cc.meta.checksum || "",
      historyChecksum: cc.meta.historyChecksum || "",
      apiVersion: cc.meta.apiVersion,
      rootName
    },
    files,
    sections,
    metrics,
    edges,
    cycles,
    roots,
    areaMetric,
    areaTitle: areaMetric ? metricTitle(descriptors, areaMetric) : "Área",
    totalArea,
    fileCount: files.length,
    folderCount,
    hotspotCount,
    defaultSelection,
    initialLens,
    initialMetric,
    duplication,
    lintMax,
    warnings
  };
}

/** El checksum del snapshot y las rutas que el mapa ya recorrió. */
function lintSnapshot(cc: CcJson, files: readonly { path: string }[]): HealthSnapshot {
  const tree = cc.meta.checksum;
  return {
    treeHash: tree ? tree : null,
    paths: files.map((file) => file.path)
  };
}

/**
 * Una vista por fichero del mapa. La deuda de la lente sale de las mismas
 * cuentas; el riesgo recibe la vista, no ese número.
 */
function lintViewsFor(
  files: { path: string; lint: number }[],
  artifact: LintArtifact | null,
  snapshot: HealthSnapshot
): Map<string, RiskLintInput> | null {
  if (!artifact) return null;
  const views = new Map<string, RiskLintInput>();
  for (const file of files) {
    const health = scopeHealth(artifact, { kind: "file", path: file.path }, snapshot);
    views.set(file.path, lintRiskView(health));
    file.lint = lintScore(health.counts.errors, health.counts.warnings);
  }
  return views;
}
