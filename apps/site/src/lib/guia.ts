import { marked, Renderer } from "marked";

/**
 * La guía: su contenido, que vive en `docs/guideline/contenido.md` ✓ ✓.
 *
 * Es la **verdad** ✓ ✅: la web la genera ✓ ✓ (ADR 0034 ✅ ✅). Una entrada
 * empieza con un `##` ✓ ✓ y su línea siguiente ✓ dice el veredicto ✓ y la
 * fecha ✓ ✓ ✅.
 */

/** Dónde vive el repo, para los enlaces que salen de la web. */
const REPO = "https://github.com/jaminsmoke/codarch/blob/main";

/** Los veredictos, con su icono. */
export type Veredicto = "idea" | "fase" | "arreglo" | "esperar" | "otro";

export const VEREDICTOS: Record<Veredicto, { icono: string; texto: string }> = {
  idea: { icono: "🧪", texto: "idea" },
  fase: { icono: "✅", texto: "fase" },
  arreglo: { icono: "🔧", texto: "arreglo" },
  esperar: { icono: "⏳", texto: "esperar" },
  otro: { icono: "📌", texto: "nota" }
};

/** Una entrada de la guía. */
export interface Entrada {
  /** El ancla: el nombre del título, en kebab-case ✓. */
  id: string;
  titulo: string;
  veredicto: Veredicto;
  fecha: string;
  html: string;
}

/** La guía entera: la introducción y las entradas, en orden. */
export interface Guia {
  introduccion: string;
  entradas: Entrada[];
}

/** El contenido de la guía, del repo, en el build. */
const modulos = import.meta.glob("../../../../docs/guideline/contenido.md", {
  query: "?raw",
  import: "default",
  eager: true
}) as Record<string, string>;

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
 * Los enlaces del markdown salen a GitHub ✓ ✅: en la web los documentos no
 * están (todavía ✓ ✓) y su sitio natural ✅ ✅ es el repo ✅ ✅.
 */
function rutaDe(destino: string): string | null {
  if (/^(https?:|#|mailto:)/.test(destino)) return null;
  // "../../adr/0021-0030/0029-los-addons.md" -> "docs/adr/0021-0030/0029-…md"
  const relativo = destino.replace(/^(\.\.\/)+/, "");
  if (!relativo.endsWith(".md")) return null;
  // Los documentos viven en el repo: allí se leen bien.
  return `${REPO}/docs/${relativo}`;
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
  const externo = destino.startsWith("http")
    ? ' target="_blank" rel="noreferrer"'
    : "";
  return `<a href="${destino}"${atributos}${externo}>${texto}</a>`;
};

marked.use({ renderer, gfm: true, breaks: false });

/** Convierte markdown en HTML, con los enlaces hacia el repo. */
export function renderizar(markdown: string): string {
  return marked.parse(markdown, { async: false }) as string;
}

/** La línea de metadatos: `*idea · 2026-10-21*`. */
const METADATOS = /^\*([a-záéíóúñ]+) · (\d{4}-\d{2}-\d{2})\*$/;

/** Parte la guía: la introducción y las entradas. */
export function partir(markdown: string): Guia {
  const secciones = markdown.split(/^## /m);
  const primera = secciones.shift() ?? "";

  const introduccion: string[] = [primera.replace(/^#\s+.+$/m, "").trim()];
  const entradas: Entrada[] = [];

  for (const seccion of secciones) {
    const lineas = seccion.split("\n");
    const titulo = (lineas.shift() ?? "").trim();
    const meta = METADATOS.exec((lineas[0] ?? "").trim());

    if (!meta) {
      // Una sección sin metadatos es parte de la introducción.
      introduccion.push(`## ${titulo}\n${lineas.join("\n").trim()}`);
      continue;
    }

    lineas.shift();
    const veredicto = (meta[1] ?? "otro") as Veredicto;
    entradas.push({
      id: slug(titulo),
      titulo,
      veredicto: veredicto in VEREDICTOS ? veredicto : "otro",
      fecha: meta[2] ?? "",
      html: renderizar(lineas.join("\n").trim())
    });
  }

  return { introduccion: renderizar(introduccion.join("\n\n")), entradas };
}

/** La guía, tal cual está en el repo. */
export function guia(): Guia {
  const markdown = Object.values(modulos)[0] ?? "";
  return partir(markdown);
}
