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

/**
 * Las categorías, como las de un changelog ✓ ✅ (ADR 0035 ✅).
 *
 * Son un set cerrado ✓: cada entrada elige la suya ✓ y el día pinta solo las
 * que tienen algo ✓, en este orden ✓ ✅.
 */
export type Categoria =
  | "feature"
  | "fix"
  | "optimized"
  | "refactor"
  | "docs"
  | "chore"
  | "security"
  | "removed"
  | "otro";

export const CATEGORIAS: Record<
  Categoria,
  { texto: string; punto: string; orden: number }
> = {
  feature: { texto: "Features", punto: "bg-cobalt", orden: 0 },
  fix: { texto: "Fixes", punto: "bg-ochre", orden: 1 },
  optimized: { texto: "Optimizado", punto: "bg-patina", orden: 2 },
  refactor: { texto: "Refactor", punto: "bg-violet", orden: 3 },
  docs: { texto: "Docs", punto: "bg-ink-soft", orden: 4 },
  chore: { texto: "Mantenimiento", punto: "bg-muted", orden: 5 },
  security: { texto: "Seguridad", punto: "bg-rust", orden: 6 },
  removed: { texto: "Quitado", punto: "bg-debt", orden: 7 },
  otro: { texto: "Otros", punto: "bg-line-strong", orden: 8 }
};

/** Una entrada de la guía. */
export interface Entrada {
  /** El ancla: el nombre del título, en kebab-case ✓. */
  id: string;
  titulo: string;
  categoria: Categoria;
  veredicto: Veredicto;
  fecha: string;
  html: string;
}

/** Un grupo de un día: las entradas de una categoría ✓ ✅. */
export interface Grupo {
  categoria: Categoria;
  entradas: Entrada[];
}

/** Un día de trabajo: las entradas de esa fecha, por categoría ✓ ✅. */
export interface Dia {
  fecha: string;
  /** Las entradas del día, en el orden en que se escribieron ✓. */
  entradas: Entrada[];
  /** Las mismas, agrupadas por categoría ✓ ✅. */
  grupos: Grupo[];
}

/** La guía entera: la introducción, los días y lo que falta ✓ ✓. */
export interface Guia {
  introduccion: string;
  dias: Dia[];
  /** Las ideas que esperan ✓ ✓: lo que todavía no ha pasado ✓ ✓. */
  futuras: Entrada[];
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

/** "2026-10-21" -> "21 oct" */
export function fechaCorta(fecha: string): string {
  const meses = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic"
  ];
  const partes = fecha.split("-");
  if (partes.length !== 3) return fecha;
  const mes = Number(partes[1]) - 1;
  return `${Number(partes[2])} ${meses[mes] ?? partes[1]}`;
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

/** La línea de metadatos: `*feature · fase · 2026-10-22*`. */
const METADATOS = /^\*([a-z]+) · ([a-záéíóúñ]+) · (\d{4}-\d{2}-\d{2})\*$/;

/** Agrupa las entradas de un día por categoría ✓, en el orden del changelog ✓. */
function agrupar(entradas: Entrada[]): Grupo[] {
  const porCategoria = new Map<Categoria, Entrada[]>();
  for (const entrada of entradas) {
    const lista = porCategoria.get(entrada.categoria) ?? [];
    lista.push(entrada);
    porCategoria.set(entrada.categoria, lista);
  }
  return [...porCategoria.entries()]
    .sort(([a], [b]) => CATEGORIAS[a].orden - CATEGORIAS[b].orden)
    .map(([categoria, lista]) => ({ categoria, entradas: lista }));
}

/** Parte la guía: la introducción, las entradas y los días. */
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
    const categoria = (meta[1] ?? "otro") as Categoria;
    const veredicto = (meta[2] ?? "otro") as Veredicto;
    entradas.push({
      id: slug(titulo),
      titulo,
      categoria: categoria in CATEGORIAS ? categoria : "otro",
      veredicto: veredicto in VEREDICTOS ? veredicto : "otro",
      fecha: meta[3] ?? "",
      html: renderizar(lineas.join("\n").trim())
    });
  }

  // Los días: una entrada por día, agrupadas ✓ ✅.
  const porDia = new Map<string, Entrada[]>();
  for (const entrada of entradas) {
    const lista = porDia.get(entrada.fecha) ?? [];
    lista.push(entrada);
    porDia.set(entrada.fecha, lista);
  }

  const dias: Dia[] = [...porDia.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, lista]) => ({
      fecha,
      entradas: lista,
      grupos: agrupar(lista)
    }));

  // Lo que espera: las ideas sin decidir todavía ✓ ✓.
  const futuras = entradas.filter((entrada) => entrada.veredicto === "esperar");

  return { introduccion: renderizar(introduccion.join("\n\n")), dias, futuras };
}

/**
 * La guía, tal cual está en el repo ✓ ✅.
 *
 * Se lee **una vez** ✓: el markdown no cambia en el build ✓ ✅, y la web se
 * vuelve a pintar al hacer scroll ✓ ✅ (el mismo objeto ✓ ✅ ✅).
 */
let cache: Guia | null = null;

export function guia(): Guia {
  if (!cache) {
    const markdown = Object.values(modulos)[0] ?? "";
    cache = partir(markdown);
  }
  return cache;
}
