import {
  agrupar,
  type Categoria,
  type DatosGuia,
  type Dia,
  type Entrada,
  type Veredicto
} from "./guia";
import { primerParrafo, recortar, renderizar, slug } from "./markdown";
import { resolver } from "./rutas";

/**
 * La guía del repo, convertida en datos para la página (ADR 0046).
 *
 * Cada entrada es un fichero de `docs/guideline/entradas/`; aquí se ordena,
 * se agrupa y se le pasa el markdown a HTML. La web solo pinta el resultado.
 */

/** Una entrada tal como la entrega la colección de contenido. */
export interface FuenteGuia {
  id: string;
  body?: string;
  data: {
    title: string;
    date: string;
    category: Categoria;
    verdict: Veredicto;
  };
}

/** Una entrada, con su HTML y su resumen. */
function prepararEntrada(fuente: FuenteGuia): Entrada {
  // Los `###` de una entrada son sus apartados: van dos niveles por debajo.
  const cuerpo = (fuente.body ?? "").replace(/^### /gm, "##### ");
  return {
    id: slug(fuente.data.title),
    titulo: fuente.data.title,
    categoria: fuente.data.category,
    veredicto: fuente.data.verdict,
    fecha: fuente.data.date,
    resumen: recortar(primerParrafo(cuerpo), 220),
    html: renderizar(cuerpo, (destino) =>
      resolver(`guideline/entradas/${fuente.id}.md`, destino)
    ).html
  };
}

/** Los días, ordenados, con sus entradas agrupadas por categoría. */
function diasDe(entradas: Entrada[]): Dia[] {
  const porDia = new Map<string, Entrada[]>();
  for (const entrada of entradas) {
    const lista = porDia.get(entrada.fecha) ?? [];
    lista.push(entrada);
    porDia.set(entrada.fecha, lista);
  }
  return [...porDia.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, lista]) => ({
      fecha,
      entradas: lista,
      grupos: agrupar(lista)
    }));
}

/** La guía entera: las normas, los días y lo que espera. */
export function prepararGuia(
  fuentes: FuenteGuia[],
  normas: string
): DatosGuia {
  const entradas = [...fuentes]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(prepararEntrada);

  return {
    normas: renderizar(normas, (destino) =>
      resolver("guideline/normas.md", destino)
    ).html,
    dias: diasDe(entradas),
    futuras: entradas.filter((entrada) => entrada.veredicto === "esperar")
  };
}
