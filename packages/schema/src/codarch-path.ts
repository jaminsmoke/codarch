import path from "node:path";
import { CODARCH_DIR } from "./artifacts";

/**
 * La ruta de una entrada de `.codarch/` (ADR 0101).
 *
 * Vive aparte de `artifacts` porque usa `node:path` y aquel módulo entra en el
 * bundle del navegador; las dos entradas comparten los nombres, no la forma de
 * componer rutas.
 */
export function codarchPath(root: string, entry: string): string {
  return path.join(root, CODARCH_DIR, entry);
}

/** La carpeta del producto de un repo, como ruta. */
export function codarchDir(root: string): string {
  return path.join(root, CODARCH_DIR);
}
