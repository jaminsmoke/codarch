import fs from "node:fs";
import path from "node:path";

/**
 * Lee la hoja de la UI resolviendo los `@import` locales en orden.
 *
 * Los tests miran reglas y tokens en el CSS; la entrada `styles.css` solo
 * reexporta las piezas por zona, así que hay que aplanar la cascada.
 */
export function readUiStyles(): string {
  return resolveCssImports(
    path.resolve(import.meta.dirname, "../src/styles.css")
  );
}

function resolveCssImports(file: string): string {
  const dir = path.dirname(file);
  const text = fs.readFileSync(file, "utf8");
  return text.replace(/@import\s+["']([^"']+)["']\s*;\s*/g, (_match, rel: string) =>
    resolveCssImports(path.resolve(dir, rel))
  );
}
