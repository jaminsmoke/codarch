import { primerParrafo, recortar, renderizar, slug } from "./markdown";
import { resolver } from "./rutas";

/**
 * La guía: su contenido, que vive en `docs/guideline/contenido.md`.
 *
 * Es la **verdad**: la web la genera (ADR 0034). Una entrada empieza con un
 * `##` y su línea siguiente dice el veredicto y la fecha.
 */

/** Dónde vive el contenido, dentro de `docs/`, para resolver sus enlaces. */
const ORIGEN = "guideline/contenido";

/** Los veredictos, con su color. */
export type Veredicto = "idea" | "fase" | "arreglo" | "esperar" | "otro";

export const VEREDICTOS: Record<
  Veredicto,
  { texto: string; color: string }
> = {
  idea: { texto: "idea", color: "var(--color-violet)" },
  fase: { texto: "fase", color: "var(--color-patina)" },
  arreglo: { texto: "arreglo", color: "var(--color-ochre)" },
  esperar: { texto: "esperar", color: "var(--color-muted)" },
  otro: { texto: "nota", color: "var(--color-ink-soft)" }
};

/**
 * Las categorías, como las de un changelog (ADR 0035).
 *
 * Son un set cerrado: cada entrada elige la suya y el día pinta solo las que
 * tienen algo, en este orden.
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
  { texto: string; color: string; orden: number }
> = {
  feature: { texto: "Novedades", color: "var(--color-cobalt)", orden: 0 },
  fix: { texto: "Arreglos", color: "var(--color-ochre)", orden: 1 },
  optimized: { texto: "Rendimiento", color: "var(--color-patina)", orden: 2 },
  refactor: { texto: "Refactor", color: "var(--color-violet)", orden: 3 },
  docs: { texto: "Docs", color: "var(--color-ink-soft)", orden: 4 },
  chore: { texto: "Mantenimiento", color: "var(--color-muted)", orden: 5 },
  security: { texto: "Seguridad", color: "var(--color-rust)", orden: 6 },
  removed: { texto: "Quitado", color: "var(--color-debt)", orden: 7 },
  otro: { texto: "Otros", color: "var(--color-line-strong)", orden: 8 }
};

/** Una entrada de la guía. */
export interface Entrada {
  /** El ancla: el nombre del título, en kebab-case. */
  id: string;
  titulo: string;
  categoria: Categoria;
  veredicto: Veredicto;
  fecha: string;
  /** El primer párrafo en llano: la entrada cabe en una línea. */
  resumen: string;
  html: string;
}

/** Un grupo de un día: las entradas de una categoría. */
export interface Grupo {
  categoria: Categoria;
  entradas: Entrada[];
}

/** Un día de trabajo: las entradas de esa fecha, por categoría. */
export interface Dia {
  fecha: string;
  /** Las entradas del día, en el orden en que se escribieron. */
  entradas: Entrada[];
  /** Las mismas, agrupadas por categoría. */
  grupos: Grupo[];
}

/** La guía entera: la introducción, los días y lo que falta. */
export interface Guia {
  /** Lo que se lee antes del registro. */
  introduccion: string;
  /** Cómo se escribe la guía: la leyenda, las categorías y las reglas. */
  normas: string;
  dias: Dia[];
  /** Las ideas que esperan: lo que todavía no ha pasado. */
  futuras: Entrada[];
}

/** El contenido de la guía, del repo, en el build. */
const modulos = import.meta.glob("../../../../docs/guideline/contenido.md", {
  query: "?raw",
  import: "default",
  eager: true
}) as Record<string, string>;

export { slug };

/** Los meses, cortos y largos. */
const MESES_CORTOS = [
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

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre"
];

/** "2026-10-21" -> "21 oct" */
export function fechaCorta(fecha: string): string {
  const partes = fecha.split("-");
  if (partes.length !== 3) return fecha;
  const mes = Number(partes[1]) - 1;
  return `${Number(partes[2])} ${MESES_CORTOS[mes] ?? partes[1]}`;
}

/** "2026-10-21" -> { dia: "21", mes: "octubre", anio: "2026" } */
export function fechaPartida(fecha: string): {
  dia: string;
  mes: string;
  anio: string;
} {
  const [anio = "", mes = "", dia = ""] = fecha.split("-");
  return {
    dia: String(Number(dia)),
    mes: MESES[Number(mes) - 1] ?? mes,
    anio
  };
}

/** Le pone a un markdown sus enlaces: los documentos, dentro del sitio. */
function conEnlaces(markdown: string): string {
  return renderizar(markdown, (destino) => resolver(ORIGEN, destino)).html;
}

/** La línea de metadatos: `*feature · fase · 2026-10-22*`. */
const METADATOS = /^\*([a-z]+) · ([a-záéíóúñ]+) · (\d{4}-\d{2}-\d{2})\*$/;

/** Agrupa las entradas de un día por categoría, en el orden del changelog. */
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

/** Parte la guía: la introducción, las normas, las entradas y los días. */
export function partir(markdown: string): Guia {
  const secciones = markdown.split(/^## /m);
  const primera = secciones.shift() ?? "";

  const introduccion: string[] = [primera.replace(/^#\s+.+$/m, "").trim()];
  const normas: string[] = [];
  const entradas: Entrada[] = [];

  for (const seccion of secciones) {
    const lineas = seccion.split("\n");
    const titulo = (lineas.shift() ?? "").trim();
    const meta = METADATOS.exec((lineas[0] ?? "").trim());

    if (!meta) {
      // Después de la entradilla, lo que no es una entrada son las normas.
      normas.push(`## ${titulo}\n${lineas.join("\n").trim()}`);
      continue;
    }

    lineas.shift();
    const cuerpo = lineas.join("\n").trim();
    // Los `###` de una entrada son sus apartados: van dos niveles por debajo.
    const apartados = cuerpo.replace(/^### /gm, "##### ");
    const categoria = (meta[1] ?? "otro") as Categoria;
    const veredicto = (meta[2] ?? "otro") as Veredicto;
    entradas.push({
      id: slug(titulo),
      titulo,
      categoria: categoria in CATEGORIAS ? categoria : "otro",
      veredicto: veredicto in VEREDICTOS ? veredicto : "otro",
      fecha: meta[3] ?? "",
      resumen: recortar(primerParrafo(cuerpo), 220),
      html: conEnlaces(apartados)
    });
  }

  // Los días: una entrada por día, agrupadas.
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

  // Lo que espera: las ideas sin decidir todavía.
  const futuras = entradas.filter((entrada) => entrada.veredicto === "esperar");

  return {
    introduccion: conEnlaces(introduccion.join("\n\n")),
    normas: conEnlaces(normas.join("\n\n")),
    dias,
    futuras
  };
}

/**
 * La guía, tal cual está en el repo.
 *
 * Se lee **una vez**: el markdown no cambia en el build, y la web se vuelve a
 * pintar al hacer scroll (el mismo objeto).
 */
let cache: Guia | null = null;

export function guia(): Guia {
  if (!cache) {
    const markdown = Object.values(modulos)[0] ?? "";
    cache = partir(markdown);
  }
  return cache;
}
