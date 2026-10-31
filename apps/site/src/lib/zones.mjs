/**
 * Las dos zonas del sitio (ADR 0081).
 *
 * `docs/usar/` y la portada `docs/index.md` son la **Documentación** (`/docs/`):
 * lo que necesita quien usa CodArch. `docs/desarrollo/` es **Desarrollo**
 * (`/desarrollo/`): roadmap, modelo, diseño, migración, ADR y la guía.
 *
 * Aquí vive la única traducción de un fichero a su ruta web; la usan el
 * loader de la colección, el plugin de enlaces, la sidebar y las
 * redirects (`redirects.mjs`, que es la parte que lee el disco).
 */

export const ZONES = /** @type {const} */ (["usar", "desarrollo"]);

/** La guía vive en `docs/desarrollo/guideline/` y tiene su propia página. */
export const GUIDE = "desarrollo/guideline";

/** El id de la colección para un fichero de `docs/` (`en/…` incluido). */
export function documentId(relativa) {
  const limpio = relativa.replace(/\.md$/, "");
  const ingles = limpio.startsWith("en/");
  const canonica = ingles ? limpio.slice(3) : limpio;
  const id = canonica.startsWith("desarrollo/") ? canonica : `docs/${canonica}`;
  return ingles ? `en/${id}` : id;
}

/**
 * La ruta web de una clave canónica (`usar/webapp`, `desarrollo/model`, …),
 * sin la base ni el idioma, con barra final.
 */
export function webPath(key) {
  if (key === GUIDE || key.startsWith(`${GUIDE}/`)) return "/desarrollo/guia/";
  const sinIndice = key.replace(/(^|\/)index$/, "");
  if (sinIndice === "desarrollo" || sinIndice.startsWith("desarrollo/"))
    return `/${sinIndice}/`;
  return sinIndice ? `/docs/${sinIndice}/` : "/docs/";
}

/** La zona de una ruta del sitio (sin base): `usar`, `desarrollo` o `null`. */
export function zoneOfPath(path) {
  const limpia = path.replace(/^\/en(?=\/|$)/, "");
  if (limpia === "/desarrollo" || limpia.startsWith("/desarrollo/"))
    return "desarrollo";
  if (limpia === "/docs" || limpia.startsWith("/docs/")) return "usar";
  return null;
}

/** Si una ruta absoluta del markdown es del sitio (le falta la base). */
export function isInternalPath(path) {
  return (
    path === "/" ||
    path.startsWith("/docs/") ||
    path.startsWith("/desarrollo/")
  );
}

/**
 * El nombre de cada zona en el filtro «zona» de la búsqueda, por idioma. Es lo
 * que ve quien busca, así que va en el idioma de la página.
 */
export const ZONE_LABELS = {
  es: { usar: "Documentación", desarrollo: "Desarrollo" },
  en: { usar: "Documentation", desarrollo: "Development" }
};

/** La etiqueta de la zona de una ruta del sitio (sin base), o `null`. */
export function zoneLabel(path) {
  const zona = zoneOfPath(path);
  if (!zona) return null;
  const locale = /^\/en(?=\/|$)/.test(path) ? "en" : "es";
  return ZONE_LABELS[locale][zona];
}

/**
 * Los filtros con los que se abre la búsqueda en una ruta: los de su zona, para
 * que buscar desde `/docs/` no devuelva solo ADR. Fuera de las zonas, ninguno.
 */
export function searchFilters(path) {
  const etiqueta = zoneLabel(path);
  return etiqueta ? { zona: [etiqueta] } : {};
}
