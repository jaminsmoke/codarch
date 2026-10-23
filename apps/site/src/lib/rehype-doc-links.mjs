import path from "node:path";
import { visit } from "unist-util-visit";

const REPO = "https://github.com/jaminsmoke/codarch/blob/main";

/**
 * Convierte los enlaces relativos de `docs/` en rutas de Starlight.
 *
 * El markdown sigue escribiéndose como siempre (`../model.md`); el build lo
 * traduce a `/codarch/docs/model/` y conserva el ancla. Lo que no es un
 * documento sale al repositorio, como antes (ADR 0046).
 */
export function rehypeDocLinks({ docsRoot, base }) {
  return (tree, file) => {
    if (!file.path) return;
    const source = path
      .relative(docsRoot, file.path)
      .split(path.sep)
      .join("/");
    if (!source.endsWith(".md")) return;
    const sourceDir = path.posix.dirname(source);

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
        const interna = ruta === "/" || ruta.startsWith("/docs/") || ruta.startsWith("/guia/");
        node.properties.href = interna ? `${base}${ruta}`.replace(/\/\/+/g, "/") : href;
        return;
      }

      const destino = path.posix.normalize(path.posix.join(sourceDir, ruta));
      const fuera = destino === ".." || destino.startsWith("../");

      // Lo que no es un documento vive en el repositorio, no en la web.
      if (!ruta.endsWith(".md") || fuera) {
        const enRepo = fuera ? destino.replace(/^(\.\.\/)+/, "") : `docs/${destino}`;
        node.properties.href = `${REPO}/${enRepo}${ancla}`;
        return;
      }

      if (destino === "guideline/contenido.md") {
        node.properties.href = `${base}/guia/${ancla}`.replace(/\/\/+/g, "/");
        return;
      }

      const clave = destino.replace(/\.md$/, "");
      const sinIndice = clave.replace(/(^|\/)index$/, "");
      const rutaWeb = sinIndice ? `/docs/${sinIndice}/` : "/docs/";
      node.properties.href = `${base}${rutaWeb}${ancla}`.replace(/\/\/+/g, "/");
    });
  };
}
