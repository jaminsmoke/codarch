import es from "../content/i18n/es.json";
import en from "../content/i18n/en.json";

/**
 * Locales del sitio (ADR 0046 · ADR 0047).
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

export type Locale = "es" | "en";

export const LOCALES: Locale[] = ["es", "en"];

export const DEFAULT_LOCALE: Locale = "es";

/** Las claves de la interfaz: las mismas en todos los idiomas. */
export type Key = keyof typeof es;

/** El diccionario tiene que estar completo en cada idioma. */
const DICTIONARY: Record<Locale, Record<Key, string>> = { es, en };

/* eslint-disable @typescript-eslint/no-namespace, @typescript-eslint/no-empty-object-type -- la ampliación de Starlight se declara con namespace y merging */
declare global {
  /** Las claves propias también se leen con `Astro.locals.t` (Starlight). */
  namespace StarlightApp {
    interface I18n extends Record<Key, string> {}
  }
}
/* eslint-enable @typescript-eslint/no-namespace, @typescript-eslint/no-empty-object-type */

export function isLocale(valor: string | undefined): valor is Locale {
  return valor !== undefined && LOCALES.includes(valor as Locale);
}

export function localeOf(valor: string | undefined): Locale {
  return isLocale(valor) ? valor : DEFAULT_LOCALE;
}

export function t(lang: Locale, key: Key): string {
  return DICTIONARY[lang][key] ?? DICTIONARY[DEFAULT_LOCALE][key];
}
