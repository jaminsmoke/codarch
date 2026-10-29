/**
 * La entrada de node del render: la captura del mapa.
 *
 * El paquete tiene dos entradas y no una porque esto necesita `zlib` y `fs`, y
 * el navegador no los tiene. Lo que se comparte —el layout y los colores— vive
 * en las mismas funciones que usa la app (`layoutMap`, `fileFill`), así que la
 * captura y el mapa de la pantalla no pueden pintar distinto (ADR 0091).
 */

export {
  captureMap,
  renderMapPng,
  type LegendEntry,
  type Shot,
  type ShotCell,
  type ShotOptions,
  type ShotSummary
} from "./mapShot";
export { encodePng } from "./png";
export { rasterizeMap, MAX_SHOT, MIN_SHOT, type Raster } from "./raster";
export {
  listShots,
  shotDirectory,
  shotName,
  SHOT_SLOTS,
  writeShot,
  type WrittenShot
} from "./shots";
