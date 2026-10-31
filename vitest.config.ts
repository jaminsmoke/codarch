import { defineConfig } from "vitest/config";
import { rutasDocs } from "./apps/site/vite-plugin-rutas.ts";
import path from "node:path";

export default defineConfig({
  // La web resuelve las rutas de sus documentos con este plugin (ADR 0034).
  plugins: [rutasDocs(path.join(process.cwd(), "apps", "site"))],
  resolve: {
    alias: {
      // El registro de plugins lo genera el build (ADR 0028); en las pruebas
      // no hay build y la app tiene que cargar con cero plugins.
      "virtual:codarch-plugins": path.join(
        process.cwd(),
        "packages",
        "ui",
        "test",
        "fixtures",
        "plugins-empty.ts"
      )
    }
  },
  test: {
    include: [
      "packages/*/test/**/*.test.ts",
      "plugins/*/test/**/*.test.ts",
      "apps/*/test/**/*.test.ts"
    ],
    environment: "node",
    // Los tests de verdad —un repo en un directorio temporal, `git` de por
    // medio, un análisis completo— rozan los cinco segundos cuando la máquina
    // está cargada. El límite es para lo que se cuelga, no para lo que trabaja.
    testTimeout: 30_000
  }
});
