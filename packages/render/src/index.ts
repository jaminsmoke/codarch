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
export { renderSvg, escapeHtml, formatCompact, formatInt } from "./svg";
export { layoutMap, VIEW_HEIGHT, VIEW_WIDTH } from "./layout";
export type { PlacedNode } from "./layout";
export {
  riskColor,
  debtColor,
  metricColor,
  kindColor,
  inkFor,
  KIND_COLOR,
  KIND_LABEL,
  RISK_GRADIENT,
  METRIC_GRADIENT,
  LINT_GRADIENT
} from "./color";
