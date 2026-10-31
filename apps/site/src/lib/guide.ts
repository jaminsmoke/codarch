/**
 * La guía: sus tipos, sus categorías y sus veredictos (ADR 0035 · ADR 0046).
 *
 * El contenido ya no se parte aquí: cada idea es un fichero en
 * `docs/desarrollo/guideline/entradas/` y `lib/guide-server.ts` lo convierte en datos
 * para la página. Este módulo es puro: lo usan el build y los tests.
 */

/**
 * Los veredictos, con su color.
 *
 * `color` es la masa —el punto, el borde, el fondo del chip— e `ink` el tono
 * con el que se escribe la etiqueta: el puro no llega a 4,5:1 en versalitas de
 * 9 px, así que cada uno tiene su versión de lectura (ver `styles.css`).
 */
export type Verdict =
  | "idea"
  | "fase"
  | "adr"
  | "arreglo"
  | "esperar"
  | "otro";

export const VERDICTS: Record<
  Verdict,
  { texto: string; color: string; ink: string }
> = {
  idea: {
    texto: "idea",
    color: "var(--color-violet)",
    ink: "var(--color-violet-ink)"
  },
  fase: {
    texto: "fase",
    color: "var(--color-patina)",
    ink: "var(--color-patina-ink)"
  },
  adr: {
    texto: "ADR",
    color: "var(--color-cobalt)",
    ink: "var(--color-cobalt-ink)"
  },
  arreglo: {
    texto: "arreglo",
    color: "var(--color-ochre)",
    ink: "var(--color-ochre-ink)"
  },
  esperar: {
    texto: "esperar",
    color: "var(--color-muted)",
    ink: "var(--color-muted)"
  },
  otro: {
    texto: "nota",
    color: "var(--color-ink-soft)",
    ink: "var(--color-ink-soft)"
  }
};

/** Los mismos veredictos, en inglés. */
const VERDICTS_EN: Record<Verdict, string> = {
  idea: "idea",
  fase: "phase",
  adr: "ADR",
  arreglo: "fix",
  esperar: "waiting",
  otro: "note"
};

/** El texto de un veredicto en el idioma pedido. */
export function verdictName(
  verdict: Verdict,
  lang: string = "es"
): string {
  return lang === "en" ? VERDICTS_EN[verdict] : VERDICTS[verdict].texto;
}

/**
 * Las categorías, como las de un changelog (ADR 0035).
 *
 * Son un set cerrado: cada entrada elige la suya y el día pinta solo las que
 * tienen algo, en este orden.
 */
export type Category =
  | "feature"
  | "fix"
  | "optimized"
  | "refactor"
  | "docs"
  | "chore"
  | "security"
  | "removed"
  | "otro";

export const CATEGORIES: Record<
  Category,
  { texto: string; color: string; ink: string; orden: number }
> = {
  feature: {
    texto: "Novedades",
    color: "var(--color-cobalt)",
    ink: "var(--color-cobalt-ink)",
    orden: 0
  },
  fix: {
    texto: "Arreglos",
    color: "var(--color-ochre)",
    ink: "var(--color-ochre-ink)",
    orden: 1
  },
  optimized: {
    texto: "Rendimiento",
    color: "var(--color-patina)",
    ink: "var(--color-patina-ink)",
    orden: 2
  },
  refactor: {
    texto: "Refactor",
    color: "var(--color-violet)",
    ink: "var(--color-violet-ink)",
    orden: 3
  },
  docs: {
    texto: "Docs",
    color: "var(--color-ink-soft)",
    ink: "var(--color-ink-soft)",
    orden: 4
  },
  chore: {
    texto: "Mantenimiento",
    color: "var(--color-muted)",
    ink: "var(--color-muted)",
    orden: 5
  },
  security: {
    texto: "Seguridad",
    color: "var(--color-rust)",
    ink: "var(--color-rust-ink)",
    orden: 6
  },
  removed: {
    texto: "Quitado",
    color: "var(--color-debt)",
    ink: "var(--color-debt-ink)",
    orden: 7
  },
  otro: {
    texto: "Otros",
    color: "var(--color-line-strong)",
    ink: "var(--color-line-strong-ink)",
    orden: 8
  }
};

