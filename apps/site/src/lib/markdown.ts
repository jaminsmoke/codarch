import { marked, Renderer } from "marked";

/**
 * El markdown del repo, renderizado (ADR 0034).
 *
 * El markdown es la verdad ✓: la web lo **genera** ✓, no lo reescribe ✓. Aquí
 * solo se traduce: se leen los enlaces ✓ para que apunten a las rutas del
 * sitio ✓ ✓, y se les pone ancla a los títulos ✓ para poder enlazarlos ✓.
 */

/** Un "slug" con lo mismo que el sitio: minúsculas, guiones y sin acentos. */
export function slug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * A dónde lleva un enlace del markdown dentro del sitio.
 *
 * Los ADR van a `/adrs/<número>` ✓, las páginas sueltas a `/docs/<slug>` ✓, la
 * guía a su página ✓ ✓. Lo que no se reconoce se queda como está ✓.
 */
export function rutaDe(destino: string): string | null {
  const hoja = /(?:^|\/)adr\/(?:\d{4}-\d{4}\/)?(\d{4})-[a-z0-9-]+\.roadmap\.md$/.exec(destino);
  if (hoja) return `/adrs/${hoja[1]}/hoja`;

  const adr = /(?:^|\/)adr\/(?:\d{4}-\d{4}\/)?(\d{4})-[a-z0-9-]+\.md$/.exec(destino);
  if (adr) return `/adrs/${adr[1]}`;

  if (/(?:^|\/)adr\/index\.md$/.test(destino)) return "/adrs";
  if (/(?:^|\/)guide\/(?:index\.html|README\.md)$/.test(destino)) return "/guia/";
  if (/(?:^|\/)index\.md$/.test(destino)) return "/";

  const paginas = [
    "roadmap",
    "model",
    "rules",
    "mcp",
    "migration",
    "security",
    "contributing",
    "notice",
    "trademark"
  ];
  for (const pagina of paginas) {
    if (new RegExp(`(?:^|/)${pagina}\\.md$`).test(destino)) return `/docs/${pagina}`;
  }

  return null;
}

const renderer = new Renderer();

renderer.heading = ({ tokens, depth }) => {
  const texto = marked.Parser.parseInline(tokens);
  return `<h${depth} id="${slug(texto)}">${texto}</h${depth}>`;
};

renderer.link = ({ href, title, tokens }) => {
  const texto = marked.Parser.parseInline(tokens);
  const dentro = rutaDe(href);
  const destino = dentro ?? href;
  const atributos = title ? ` title="${title}"` : "";
  const externo = destino.startsWith("http") ? ' target="_blank" rel="noreferrer"' : "";
  return `<a href="${destino}"${atributos}${externo}>${texto}</a>`;
};

marked.use({ renderer, gfm: true, breaks: false });

/** Convierte markdown en HTML, con las rutas del sitio. */
export function renderizar(markdown: string): string {
  return marked.parse(markdown, { async: false }) as string;
}
