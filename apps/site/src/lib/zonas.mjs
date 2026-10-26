/**
 * Las dos zonas del sitio (ADR 0081).
 *
 * `docs/usar/` y la portada `docs/index.md` son la **Documentación** (`/docs/`):
 * lo que necesita quien usa CodArch. `docs/desarrollo/` es **Desarrollo**
 * (`/desarrollo/`): roadmap, modelo, diseño, migración, ADR y la guía.
 *
 * Aquí vive la única traducción de un fichero a su ruta web; la usan el
 * loader de la colección, el plugin de enlaces, la sidebar y las
 * redirecciones (`redirecciones.mjs`, que es la parte que lee el disco).
 */

export const ZONAS = /** @type {const} */ (["usar", "desarrollo"]);

/** La guía vive en `docs/desarrollo/guideline/` y tiene su propia página. */
export const GUIA = "desarrollo/guideline";

/** El id de la colección para un fichero de `docs/` (`en/…` incluido). */
export function idDocumento(relativa) {
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
export function rutaWeb(clave) {
  if (clave === GUIA || clave.startsWith(`${GUIA}/`)) return "/desarrollo/guia/";
  const sinIndice = clave.replace(/(^|\/)index$/, "");
  if (sinIndice === "desarrollo" || sinIndice.startsWith("desarrollo/"))
    return `/${sinIndice}/`;
  return sinIndice ? `/docs/${sinIndice}/` : "/docs/";
}

/** La zona de una ruta del sitio (sin base): `usar`, `desarrollo` o `null`. */
export function zonaDeRuta(ruta) {
  const limpia = ruta.replace(/^\/en(?=\/|$)/, "");
  if (limpia === "/desarrollo" || limpia.startsWith("/desarrollo/"))
    return "desarrollo";
  if (limpia === "/docs" || limpia.startsWith("/docs/")) return "usar";
  return null;
}

/** Si una ruta absoluta del markdown es del sitio (le falta la base). */
export function esRutaInterna(ruta) {
  return (
    ruta === "/" ||
    ruta.startsWith("/docs/") ||
    ruta.startsWith("/desarrollo/")
  );
}

/**
 * El nombre de cada zona en el filtro «zona» de la búsqueda, por idioma. Es lo
 * que ve quien busca, así que va en el idioma de la página.
 */
export const ETIQUETAS_ZONA = {
  es: { usar: "Documentación", desarrollo: "Desarrollo" },
  en: { usar: "Documentation", desarrollo: "Development" }
};

/** La etiqueta de la zona de una ruta del sitio (sin base), o `null`. */
export function etiquetaZona(ruta) {
  const zona = zonaDeRuta(ruta);
  if (!zona) return null;
  const idioma = /^\/en(?=\/|$)/.test(ruta) ? "en" : "es";
  return ETIQUETAS_ZONA[idioma][zona];
}

/**
 * Los filtros con los que se abre la búsqueda en una ruta: los de su zona, para
 * que buscar desde `/docs/` no devuelva solo ADR. Fuera de las zonas, ninguno.
 */
export function filtrosBusqueda(ruta) {
  const etiqueta = etiquetaZona(ruta);
  return etiqueta ? { zona: [etiqueta] } : {};
}
