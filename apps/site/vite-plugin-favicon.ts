import { readFileSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

/**
 * El favicon, servido antes del router de desarrollo.
 *
 * El navegador pide el icono fuera del documento y manda
 * `Sec-Fetch-Site: cross-site`; el router de Astro bloquea esas peticiones y
 * avisa en cada carga. Es un SVG público, así que se sirve aquí y el aviso
 * desaparece. El middleware va al principio de la pila —Astro coloca el suyo
 * ahí— y solo responde a esa ruta exacta; lo demás sigue pasando por el router.
 */
export function faviconDev(root: string): Plugin {
  const archivo = path.join(root, "public", "favicon.svg");

  return {
    name: "codarch-favicon",
    apply: "serve",
    configureServer(servidor) {
      return () => {
        servidor.middlewares.stack.unshift({
          route: "",
          handle(req, res, next) {
            const url = (req.url ?? "").split("?")[0];
            if (url !== "/favicon.svg" && url !== "/codarch/favicon.svg") {
              next();
              return;
            }
            res.setHeader("Content-Type", "image/svg+xml");
            res.setHeader("Cache-Control", "no-cache");
            if (req.method === "HEAD") {
              res.end();
              return;
            }
            res.end(readFileSync(archivo));
          }
        });
      };
    }
  };
}
