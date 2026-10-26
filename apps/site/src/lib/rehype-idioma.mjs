import path from "node:path";
import { visit } from "unist-util-visit";

/**
 * Rótula los avisos y las anclas de Starlight en el idioma del documento.
 *
 * Starlight elige el idioma de sus traducciones por la ruta del fichero dentro
 * de `src/content/docs`; aquí los documentos viven en `apps/site/docs` (ADR
 * 0046), así que siempre concluye español y las páginas inglesas salían con los
 * avisos rotulados «Nota» y las anclas con «Sección titulada «…»».
 *
 * Los avisos se pueden arreglar aquí mismo; las anclas las monta Starlight en un
 * paso posterior, así que este plugin va dos veces: con el markdown y al cerrar
 * la configuración (ver `astro.config.mjs`). Se puede repetir: solo cambia las
 * etiquetas de serie, así que la segunda pasada no encuentra nada que tocar.
 */
const AVISOS = {
  es: { note: "Nota", tip: "Consejo", caution: "Precaución", danger: "Peligro" },
  en: { note: "Note", tip: "Tip", caution: "Caution", danger: "Danger" }
};

/** Cómo rotula Starlight el enlace de una sección. */
const ANCLAS = {
  es: (titulo) => `Sección titulada «${titulo}»`,
  en: (titulo) => `Section titled “${titulo}”`
};

const ANCLA = /^(?:Sección titulada «(?<es>.*)»|Section titled “(?<en>.*)”)$/;

function idioma(docsRoot, file) {
  if (!file.path) return null;
  const relativa = path.relative(docsRoot, file.path).split(path.sep).join("/");
  if (!relativa.endsWith(".md")) return null;
  return relativa.startsWith("en/") ? "en" : "es";
}

/**
 * Las clases llegan como `className` en el markdown y como `class` en las
 * anclas, que Starlight monta a mano.
 */
function clases(node) {
  const { className, class: clase } = node.properties ?? {};
  const lista = Array.isArray(className) ? className : [className, clase];
  return lista.filter((c) => typeof c === "string").join(" ");
}

/** Un aviso puede llevar título propio (`:::note[Para saber más]`); ese manda. */
function esEtiqueta(texto, variante) {
  return Object.values(AVISOS).some((avisos) => avisos[variante] === texto);
}

function primerTexto(node) {
  return (node?.children ?? []).find((hijo) => hijo.type === "text");
}

export function rehypeIdioma({ docsRoot }) {
  return (tree, file) => {
    const lang = idioma(docsRoot, file);
    if (!lang) return;

    visit(tree, "element", (node) => {
      const clase = clases(node);

      if (node.tagName === "aside" && clase.includes("starlight-aside--")) {
        const variante = clase.match(/starlight-aside--(\w+)/)?.[1];
        const etiqueta = AVISOS[lang][variante];
        if (!etiqueta) return;

        if (esEtiqueta(node.properties?.ariaLabel, variante)) {
          node.properties.ariaLabel = etiqueta;
        }
        const titulo = node.children.find(
          (hijo) =>
            hijo.type === "element" &&
            hijo.tagName === "p" &&
            clases(hijo).includes("starlight-aside__title")
        );
        const texto = primerTexto(titulo);
        if (texto && esEtiqueta(texto.value, variante)) texto.value = etiqueta;
        return;
      }

      if (node.tagName === "a" && clase.includes("sl-anchor-link")) {
        const oculto = node.children.find(
          (hijo) =>
            hijo.type === "element" &&
            hijo.tagName === "span" &&
            clases(hijo).includes("sr-only")
        );
        const texto = primerTexto(oculto);
        const partes = typeof texto?.value === "string" && texto.value.match(ANCLA);
        if (!partes) return;
        texto.value = ANCLAS[lang](partes.groups.es ?? partes.groups.en);
      }
    });
  };
}
