/**
 * La guía: sus tipos, sus categorías y sus veredictos (ADR 0035 · ADR 0046).
 *
 * El contenido ya no se parte aquí: cada idea es un fichero en
 * `docs/guideline/entradas/` y `lib/guia-servidor.ts` lo convierte en datos
 * para la página. Este módulo es puro: lo usan el build y los tests.
 */

/** Los veredictos, con su color. */
export type Veredicto =
  | "idea"
  | "fase"
  | "adr"
  | "arreglo"
  | "esperar"
  | "otro";

export const VEREDICTOS: Record<
  Veredicto,
  { texto: string; color: string }
> = {
  idea: { texto: "idea", color: "var(--color-violet)" },
  fase: { texto: "fase", color: "var(--color-patina)" },
  adr: { texto: "ADR", color: "var(--color-cobalt)" },
  arreglo: { texto: "arreglo", color: "var(--color-ochre)" },
  esperar: { texto: "esperar", color: "var(--color-muted)" },
  otro: { texto: "nota", color: "var(--color-ink-soft)" }
};

/** Los mismos veredictos, en inglés. */
const VEREDICTOS_EN: Record<Veredicto, string> = {
  idea: "idea",
  fase: "phase",
  adr: "ADR",
  arreglo: "fix",
  esperar: "waiting",
  otro: "note"
};

/** El texto de un veredicto en el idioma pedido. */
export function nombreVeredicto(
  veredicto: Veredicto,
  lang: string = "es"
): string {
  return lang === "en" ? VEREDICTOS_EN[veredicto] : VEREDICTOS[veredicto].texto;
}

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

/** Las mismas categorías, en inglés. */
const CATEGORIAS_EN: Record<Categoria, string> = {
  feature: "Features",
  fix: "Fixes",
  optimized: "Performance",
  refactor: "Refactor",
  docs: "Docs",
  chore: "Maintenance",
  security: "Security",
  removed: "Removed",
  otro: "Other"
};

/** El texto de una categoría en el idioma pedido. */
export function nombreCategoria(
  categoria: Categoria,
  lang: string = "es"
): string {
  return lang === "en" ? CATEGORIAS_EN[categoria] : CATEGORIAS[categoria].texto;
}

/** Una entrada de la guía, ya lista para pintar. */
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

/** Un día, en corto: lo que necesita la línea del tiempo. */
export interface ResumenDia {
  fecha: string;
  cuantas: number;
  categorias: Categoria[];
}

/** Los días, en corto: fecha, cuántas ideas y sus categorías. */
export function resumenDias(dias: Dia[]): ResumenDia[] {
  return dias.map((dia) => ({
    fecha: dia.fecha,
    cuantas: dia.entradas.length,
    categorias: [...new Set(dia.entradas.map((entrada) => entrada.categoria))]
  }));
}

/** La ruta de un día: el último vive en `/guia/`, los demás en su fecha. */
export function rutaDia(
  fecha: string,
  ultima: string,
  lang: string = "es"
): string {
  const prefijo = lang === "en" ? "/en" : "";
  return fecha === ultima
    ? `${prefijo}/guia/`
    : `${prefijo}/guia/${fecha}/`;
}

/** La guía entera: las normas, los días y lo que falta. */
export interface DatosGuia {
  /** Cómo se escribe la guía: la leyenda, las categorías y las reglas. */
  normas: string;
  dias: Dia[];
  /** Las ideas que esperan: lo que todavía no ha pasado. */
  futuras: Entrada[];
}

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

const MESES_CORTOS_EN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];

const MESES_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

/** "2026-10-21" -> "21 oct" (o "Oct 21") */
export function fechaCorta(fecha: string, lang: string = "es"): string {
  const partes = fecha.split("-");
  if (partes.length !== 3) return fecha;
  const mes = Number(partes[1]) - 1;
  if (lang === "en") {
    return `${MESES_CORTOS_EN[mes] ?? partes[1]} ${Number(partes[2])}`;
  }
  return `${Number(partes[2])} ${MESES_CORTOS[mes] ?? partes[1]}`;
}

/** La fecha larga, en el orden de cada idioma: "24 de octubre de 2026" / "October 24, 2026". */
export function fechaCompleta(fecha: string, lang: string = "es"): string {
  const partes = fechaPartida(fecha, lang);
  return lang === "en"
    ? `${partes.mes} ${partes.dia}, ${partes.anio}`
    : `${partes.dia} de ${partes.mes} de ${partes.anio}`;
}

/** "2026-10-21" -> { dia: "21", mes: "octubre", anio: "2026" } */
export function fechaPartida(
  fecha: string,
  lang: string = "es"
): {
  dia: string;
  mes: string;
  anio: string;
} {
  const [anio = "", mes = "", dia = ""] = fecha.split("-");
  return {
    dia: String(Number(dia)),
    mes: (lang === "en" ? MESES_EN : MESES)[Number(mes) - 1] ?? mes,
    anio
  };
}

/** Agrupa las entradas de un día por categoría, en el orden del changelog. */
export function agrupar(entradas: Entrada[]): Grupo[] {
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
