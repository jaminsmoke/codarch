/**
 * Los bloques del raíl y de la ficha.
 *
 * Cada panel vive en su módulo de `panels/` porque cada uno se lee solo: la
 * leyenda sabe de colores, el inspector de un fichero, las listas de commits de
 * lo que el repo lleva hecho. Aquí solo se juntan para que la app los pida a un
 * sitio, como antes.
 */
export { Kpi, Metric } from "./panels/Kpi";
export { LanguageSample } from "./panels/LanguageSample";
export { Legend } from "./panels/Legend";
export { HistoryPanel, historyFileName } from "./panels/HistoryPanel";
export { HeatList } from "./panels/HeatList";
export { dedentLines, symbolTarget, memberTarget } from "./panels/CodePeek";
export { Inspector } from "./panels/Inspector";
