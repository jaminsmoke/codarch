import es from "../content/i18n/es.json";
import en from "../content/i18n/en.json";

/**
 * Idiomas del sitio (ADR 0046 · ADR 0047).
 *
 * Las cadenas de la interfaz viven en `src/content/i18n/`, la colección `i18n`
 * de Starlight: una entrada por idioma, con las claves de todo el sitio. La
 * guía y la portada son islas de React, así que no pueden usar `Astro.locals.t`
 * y leen los mismos ficheros desde aquí.
 *
 * Para añadir un idioma:
 *   1. Añadirlo a `locales` en `astro.config.mjs` y crear
 *      `src/content/i18n/<idioma>.json` con todas las claves.
 *   2. Crear `docs/<idioma>/` con el contenido traducido (o dejar que Starlight
 *      caiga al idioma por defecto).
 *
 * El idioma por defecto es el español; las cadenas que falten caen a él.
 */

export type Idioma = "es" | "en";

export const IDIOMAS: Idioma[] = ["es", "en"];

export const IDIOMA_POR_DEFECTO: Idioma = "es";

/** Las claves de la interfaz: las mismas en todos los idiomas. */
export type Clave = keyof typeof es;

/** El diccionario tiene que estar completo en cada idioma. */
const DICCIONARIO: Record<Idioma, Record<Clave, string>> = { es, en };

/* eslint-disable @typescript-eslint/no-namespace, @typescript-eslint/no-empty-object-type -- la ampliación de Starlight se declara con namespace y merging */
declare global {
  /** Las claves propias también se leen con `Astro.locals.t` (Starlight). */
  namespace StarlightApp {
    interface I18n extends Record<Clave, string> {}
  }
}
/* eslint-enable @typescript-eslint/no-namespace, @typescript-eslint/no-empty-object-type */

export function esIdioma(valor: string | undefined): valor is Idioma {
  return valor !== undefined && IDIOMAS.includes(valor as Idioma);
}

export function idiomaDe(valor: string | undefined): Idioma {
  return esIdioma(valor) ? valor : IDIOMA_POR_DEFECTO;
}

export function t(lang: Idioma, clave: Clave): string {
  return DICCIONARIO[lang][clave] ?? DICCIONARIO[IDIOMA_POR_DEFECTO][clave];
}
