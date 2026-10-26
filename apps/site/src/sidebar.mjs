import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

/**
 * La sidebar de Starlight se genera del frontmatter de `docs/` (ADR 0046).
 *
 * No hay una lista de documentos en el código: añadir un `.md` con su
 * frontmatter lo pone en su bloque: `usar` o `construir` (ADR 0080); los ADR
 * se agrupan por su carpeta de diez.
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

function orden(a, b) {
  return (
    (a.datos.sidebar?.order ?? 0) - (b.datos.sidebar?.order ?? 0) ||
    a.clave.localeCompare(b.clave)
  );
}

const enSeccion = (seccion) =>
  documentos.filter((documento) => documento.datos.section === seccion);

/** Cada comando del CLI tiene su página en `docs/cli/` y forman un grupo. */
const ORDEN_CLI = 30;
const esCli = (documento) => documento.clave.startsWith("docs/cli/");

const comandos = enSeccion("usar").filter(esCli).sort(orden).map(item);

const usar = [
  ...enSeccion("usar")
    .filter((documento) => !esCli(documento))
    .map((documento) => ({
      orden: documento.datos.sidebar?.order ?? 0,
      clave: documento.clave,
      entrada: item(documento)
    })),
  ...(comandos.length > 0
    ? [
        {
          orden: ORDEN_CLI,
          clave: "docs/cli",
          entrada: { label: "CLI", translations: { en: "CLI" }, items: comandos }
        }
      ]
    : [])
]
  .sort((a, b) => a.orden - b.orden || a.clave.localeCompare(b.clave))
  .map(({ entrada }) => entrada);

const construir = enSeccion("construir").sort(orden).map(item);

const decisiones = enSeccion("adr")
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
    items: lista.sort(orden).map(item)
  }));

const indice = documentos.find(
  (documento) => documento.clave === "docs/adr/index"
);

/**
 * Dos bloques (ADR 0080): lo que necesita quien usa CodArch y lo que explica
 * cómo se construye. El `section` del frontmatter decide el bloque.
 */
export function sidebar() {
  return [
    {
      label: "Usar CodArch",
      translations: { en: "Using CodArch" },
      items: usar
    },
    {
      label: "Cómo se construye",
      translations: { en: "How it is built" },
      items: [
        ...construir,
        {
          label: "Decisiones (ADR)",
          translations: { en: "Decisions (ADR)" },
          collapsed: true,
          items: [...(indice ? [item(indice)] : []), ...gruposDecisiones]
        },
        {
          label: "La guía",
          translations: { en: "The guide" },
          link: "/guia/"
        }
      ]
    }
  ];
}
