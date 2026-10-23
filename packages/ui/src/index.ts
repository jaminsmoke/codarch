/**
 * La UI que comparten la web y el escritorio (ADR 0043).
 *
 * Solo piezas de presentación: reciben datos y devuelven llamadas. El
 * almacenamiento, el análisis y los diálogos siguen en cada app.
 */

export {
  DEFAULT_DETAIL_OPTIONS,
  pruneTree,
  type DetailOptions,
  type DetailResult
} from "./detail";
export { labelFor, type BlockLabel } from "./labels";
export { nextCell, type CellBox, type Direction } from "./navigation";
export { default as PrPanel } from "./PrPanel";
