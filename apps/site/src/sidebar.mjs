import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

/**
 * La sidebar de Starlight se genera del frontmatter de `docs/` (ADR 0046).
 *
 * No hay una lista de documentos en el código: añadir un `.md` con su
 * frontmatter lo pone en su grupo. El producto va primero; los ADR se agrupan
 * por su carpeta de diez.
 *
 * El inglés vive en `docs/en/` con las mismas rutas relativas. La lista es
 * única: Starlight le pone el prefijo del idioma a cada slug, y la etiqueta
 * inglesa sale del frontmatter traducido cuando existe.
 */

const DOCS = fileURLToPath(new URL("../docs", import.meta.url));
const EN = path.join(DOCS, "en");

function andar(carpeta) {
  return fs.readdirSync(carpeta, { withFileTypes: true }).flatMap((entrada) => {
    // El inglés tiene su propio árbol y la guía su propia página.
    if (entrada.name === "en" || entrada.name === "guideline") return [];
    const ruta = path.join(carpeta, entrada.name);
    if (entrada.isDirectory()) return andar(ruta);
    return entrada.name.endsWith(".md") ? [ruta] : [];
  });
}

function frente(archivo) {
  if (!fs.existsSync(archivo)) return null;
  const texto = fs.readFileSync(archivo, "utf8");
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(texto);
  if (!match) return null;
  return parseYaml(match[1]) ?? {};
}

function leer(archivo) {
  const datos = frente(archivo);
  if (datos === null) return null;
  const relativa = path
    .relative(DOCS, archivo)
    .split(path.sep)
    .join("/")
    .replace(/\.md$/, "");
  return { clave: `docs/${relativa}`, relativa, datos };
}

function etiqueta(clave, datos) {
  return datos.sidebar?.label ?? datos.title ?? clave;
}

/** La etiqueta inglesa del mismo documento, si está traducido. */
function etiquetaEn(relativa) {
  const traducido = frente(path.join(EN, `${relativa}.md`));
  if (traducido === null) return undefined;
  return traducido.sidebar?.label ?? traducido.title;
}

function item(documento) {
  const { clave, relativa, datos } = documento;
  const en = etiquetaEn(relativa);
  return {
    slug: clave,
    label: etiqueta(clave, datos),
    ...(en ? { translations: { en } } : {}),
    ...(datos.sidebar?.order !== undefined
      ? { attrs: { "data-order": datos.sidebar.order } }
      : {})
  };
}

const documentos = andar(DOCS)
  .map(leer)
  .filter((documento) => documento !== null);

const producto = documentos
  .filter((documento) => documento.datos.section === "producto")
  .sort(
    (a, b) =>
      (a.datos.sidebar?.order ?? 0) - (b.datos.sidebar?.order ?? 0) ||
      a.clave.localeCompare(b.clave)
  )
  .map(item);

const decisiones = documentos
  .filter((documento) => documento.datos.section === "adr")
  .filter((documento) => documento.clave !== "docs/adr/index")
  .reduce((grupos, documento) => {
    const partes = documento.clave.split("/");
    const carpeta = partes[2] ?? "";
    if (!/^\d{4}-\d{4}$/.test(carpeta)) return grupos;
    const lista = grupos.get(carpeta) ?? [];
    lista.push(documento);
    grupos.set(carpeta, lista);
    return grupos;
  }, new Map());

const gruposDecisiones = [...decisiones.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([carpeta, lista]) => ({
    label: carpeta.replace("-", "–"),
    collapsed: true,
    items: lista
      .sort(
        (a, b) =>
          (a.datos.sidebar?.order ?? 0) - (b.datos.sidebar?.order ?? 0) ||
          a.clave.localeCompare(b.clave)
      )
      .map(item)
  }));

const indice = documentos.find(
  (documento) => documento.clave === "docs/adr/index"
);

export function sidebar() {
  return [
    {
      label: "La guía",
      translations: { en: "The guide" },
      link: "/guia/"
    },
    {
      label: "El producto",
      translations: { en: "The product" },
      items: producto
    },
    {
      label: "Las decisiones",
      translations: { en: "The decisions" },
      items: [
        ...(indice ? [item(indice)] : []),
        ...gruposDecisiones
      ]
    }
  ];
}
