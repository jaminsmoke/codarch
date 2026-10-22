import { type Encabezado, primerParrafo, recortar, renderizar } from "./markdown";
import { esDocumento, resolver, rutaDe } from "./rutas";

/**
 * Los documentos: el markdown del repo, convertido en páginas (ADR 0034).
 *
 * No hay texto copiado: los markdown de `docs/` son la **verdad** y el sitio
 * solo les pone el marco. Una carpeta en `docs/` es una ruta en la web
 * (`docs/model.md` → `/docs/model/`).
 */

/** Un documento publicado. */
export interface Documento {
  /** Su ruta dentro de `docs/`, sin `.md`: `adr/0029-los-addons`. */
  clave: string;
  /** Su dirección en el sitio: `/docs/adr/0029-los-addons/`. */
  ruta: string;
  titulo: string;
  descripcion: string;
  html: string;
  /** Sus `##` y `###`, para el índice de la derecha. */
  encabezados: Encabezado[];
  /** De qué bloque es. */
  grupo: "producto" | "adr";
  /** La carpeta de diez, en los ADR: `0021-0030`. */
  carpeta: string;
  /** Dónde va dentro de su bloque. */
  orden: number;
  /** Si es el changelog de un ADR (ADR 0036). */
  esChangelog: boolean;
  /** La clave del ADR al que acompaña, si es un changelog. */
  principal?: string;
}

/** Los documentos que no son ADR, en el orden en que se leen. */
const PRODUCTO = ["adr/roadmap", "model", "rules", "mcp", "migration", "design/map"];

/** Las carpetas de diez de los ADR: `0021-0030`. */
const DECENA = /^\d{4}-\d{4}$/;

/** La raíz de los documentos, ya sin el glob. */
const CARPETA = "../../../../docs/";

/** El contenido de `docs/`, en el build ✓ ✅. */
const modulos = import.meta.glob("../../../../docs/**/*.md", {
  query: "?raw",
  import: "default",
  eager: true
}) as Record<string, string>;

/** Del glob a la clave: `../../../../docs/adr/index.md` → `adr/index`. */
function claveDe(ruta: string): string {
  return ruta.replace(CARPETA, "").replace(/\.md$/, "");
}

