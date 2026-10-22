import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import { rutaDe } from "./src/lib/markdown";

/**
 * Publica la guía (ADR 0034).
 *
 * La guía es su propia página ✓ ✓ (ADR 0031, §7 ✓): no se reescribe en React ✓
 * ✗. Se copia tal cual ✓ al build ✓ y se le reescriben los enlaces ✓ para que
 * apunten a las rutas del sitio ✓ ✓.
 *
 * Copiar en el build ✓ y no tener una copia en el repo ✓: una sola verdad ✓ ✓.
 */
export function guia(): Plugin {
  const raiz = path.resolve(import.meta.dirname, "../..");
  const origen = path.join(raiz, "docs", "guideline");
  const destino = path.join(raiz, "apps", "site", "dist", "guia");

  return {
    name: "codarch-guia",
    apply: "build",
    closeBundle() {
      if (!existsSync(origen)) {
        this.warn("no está la guía; se publica sin ella");
        return;
      }
      rmSync(destino, { recursive: true, force: true });
      mkdirSync(destino, { recursive: true });
      cpSync(origen, destino, { recursive: true });
      // El README explica cómo se edita: en el sitio no hace falta.
      rmSync(path.join(destino, "README.md"), { force: true });

      // Los enlaces de dentro de la guía suben un nivel: la guía vive en
      // /guia/ y el sitio, en la raíz.
      const pagina = path.join(destino, "index.html");
      const html = readFileSync(pagina, "utf8").replace(
        /href="([^"]+)"/g,
        (todo, href: string) => {
          if (/^(https?:|#|\/)/.test(href)) return todo;
          const ruta = rutaDe(href.replace(/\.html$/, ".md"));
          return ruta ? `href="..${ruta}"` : todo;
        }
      );
      writeFileSync(pagina, html, "utf8");

      // GitHub Pages sirve el 404.html cuando no encuentra una ruta ✓. Como la
      // web tiene direcciones profundas ✓ (/adrs/0025 ✓), el 404.html es una
      // copia del index.html ✓ y el router se encarga ✓ ✅.
      const indice = path.join(destino, "..", "index.html");
      if (existsSync(indice)) {
        writeFileSync(path.join(destino, "..", "404.html"), readFileSync(indice));
      }
    }
  };
}
