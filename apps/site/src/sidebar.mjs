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
 */

const DOCS = fileURLToPath(new URL("../../../docs", import.meta.url));

function andar(carpeta) {
  return fs.readdirSync(carpeta, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = path.join(carpeta, entrada.name);
    if (entrada.isDirectory()) return andar(ruta);
    return entrada.name.endsWith(".md") ? [ruta] : [];
  });
}

function leer(archivo) {
  const texto = fs.readFileSync(archivo, "utf8");
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(texto);
  if (!match) return null;
  const datos = parseYaml(match[1]) ?? {};
  const relativa = path
    .relative(DOCS, archivo)
    .split(path.sep)
    .join("/")
    .replace(/\.md$/, "");
  return { clave: `docs/${relativa}`, datos };
}

function etiqueta(clave, datos) {
  if (datos.sidebar?.label) return datos.sidebar.label;
  if (datos.changelog) {
    const numero = (clave.split("/").pop() ?? "").match(/^(\d+)/)?.[1];
    return numero ? `Changelog — ADR ${numero}` : "Changelog";
  }
  return datos.title ?? clave;
}

function item(clave, datos) {
  return {
    slug: clave,
    label: etiqueta(clave, datos),
    ...(datos.sidebar?.order !== undefined
      ? { attrs: { "data-order": datos.sidebar.order } }
      : {})
  };
}

const documentos = andar(DOCS)
  .map(leer)
  .filter((documento) => documento !== null)
  .filter((documento) => !documento.clave.includes("docs/guideline/"));

const producto = documentos
  .filter((documento) => documento.datos.section === "producto")
  .sort(
    (a, b) =>
      (a.datos.sidebar?.order ?? 0) - (b.datos.sidebar?.order ?? 0) ||
      a.clave.localeCompare(b.clave)
  )
  .map((documento) => item(documento.clave, documento.datos));

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
      .map((documento) => item(documento.clave, documento.datos))
  }));

const indice = documentos.find(
  (documento) => documento.clave === "docs/adr/index"
);

export function sidebar() {
  return [
    { label: "La guía", link: "/guia/" },
    { label: "El producto", items: producto },
    {
      label: "Las decisiones",
      items: [
        ...(indice ? [item(indice.clave, indice.datos)] : []),
        ...gruposDecisiones
      ]
    }
  ];
}
