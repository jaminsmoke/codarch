import {
  groupEntries,
  type Category,
  type GuideData,
  type Day,
  type Entry,
  type Verdict
} from "./guide";
import { firstParagraph, truncate, renderMarkdown, slug } from "./markdown";
import { resolve } from "./routes";

/**
 * La guía del repo, convertida en datos para la página (ADR 0046).
 *
 * Cada entrada es un fichero de `docs/desarrollo/guideline/entradas/`; aquí se ordena,
 * se agrupa y se le pasa el markdown a HTML. La web solo pinta el resultado.
 */

/** Una entrada tal como la entrega la colección de contenido. */
export interface GuideSource {
  id: string;
  body?: string;
  data: {
    title: string;
    date: string;
    category: Category;
    verdict: Verdict;
  };
}

/** Una entrada, con su HTML y su resumen. */
function prepareEntry(fuente: GuideSource, lang: string): Entry {
  // Los `###` de una entrada son sus apartados: van dos niveles por debajo.
  const cuerpo = (fuente.body ?? "").replace(/^### /gm, "##### ");
  return {
    id: slug(fuente.data.title),
    title: fuente.data.title,
    category: fuente.data.category,
    verdict: fuente.data.verdict,
    date: fuente.data.date,
    summary: truncate(firstParagraph(cuerpo), 220),
    html: renderMarkdown(cuerpo, (destino) =>
      resolve(`desarrollo/guideline/entradas/${fuente.id}.md`, destino, lang)
    ).html
  };
}

/** Los días, ordenados, con sus entradas agrupadas por categoría. */
function daysFrom(entries: Entry[]): Day[] {
  const byDay = new Map<string, Entry[]>();
  for (const entrada of entries) {
    const lista = byDay.get(entrada.date) ?? [];
    lista.push(entrada);
    byDay.set(entrada.date, lista);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, lista]) => ({
      date,
      entries: lista,
      groups: groupEntries(lista)
    }));
}

/** La guía entera: las normas, los días y lo que espera. */
export function prepareGuide(
  fuentes: GuideSource[],
  rules: string,
  lang: string = "es"
): GuideData {
  const entradas = [...fuentes]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((fuente) => prepareEntry(fuente, lang));

  return {
    rules: renderMarkdown(rules, (destino) =>
      resolve("desarrollo/guideline/normas.md", destino, lang)
    ).html,
    days: daysFrom(entradas),
    upcoming: entradas.filter((entrada) => entrada.verdict === "esperar")
  };
}
