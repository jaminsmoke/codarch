import fs from "node:fs";
import path from "node:path";
import { CODARCH_DIR, CONFIG_FILE_NAMES } from "./artifacts";

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

/**
 * La configuración del repo, o `null` si no tiene ninguna.
 *
 * Mira los dos nombres en orden: un repo con `.codarch.yml` y `.codarch.yaml`
 * lee el primero, y todos los consumidores ven el mismo fichero.
 */
export function findRepoConfig(root: string): string | null {
  for (const name of CONFIG_FILE_NAMES) {
    const file = path.join(root, name);
    if (fs.existsSync(file)) return file;
  }
  return null;
}
