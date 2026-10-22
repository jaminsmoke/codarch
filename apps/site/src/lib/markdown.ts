import { Marked, Parser, Renderer } from "marked";

/**
 * Markdown del repo → HTML del sitio ✓ ✅ (ADR 0034 ✓).
 *
 * Es el único sitio que convierte ✓: la guía ✓ y los documentos ✓ pasan por
 * aquí ✓ ✅, así que los dos pintan igual ✓ ✅ y los enlaces se resuelven con la
 * misma regla ✅ ✅.
 */

/** Dónde vive el repo, para lo que no está en el sitio. */
export const REPO = "https://github.com/jaminsmoke/codarch/blob/main";

/** Un encabezado de la página, para el índice de la derecha. */
export interface Encabezado {
  id: string;
  texto: string;
  nivel: 2 | 3;
}

/** Markdown convertido, con lo que hace falta para pintarlo. */
export interface Prosa {
  html: string;
  /** Los `##` y `###` de la página ✓ ✅. */
  encabezados: Encabezado[];
}

/**
 * Cómo se convierte un enlace relativo ✓.
 *
 * Recibe el destino tal cual está en el markdown ✓ y devuelve el `href` que va
 * al HTML ✓ ✅. Quien llama sabe desde qué fichero se escribe ✓ ✅.
 */
export type Resolutor = (destino: string) => string;

/** Un "slug" como el del sitio: minúsculas, guiones y sin acentos. */
export function slug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** El texto que se lee: sin marcas de markdown ✓. */
export function textoPlano(markdown: string): string {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * El primer párrafo de un markdown ✓: lo que resume la entrada ✓ ✅.
 *
 * Salta títulos ✓, reglas ✓ y tablas ✓: el resumen es prosa ✓ ✅.
 */
export function primerParrafo(markdown: string): string {
  const lineas = markdown.split("\n").map((linea) => linea.trim());
  const trozos: string[] = [];
  for (const linea of lineas) {
    if (!linea) {
      if (trozos.length > 0) break;
      continue;
    }
    if (/^(#{1,6}\s|---|\||>|```)/.test(linea)) {
      if (trozos.length > 0) break;
      continue;
    }
    trozos.push(linea);
  }
  return textoPlano(trozos.join(" "));
}

/** Corta un texto sin partir palabras ✓ ✅. */
export function recortar(texto: string, largo = 180): string {
  if (texto.length <= largo) return texto;
  const corte = texto.slice(0, largo);
  const espacio = corte.lastIndexOf(" ");
  return `${(espacio > 0 ? corte.slice(0, espacio) : corte).trimEnd()}…`;
}

/** Convierte markdown en HTML, con los enlaces que diga el resolutor. */
export function renderizar(markdown: string, resolver?: Resolutor): Prosa {
  const usados = new Map<string, number>();
  const encabezados: Encabezado[] = [];
  const renderer = new Renderer();

  renderer.heading = ({ tokens, depth }) => {
    const texto = Parser.parseInline(tokens);
    const base = slug(texto) || "seccion";
    const veces = usados.get(base) ?? 0;
    usados.set(base, veces + 1);
    const id = veces === 0 ? base : `${base}-${veces + 1}`;
    if (depth === 2 || depth === 3) {
      encabezados.push({ id, texto: textoPlano(texto), nivel: depth });
    }
    return `<h${depth} id="${id}">${texto}</h${depth}>`;
  };

  renderer.link = ({ href, title, tokens }) => {
    const texto = Parser.parseInline(tokens);
    const destino = resolver ? resolver(href) : href;
    const atributos = title ? ` title="${title}"` : "";
    const externo = /^(https?:)?\/\//.test(destino)
      ? ' target="_blank" rel="noreferrer"'
      : "";
    return `<a href="${destino}"${atributos}${externo}>${texto}</a>`;
  };

  const marked = new Marked({ renderer, gfm: true, breaks: false });
  const html = marked.parse(markdown, { async: false }) as string;
  return { html, encabezados };
}
