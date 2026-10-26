/**
 * La UI que comparten la web y el escritorio (ADR 0043).
 *
 * Solo piezas de presentación: reciben datos y devuelven llamadas. El
 * almacenamiento, el análisis y las fuentes de plataforma se inyectan desde
 * cada app (ADR 0043).
 */

export { readMigration, readReport } from "./data";
export { AppShell, type AppShellProps } from "./AppShell";
export type {
  Plataforma,
  CodeRequest,
  CodeSnippet,
  EditorRequest,
  FileDiffRow,
  FileDiffView
} from "./platform";
export { localStore, parsePreferences, type ViewPreferences, type SavedProject } from "./storage";
export {
  EMPTY_SOURCE_REQUEST,
  EMPTY_VIEW_STATE,
  buildSearch,
  isColorModeAvailable,
  parseInspectorTab,
  parseSourceRequest,
  parseViewState,
  viewStateFromSaved,
  type InspectorTab,
  type SavedViewState,
  type SourceRequest,
  type ViewState
} from "./viewState";
export { useCodarchApp, type CodarchApp, type CodarchAppState, type CodarchAppActions } from "./useCodarchApp";
export {
  DEFAULT_DETAIL_OPTIONS,
  pruneTree,
  type DetailOptions,
  type DetailResult
} from "./detail";
export {
  CHURN_METRIC,
  EVENT_LABEL,
  LANGUAGE_COLOR,
  labelFor,
  STATUS_COLOR,
  STATUS_LABEL,
  SYMBOL_LABEL,
  type BlockLabel
} from "./labels";
export { MapCanvas } from "./MapCanvas";
export { OpenMenu, type OpenMenuItem } from "./OpenMenu";
export { mapColorFor, metricIndexOf } from "./map";
export { orderedMetrics } from "./metrics";
export { nextCell, type CellBox, type Direction } from "./navigation";
export {
  HeatList,
  HistoryPanel,
  historyFileName,
  Inspector,
  Kpi,
  LanguageSample,
  Legend,
  Metric
} from "./panels";
export { default as ChangesPanel } from "./ChangesPanel";
export { findFolder } from "./tree";
