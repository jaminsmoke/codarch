import path from "node:path";
import { fileURLToPath } from "node:url";
import { copyFileSync, existsSync } from "node:fs";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { rutasDocs } from "./vite-plugin-rutas.ts";

/**
 * Build de la web del proyecto (ADR 0034).
 *
 * Sale estática ✓ y se publica en GitHub Pages ✓, en `/codarch/` ✓: por eso
 * el `base` ✓ y el `basename` del router ✓ llevan ese prefijo ✓.
 *
 * Tailwind ✓ para el estilo ✓ y el contenido de la guía ✓ viene del markdown
 * del repo ✓ ✓ (ADR 0034 ✅ ✅).
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dist = path.join(root, "apps/site/dist");

/**
 * El 404.html de la web.
 *
 * GitHub Pages ✓ sirve el 404.html ✓ cuando no encuentra una ruta ✓. Como la
 * web tiene direcciones profundas ✓ (`/guia/` ✓), el 404.html es una copia
 * del index.html ✓ ✅ y el router se encarga ✓ ✅.
 */
function pagina404(): Plugin {
  return {
    name: "codarch-404",
    apply: "build",
    closeBundle() {
      const index = path.join(dist, "index.html");
      if (existsSync(index)) {
        copyFileSync(index, path.join(dist, "404.html"));
      }
    }
  };
}

export default defineConfig({
  base: "/codarch/",
  plugins: [react(), tailwindcss(), pagina404(), rutasDocs(root)],
  build: {
    outDir: dist,
    emptyOutDir: true,
    target: "es2022"
  },
  server: {
    port: 5175,
    fs: {
      // El markdown vive fuera de la app: hay que dejar leerlo.
      allow: [root]
    }
  }
});
