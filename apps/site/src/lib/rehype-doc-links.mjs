import path from "node:path";
import { visit } from "unist-util-visit";
import { esRutaInterna, rutaWeb } from "./zonas.mjs";

const REPO = "https://github.com/jaminsmoke/codarch/blob/main/apps/site/docs";

/**
 * Convierte los enlaces relativos de `docs/` en rutas de Starlight.
 *
 * El markdown sigue escribiéndose como siempre (`../model.md`); el build lo
 * traduce a su ruta web según su zona (`/codarch/desarrollo/model/`,
 * `/codarch/docs/usar/webapp/`; ADR 0081) y conserva el ancla. Lo que no es un
 * documento sale al repositorio, como antes (ADR 0046).
 *
 * Los documentos ingleses viven en `docs/en/` con las mismas rutas relativas,
 * así que su prefijo es `/codarch/en` y los ficheros que no son documentos
 * siguen apuntando a la ruta canónica del repo (las imágenes se comparten).
 */
export function rehypeDocLinks({ docsRoot, base }) {
  return (tree, file) => {
    if (!file.path) return;
    const relativa = path
      .relative(docsRoot, file.path)
      .split(path.sep)
      .join("/");
    if (!relativa.endsWith(".md")) return;

    const enIngles = relativa.startsWith("en/");
    const canonico = enIngles ? relativa.slice(3) : relativa;
    const sourceDir = path.posix.dirname(canonico);
    const prefijo = enIngles ? `${base}/en` : base;

    visit(tree, "element", (node) => {
      if (node.tagName !== "a") return;
      const href = node.properties?.href;
      if (typeof href !== "string") return;
      if (/^(?:https?:|mailto:|tel:|#)/.test(href)) return;

      const corte = href.indexOf("#");
      const ruta = corte === -1 ? href : href.slice(0, corte);
      const ancla = corte === -1 ? "" : href.slice(corte);
      if (!ruta) return;

      if (ruta.startsWith("/")) {
        node.properties.href = esRutaInterna(ruta)
          ? `${prefijo}${ruta}`.replace(/\/\/+/g, "/")
          : href;
        return;
      }

      const destino = path.posix.normalize(path.posix.join(sourceDir, ruta));
      const fuera = destino === ".." || destino.startsWith("../");

      // Lo que no es un documento vive en el repositorio, no en la web.
      if (!ruta.endsWith(".md") || fuera) {
        const enRepo = fuera ? destino.replace(/^(\.\.\/)+/, "") : destino;
        node.properties.href = `${REPO}/${enRepo}${ancla}`;
        return;
      }

      const clave = destino.replace(/\.md$/, "");
      node.properties.href = `${prefijo}${rutaWeb(clave)}${ancla}`.replace(
        /\/\/+/g,
        "/"
      );
    });
  };
}