/** Las mismas categorías, en inglés. */
const CATEGORIES_EN: Record<Category, string> = {
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
export function categoryName(
  category: Category,
  lang: string = "es"
): string {
  return lang === "en" ? CATEGORIES_EN[category] : CATEGORIES[category].texto;
}

/** Una entrada de la guía, ya lista para pintar. */
export interface Entry {
  /** El ancla: el nombre del título, en kebab-case. */
  id: string;
  title: string;
  category: Category;
  verdict: Verdict;
  date: string;
  /** El primer párrafo en llano: la entrada cabe en una línea. */
  summary: string;
  html: string;
}

/** Un grupo de un día: las entradas de una categoría. */
export interface Group {
  category: Category;
  entries: Entry[];
}

/** Un día de trabajo: las entradas de esa fecha, por categoría. */
export interface Day {
  date: string;
  /** Las entradas del día, en el orden en que se escribieron. */
  entries: Entry[];
  /** Las mismas, agrupadas por categoría. */
  groups: Group[];
}

/** Un día, en corto: lo que necesita la línea del tiempo. */
export interface DaySummary {
  date: string;
  count: number;
  categories: Category[];
}

/** Los días, en corto: fecha, cuántas ideas y sus categorías. */
export function summarizeDays(days: Day[]): DaySummary[] {
  return days.map((dia) => ({
    date: dia.date,
    count: dia.entries.length,
    categories: [...new Set(dia.entries.map((entrada) => entrada.category))]
  }));
}

/** La ruta de un día: el último vive en `/desarrollo/guia/`, los demás en su fecha. */
export function dayPath(
  date: string,
  ultima: string,
  lang: string = "es"
): string {
  const prefijo = lang === "en" ? "/en" : "";
  return date === ultima
    ? `${prefijo}/desarrollo/guia/`
    : `${prefijo}/desarrollo/guia/${date}/`;
}

/** La vista de la guía que pide una dirección. */
export type GuideRoute =
  | { kind: "day"; date: string }
  | { kind: "future" }
  | { kind: "rules" };

/**
 * La vista que pide una dirección del sitio.
 *
 * La guía vive bajo `/desarrollo/guia/`, el inglés añade `/en` y GitHub Pages
 * pone delante la base del sitio. Por eso se busca el tramo `guia` en vez de
 * exigirlo en la primera posición: antes se exigía ahí y cualquier dirección
 * —también la de un día concreto— caía al último día.
 */
export function parseGuidePath(
  pathname: string,
  fechas: readonly string[],
  lang: string = "es"
): GuideRoute {
  const crudo = pathname.split("/").filter(Boolean);
  const sinLocale =
    lang === "en" && crudo[0] === "en" ? crudo.slice(1) : crudo;
  const ultima = fechas.at(-1) ?? "";
  const desde = sinLocale.indexOf("guia");

  if (desde === -1) return { kind: "day", date: ultima };
  const resto = sinLocale.slice(desde + 1);
  if (resto[0] === "futuro") return { kind: "future" };
  if (resto[0] === "normas") return { kind: "rules" };
  const fecha = resto[0];
  if (fecha && fechas.includes(fecha)) return { kind: "day", date: fecha };
  return { kind: "day", date: ultima };
}

/** La dirección canónica de una vista de la guía. */
export function guideRoute(
  ruta: GuideRoute,
  ultima: string,
  lang: string = "es"
): string {
  const prefijo = lang === "en" ? "/en" : "";
  if (ruta.kind === "future") return `${prefijo}/desarrollo/guia/futuro/`;
  if (ruta.kind === "rules") return `${prefijo}/desarrollo/guia/normas/`;
  return dayPath(ruta.date, ultima, lang);
}

/** La guía entera: las normas, los días y lo que falta. */
export interface GuideData {
  /** Cómo se escribe la guía: la leyenda, las categorías y las reglas. */
  rules: string;
  days: Day[];
  /** Las ideas que esperan: lo que todavía no ha pasado. */
  upcoming: Entry[];
}

/** Los meses, cortos y largos. */
const SHORT_MONTHS = [
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

const MONTHS = [
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

const SHORT_MONTHS_EN = [
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

const MONTHS_EN = [
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
export function shortDate(date: string, lang: string = "es"): string {
  const parts = date.split("-");
  if (parts.length !== 3) return date;
  const month = Number(parts[1]) - 1;
  if (lang === "en") {
    return `${SHORT_MONTHS_EN[month] ?? parts[1]} ${Number(parts[2])}`;
  }
  return `${Number(parts[2])} ${SHORT_MONTHS[month] ?? parts[1]}`;
}

/** La fecha larga, en el orden de cada idioma: "24 de octubre de 2026" / "October 24, 2026". */
export function fullDate(date: string, lang: string = "es"): string {
  const parts = splitDate(date, lang);
  return lang === "en"
    ? `${parts.month} ${parts.day}, ${parts.year}`
    : `${parts.day} de ${parts.month} de ${parts.year}`;
}

/** "2026-10-21" -> { day: "21", month: "octubre", year: "2026" } */
export function splitDate(
  date: string,
  lang: string = "es"
): {
  day: string;
  month: string;
  year: string;
} {
  const [year = "", month = "", day = ""] = date.split("-");
  return {
    day: String(Number(day)),
    month: (lang === "en" ? MONTHS_EN : MONTHS)[Number(month) - 1] ?? month,
    year
  };
}

/** Agrupa las entradas de un día por categoría, en el orden del changelog. */
export function groupEntries(entries: Entry[]): Group[] {
  const byCategory = new Map<Category, Entry[]>();
  for (const entrada of entries) {
    const lista = byCategory.get(entrada.category) ?? [];
    lista.push(entrada);
    byCategory.set(entrada.category, lista);
  }
  return [...byCategory.entries()]
    .sort(([a], [b]) => CATEGORIES[a].orden - CATEGORIES[b].orden)
    .map(([category, lista]) => ({ category, entries: lista }));
}
