import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const resolve = (relative: string): string => path.join(root, relative);

export default defineConfig({
  plugins: [react()],
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
        find: /^@codarch\/layouts$/,
        replacement: resolve("packages/layouts/src/index.ts")
      }
    ]
  },
  server: {
    fs: { allow: [root] }
  },
  build: {
    target: "es2022"
  }
});