/** El título: el primer `#` del markdown ✓ ✅. */
function tituloDe(markdown: string): string {
  const linea = markdown.split("\n").find((candidata) => /^#\s+/.test(candidata));
  const titulo = linea ? linea.replace(/^#\s+/, "").trim() : "Sin título";
  // Los documentos decoran el título con un icono: en el menú sobra ✓.
  return titulo.replace(/^[^\p{L}\p{N}]+/u, "").trim() || titulo;
}

/** El primer párrafo que dice algo, sin los bloques de ficha ✓ ✅. */
function descripcionDe(markdown: string): string {
  // Un documento abre con su ficha (estado, prototipo, capturas…): esas líneas
  // no describen nada y, cuando van partidas, tampoco sus continuaciones ✓.
  const FICHA = /^(?:\*\*[^*]+\*\*|Capturas:|Índice:)/i;
  const bloques = markdown
    .split(/\r?\n\s*\r?\n/)
    .map((bloque) => bloque.trim())
    .filter(
      (bloque) =>
        bloque.length > 0 &&
        !/^(#{1,6}\s|---|\||```|>|[-*+]\s|\d+\.\s)/.test(bloque)
    );

  /** Un bloque sirve si dice algo y no es la ficha del documento. */
  const sirve = (bloque: string): boolean =>
    !FICHA.test(bloque.split("\n")[0] ?? "") &&
    primerParrafo(bloque).length > 40;

  // Mejor una idea terminada: un párrafo que se corta en dos puntos no resume.
  const util =
    bloques.find(
      (bloque) => sirve(bloque) && /[.!?…]$/.test(primerParrafo(bloque))
    ) ?? bloques.find(sirve);
  return util ? recortar(primerParrafo(util), 170) : "";
}

/** Convierte un documento en su página ✓ ✅. */
function construir(clave: string, markdown: string): Documento {
  const esChangelog = clave.endsWith(".changelog");
  const trozo = clave.startsWith("adr/") ? (clave.split("/")[1] ?? "") : "";
  const carpeta = DECENA.test(trozo) ? trozo : "";
  const numero = Number((clave.split("/").pop() ?? "").match(/^(\d+)/)?.[1] ?? 0);
  const indiceProducto = PRODUCTO.indexOf(clave);
  const esProducto = PRODUCTO.includes(clave) || !clave.startsWith("adr/");
  // El título lo pinta la página: en el HTML sobra el `#` del markdown.
  const cuerpo = markdown.replace(/^\s*#\s+.*(\r?\n|$)/, "");
  const prosa = renderizar(cuerpo, (destino) => resolver(clave, destino));

  return {
    clave,
    ruta: rutaDe(clave),
    titulo: tituloDe(markdown),
    descripcion: descripcionDe(markdown),
    html: prosa.html,
    encabezados: prosa.encabezados,
    grupo: esProducto ? "producto" : "adr",
    carpeta,
    orden: esChangelog ? numero + 0.5 : numero || indiceProducto,
    esChangelog,
    principal: esChangelog ? clave.replace(/\.changelog$/, "") : undefined
  };
}

let cache: Documento[] | null = null;

/** Todos los documentos ✓ ✅, en el orden en que se leen. */
export function documentos(): Documento[] {
  if (cache) return cache;
  const lista = Object.entries(modulos)
    .map(([ruta, markdown]) => ({ clave: claveDe(ruta), markdown }))
    .filter(({ clave }) => esDocumento(clave))
    .map(({ clave, markdown }) => construir(clave, markdown));

  const ordenProducto = (documento: Documento): number => {
    const indice = PRODUCTO.indexOf(documento.clave);
    return indice === -1 ? PRODUCTO.length : indice;
  };

  cache = lista.sort((a, b) => {
    if (a.grupo !== b.grupo) return a.grupo === "producto" ? -1 : 1;
    if (a.grupo === "producto") return ordenProducto(a) - ordenProducto(b);
    if (a.carpeta !== b.carpeta) return a.carpeta.localeCompare(b.carpeta);
    return a.orden - b.orden || a.clave.localeCompare(b.clave);
  });
  return cache;
}

/** El documento de una dirección (`adr/0029-los-addons`, sin barras). */
export function documento(clave: string): Documento | undefined {
  const limpia = clave.replace(/^\/+|\/+$/g, "");
  return documentos().find((candidato) => {
    const slug = candidato.clave.replace(/(^|\/)index$/, "");
    return slug === limpia || candidato.clave === limpia;
  });
}

/** Los ADR por carpeta de diez ✓ ✅, que es como se guardan (ADR 0031 ✓). */
export function carpetasAdr(): {
  id: string;
  etiqueta: string;
  documentos: Documento[];
}[] {
  const porCarpeta = new Map<string, Documento[]>();
  for (const documento of documentos()) {
    if (documento.grupo !== "adr" || !documento.carpeta) continue;
    const lista = porCarpeta.get(documento.carpeta) ?? [];
    lista.push(documento);
    porCarpeta.set(documento.carpeta, lista);
  }
  return [...porCarpeta.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, lista]) => ({
      id,
      etiqueta: id.replace("-", "–"),
      documentos: lista
    }));
}

/** El índice de las decisiones (`docs/adr/index.md`) ✓ ✅. */
export function indiceAdr(): Documento | undefined {
  return documentos().find((documento) => documento.clave === "adr/index");
}

/** Los documentos del producto ✓ ✅. */
export function documentosProducto(): Documento[] {
  return documentos().filter((documento) => documento.grupo === "producto");
}

/** El changelog que acompaña a un ADR (ADR 0036), si existe. */
export function changelogDe(documento: Documento): Documento | undefined {
  if (documento.esChangelog) return undefined;
  return documentos().find(
    (candidato) => candidato.clave === `${documento.clave}.changelog`
  );
}

/** El ADR al que acompaña un changelog. */
export function adrDe(documento: Documento): Documento | undefined {
  if (!documento.esChangelog) return undefined;
  return documentos().find(
    (candidato) => candidato.clave === documento.principal
  );
}
