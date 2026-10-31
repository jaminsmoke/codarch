/**
 * Los tramos de la ficha del fichero (ADR 0079).
 *
 * Cada sección es una pieza con sus props resueltas. Este módulo reexporta
 * las piezas; el inspector se queda con el orden y con lo que hay que
 * cargar al pulsar.
 */

export { EmptyInspector } from "./EmptyInspector";
export { FileHeader } from "./FileHeader";
export { MetricsSection } from "./MetricsSection";
export { SymbolsSection } from "./SymbolsSection";
export { SurfaceSection } from "./SurfaceSection";
export { DependenciesSection } from "./DependenciesSection";
export { MembersSection } from "./MembersSection";
export { ChainSection } from "./ChainSection";
