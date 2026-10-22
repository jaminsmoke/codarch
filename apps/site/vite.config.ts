import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { guia } from "./vite-plugin-guia";

/**
 * Build de la web del proyecto (ADR 0034).
 *
 * Sale estática ✓ y se publica en GitHub Pages ✓, en `/codarch/` ✓: por eso
 * el `base` ✓ y el `basename` del router ✓ llevan ese prefijo ✓.
 *
 * Las páginas de documentación ✓ se generan del markdown del repo ✓ (ADR
 * 0034 ✓): este config no las escribe ✓, las lee ✓.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export default defineConfig({
  base: "/codarch/",
  plugins: [react(), guia()],
  resolve: {
    alias: [
      {
        find: /^@codarch\/render\/browser$/,
        replacement: path.join(root, "packages/render/src/browser.ts")
      },
      {
        find: /^@codarch\/render$/,
        replacement: path.join(root, "packages/render/src/index.ts")
      }
    ]
  },
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
