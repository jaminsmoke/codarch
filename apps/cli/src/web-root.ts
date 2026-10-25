import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Dónde está el build de la app web.
 *
 * Tres sitios, en este orden: junto al bundle publicado (`.codarch` lo empaqueta en `web/`), en el
 * `apps/web/dist` del directorio actual y subiendo desde el código fuente. Devuelve `null` si no hay
 * build: quien llama lo dice en vez de servir una página en blanco.
 *
 * Lo comparten `serve` y `render`: los dos publican la misma app (ADR 0073).
 */
export function findWebRoot(): string | null {
  const candidates = [
    fileURLToPath(new URL("./web", import.meta.url)),
    path.resolve(process.cwd(), "apps", "web", "dist"),
    path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "..",
      "..",
      "..",
      "web",
      "dist"
    )
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "index.html"))) return candidate;
  }
  return null;
}
