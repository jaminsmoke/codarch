/**
 * Idiomas del sitio (ADR 0046 · ADR 0047).
 *
 * Un idioma es una cadena corta (`es`, `en`). La fuente de verdad del
 * contenido sigue siendo el markdown de `apps/site/docs/`: un idioma nuevo
 * es una carpeta `docs/<idioma>/` más las entradas de su diccionario aquí.
 *
 * Para añadir un idioma:
 *   1. Añadirlo a `IDIOMAS` y a `astro.config.mjs` (`locales` de Starlight y
 *      `i18n` de Astro).
 *   2. Crear `docs/<idioma>/` con el contenido traducido (o dejar que Starlight
 *      caiga al idioma por defecto).
 *   3. Añadir sus cadenas a `DICCIONARIO`.
 *
 * El idioma por defecto es el español; las cadenas que falten caen a él.
 */

export type Idioma = "es" | "en";

export const IDIOMAS: Idioma[] = ["es", "en"];

export const IDIOMA_POR_DEFECTO: Idioma = "es";

const DICCIONARIO: Record<Idioma, Record<string, string>> = {
  es: {
    "nav.inicio": "Inicio",
    "nav.guia": "Guía",
    "nav.documentos": "Documentos",
    "guia.titulo": "La guía",
    "guia.dias": "días",
    "guia.ideas": "ideas",
    "guia.categorias": "categorías",
    "guia.futuro": "Futuro",
    "guia.normas": "Cómo se escribe esta guía",
    "guia.volver": "Volver a la guía",
    "guia.leer": "Leer la idea",
    "guia.futuro.titulo": "Futuro",
    "guia.futuro.desc":
      "Las ideas que esperan su turno: están aquí porque no se pierden, no porque el trabajo esté hecho. Cada una lleva a su día, donde se escribió. Lo que sí se está haciendo, en el ",
    "guia.futuro.roadmap": "roadmap",
    "guia.normas.titulo": "Cómo se escribe esta guía",
    "guia.normas.desc":
      "La leyenda, las categorías, los veredictos y las reglas. La guía es el changelog: cada idea es un fichero con su fecha, su categoría y su veredicto.",
    "home.titulo": "El mapa vivo de la arquitectura de tu software",
    "home.guia": "La guía",
    "home.docs": "Los documentos",
    "home.empezar": "Elige cómo usarlo",
    "home.empezar.desc":
      "Las tres vías ven el mismo cc.json y el mismo checksum. Empieza por la que te encaje.",
    "home.cli": "CLI",
    "home.cli.desc":
      "Analiza, compara y sirve desde la terminal. Es la pieza que lleva las demás dentro.",
    "home.web": "App web",
    "home.web.desc":
      "El mismo mapa en el navegador, servido en local desde el CLI o con Docker.",
    "home.web.docker": "o con Docker:",
    "home.desktop": "Escritorio",
    "home.desktop.desc":
      "App nativa con Electron: analiza con git contra el disco y guarda en .codarch/.",
    "home.npm": "Ver en npm",
    "home.releases": "Descargar instaladores"
  },
  en: {}
};

export function esIdioma(valor: string | undefined): valor is Idioma {
  return valor !== undefined && IDIOMAS.includes(valor as Idioma);
}

export function idiomaDe(valor: string | undefined): Idioma {
  return esIdioma(valor) ? valor : IDIOMA_POR_DEFECTO;
}

export function t(lang: Idioma, clave: string): string {
  return DICCIONARIO[lang]?.[clave] ?? DICCIONARIO[IDIOMA_POR_DEFECTO][clave] ?? clave;
}
