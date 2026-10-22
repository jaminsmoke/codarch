import { defineConfig } from "vitest/config";
import { rutasDocs } from "./apps/site/vite-plugin-rutas.ts";

export default defineConfig({
  // La web resuelve las rutas de sus documentos con este plugin (ADR 0034).
  plugins: [rutasDocs(process.cwd())],
  test: {
    include: ["packages/*/test/**/*.test.ts", "apps/*/test/**/*.test.ts"],
    environment: "node"
  }
});
