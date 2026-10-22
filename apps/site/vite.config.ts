import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

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

export default defineConfig({
  base: "/codarch/",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: path.join(root, "apps/site/dist"),
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
