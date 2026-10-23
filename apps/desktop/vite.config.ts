import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { codarchPlugins } from "@codarch/plugin-api/build";

/**
 * Build del renderer de la app de escritorio.
 *
 * Es el mismo motor que la web, pero con su propia carpeta y su propia UI: las
 * dos apps no se importan la una a la otra (ADR 0021). El motor, los
 * `packages/`, sí es el mismo.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const resolve = (relative: string): string => path.join(root, relative);

export default defineConfig({
  root: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "src/renderer"),
  base: "./",
  plugins: [react(), codarchPlugins({ root })],
  resolve: {
    alias: [
      {
        find: /^@codarch\/render\/browser$/,
        replacement: resolve("packages/render/src/browser.ts")
      },
      {
        find: /^@codarch\/render$/,
        replacement: resolve("packages/render/src/index.ts")
      },
      {
        find: /^@codarch\/metrics\/browser$/,
        replacement: resolve("packages/metrics/src/browser.ts")
      },
      {
        find: /^@codarch\/metrics$/,
        replacement: resolve("packages/metrics/src/index.ts")
      },
      {
        find: /^@codarch\/schema\/browser$/,
        replacement: resolve("packages/schema/src/browser.ts")
      },
      {
        find: /^@codarch\/schema$/,
        replacement: resolve("packages/schema/src/index.ts")
      },
      {
        find: /^@codarch\/plugin-api$/,
        replacement: resolve("packages/plugin-api/src/index.ts")
      },
      {
        find: /^@codarch\/layouts$/,
        replacement: resolve("packages/layouts/src/index.ts")
      },
      {
        find: /^@codarch\/ui\/styles\.css$/,
        replacement: resolve("packages/ui/src/styles.css")
      },
      {
        find: /^@codarch\/ui$/,
        replacement: resolve("packages/ui/src/index.ts")
      }
    ]
  },
  build: {
    outDir: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "dist/renderer"),
    emptyOutDir: true,
    target: "es2022"
  },
  server: {
    port: 5174
  }
});
