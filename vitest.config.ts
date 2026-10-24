import { defineConfig } from "vitest/config";
import { rutasDocs } from "./apps/site/vite-plugin-rutas.ts";
import path from "node:path";

export default defineConfig({
  // La web resuelve las rutas de sus documentos con este plugin (ADR 0034).
  plugins: [rutasDocs(path.join(process.cwd(), "apps", "site"))],
  test: {
    include: [
      "packages/*/test/**/*.test.ts",
      "plugins/*/test/**/*.test.ts",
      "apps/*/test/**/*.test.ts"
    ],
    environment: "node"
  }
});
