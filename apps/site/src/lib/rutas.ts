import claves from "virtual:docs-rutas";
import { REPO } from "./markdown";
import { GUIA, rutaWeb } from "./zonas.mjs";

/**
 * Las direcciones de los documentos ✓ ✅.
 *
 * Solo las **rutas** ✓: el contenido pesa ✓ ✅ y se carga con su página ✓ ✅
 * (la lista sale del build ✓, en `vite.config.ts` ✓). Así la guía puede enlazar
 * a un ADR ✓ ✅ sin llevarse todos los documentos en el mismo paquete ✅ ✅.
 */

/** Las claves que existen: `desarrollo/adr/0021-0030/0029-los-addons`, `usar/webapp`, … */
const conocidas = new Set<string>(claves);

/** Si una clave es un documento del sitio ✓ ✅. */
export function esDocumento(clave: string): boolean {
  return conocidas.has(clave);
}

/** Junta dos rutas de `docs/`, con sus `..` y sus `.` ✓ ✅. */
export function juntar(desde: string, destino: string): string {
  const partes = desde.split("/").slice(0, -1);
  for (const trozo of destino.split("/")) {
    if (!trozo || trozo === ".") continue;
    if (trozo === "..") partes.pop();
    else partes.push(trozo);
  }
  return partes.join("/");
}

/** La raíz del sitio (`/codarch/` en GitHub Pages), sin la barra final. */
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/** La raíz de un idioma: el español vive en la base y el inglés en `/en`. */
export function raizDe(idioma: string): string {
  return idioma === "en" ? `${BASE}/en` : BASE;
}

/** La misma página en el otro idioma, sin perder la ruta. */
export function rutaIdioma(actual: string, destino: string): string {
  const sinBase = actual.startsWith(BASE)
    ? actual.slice(BASE.length)
    : actual;
  const sinIngles =
    sinBase === "/en"
      ? "/"
      : sinBase.startsWith("/en/")
        ? sinBase.slice(3)
        : sinBase;
  const resto = sinIngles || "/";
  return destino === "en"
    ? `${BASE}/en${resto === "/" ? "/" : resto}`
    : `${BASE}${resto}`;
}

/** Si una ruta del menú de la cabecera es la página actual. */
export function esActiva(raiz: string, ruta: string, actual: string): boolean {
  if (ruta === "/") return actual === `${raiz}/` || actual === raiz;
  return actual.startsWith(`${raiz}${ruta}`);
}

/**
 * Un enlace que **no** pasa por el router ✓ ✅: los del markdown son `<a>` ✓ ✅
 * y necesitan la raíz del sitio ✅ ✅.
 */
export function conBase(ruta: string): string {
  return `${BASE}${ruta}`;
}

/** La dirección absoluta de una ruta del sitio, para el `canonical`. */
export function urlCanonica(ruta: string): string {
  return `https://jaminsmoke.github.io${BASE}${ruta}`;
}

/** Cómo se llama un documento dentro del sitio ✓ ✅ (ruta del router ✓). */
export function rutaDe(clave: string): string {
  return rutaWeb(clave);
}

/**
 * Un enlace del markdown ✓ ✅.
 *
 * Si el destino es otro documento ✓ ✅, se queda en el sitio ✓; si no ✓, sale al
 * repo ✓ ✅, que es donde está el fichero ✅ ✅.
 */
export function resolver(
  desdeClave: string,
  destino: string,
  lang: string = "es"
): string {
  const prefijo = lang === "en" ? "/en" : "";
  if (/^(https?:|mailto:|tel:)/.test(destino)) return destino;
  if (destino.startsWith("#")) return destino;

  const corte = destino.indexOf("#");
  const ruta = corte === -1 ? destino : destino.slice(0, corte);
  const ancla = corte === -1 ? "" : destino.slice(corte);
  if (!ruta) return ancla;

  const relativa = ruta.startsWith("/")
    ? ruta.replace(/^\/+/, "")
    : juntar(desdeClave, ruta);

  if (/\.md$/i.test(relativa)) {
    const clave = relativa.replace(/\.md$/i, "");
    if (clave.startsWith(`${GUIA}/`))
      return conBase(`${prefijo}${rutaWeb(clave)}${ancla}`);
    if (conocidas.has(clave))
      return `${conBase(`${prefijo}${rutaDe(clave)}`)}${ancla}`;
  }

  return `${REPO}/${relativa}${ancla}`;
}
