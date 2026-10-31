import claves from "virtual:docs-routes";
import { REPO } from "./markdown";
import { GUIDE, webPath } from "./zones.mjs";

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
export function isDocument(key: string): boolean {
  return conocidas.has(key);
}

/** Junta dos rutas de `docs/`, con sus `..` y sus `.` ✓ ✅. */
export function joinPath(desde: string, destino: string): string {
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
export function rootOf(locale: string): string {
  return locale === "en" ? `${BASE}/en` : BASE;
}

/** La misma página en el otro idioma, sin perder la ruta. */
export function localePath(actual: string, destino: string): string {
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
export function isActive(raiz: string, path: string, actual: string): boolean {
  if (path === "/") return actual === `${raiz}/` || actual === raiz;
  return actual.startsWith(`${raiz}${path}`);
}

/**
 * Un enlace que **no** pasa por el router ✓ ✅: los del markdown son `<a>` ✓ ✅
 * y necesitan la raíz del sitio ✅ ✅.
 */
export function withBase(path: string): string {
  return `${BASE}${path}`;
}

/** La dirección absoluta de una ruta del sitio, para el `canonical`. */
export function canonicalUrl(path: string): string {
  return `https://jaminsmoke.github.io${BASE}${path}`;
}

/** Cómo se llama un documento dentro del sitio ✓ ✅ (ruta del router ✓). */
export function pathOf(key: string): string {
  return webPath(key);
}

/**
 * Un enlace del markdown ✓ ✅.
 *
 * Si el destino es otro documento ✓ ✅, se queda en el sitio ✓; si no ✓, sale al
 * repo ✓ ✅, que es donde está el fichero ✅ ✅.
 */
export function resolve(
  fromKey: string,
  destino: string,
  lang: string = "es"
): string {
  const prefijo = lang === "en" ? "/en" : "";
  if (/^(https?:|mailto:|tel:)/.test(destino)) return destino;
  if (destino.startsWith("#")) return destino;

  const corte = destino.indexOf("#");
  const path = corte === -1 ? destino : destino.slice(0, corte);
  const ancla = corte === -1 ? "" : destino.slice(corte);
  if (!path) return ancla;

  const relativa = path.startsWith("/")
    ? path.replace(/^\/+/, "")
    : joinPath(fromKey, path);

  if (/\.md$/i.test(relativa)) {
    const key = relativa.replace(/\.md$/i, "");
    if (key.startsWith(`${GUIDE}/`))
      return withBase(`${prefijo}${webPath(key)}${ancla}`);
    if (conocidas.has(key))
      return `${withBase(`${prefijo}${pathOf(key)}`)}${ancla}`;
  }

  return `${REPO}/${relativa}${ancla}`;
}
