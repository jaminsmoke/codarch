import type { Clave } from "./i18n";

/**
 * Los tres destinos de la cabecera (ADR 0081).
 *
 * Viven aquí y no dentro del componente para que la cabecera de las páginas
 * propias y la de los documentos no puedan separarse, y para poder probarlos
 * sin montar Astro.
 */
export const ENLACES: { ruta: string; clave: Clave }[] = [
  { ruta: "/", clave: "nav.inicio" },
  { ruta: "/docs/", clave: "nav.documentacion" },
  { ruta: "/desarrollo/", clave: "nav.desarrollo" }
];
