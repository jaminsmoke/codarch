import fs from "node:fs";
import path from "node:path";
import { CODARCH_DIR, isCodarchEntry } from "@codarch/schema";

/**
 * Deja `.codarch/` con lo que es suyo (ADR 0101).
 *
 * La carpeta no es un cajón: la escribe el producto, y solo el producto. Lo que
 * no reconoce se borra y se devuelve, para que quien llama lo pueda decir. El
 * estado local —preferencias, caché de parseo, libro de cadenas, registro de
 * alcances, capturas— se reconoce aunque esta pasada no lo haya escrito, y se
 * queda: borrarlo costaría la vista elegida y un parseo entero.
 *
 * Solo actúa si la carpeta existe: un análisis no crea estado para borrarlo.
 * Una entrada que no se puede borrar no se anuncia como borrada.
 */
export function sweepCodarch(root: string): string[] {
  const directory = path.join(root, CODARCH_DIR);
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch {
    return [];
  }

  const removed: string[] = [];
  for (const entry of entries) {
    if (isCodarchEntry(entry.name)) continue;
    try {
      fs.rmSync(path.join(directory, entry.name), {
        recursive: true,
        force: true
      });
      removed.push(entry.name);
    } catch {
      // Sigue estando: no se cuenta.
    }
  }
  return removed.sort();
}
