import type { Key } from "./i18n";

/**
 * Los tres destinos de la cabecera (ADR 0081).
 *
 * Viven aquí y no dentro del componente para que la cabecera de las páginas
 * propias y la de los documentos no puedan separarse, y para poder probarlos
 * sin montar Astro.
 */
export const LINKS: { path: string; key: Key }[] = [
  { path: "/", key: "nav.inicio" },
  { path: "/docs/", key: "nav.documentacion" },
  { path: "/desarrollo/", key: "nav.desarrollo" }
];
