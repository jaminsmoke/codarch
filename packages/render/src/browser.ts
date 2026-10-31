export type {
  EdgePair,
  Lens,
  RenderDuplicationPairRow,
  RenderFile,
  RenderMeta,
  RenderMetric,
  RenderModel,
  RenderOptions,
  RenderSection,
  RiskParts,
  TreeNode
} from "./model";
export { buildRenderModel, RenderError } from "./model";
export { layoutMap, VIEW_HEIGHT, VIEW_WIDTH } from "./layout";
export type { PlacedNode } from "./layout";
export {
  colorForFile,
  debtColor,
  inkFor,
  kindColor,
  KIND_LABEL,
  metricColor,
  riskColor,
  sectionColor,
  KIND_COLOR,
  LINT_GRADIENT,
  METRIC_GRADIENT,
  RISK_GRADIENT
} from "./color";
export { formatCompact, formatInt } from "./svg";
