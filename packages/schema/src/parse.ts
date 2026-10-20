import { isLegacyCcJson, normalizeLegacyCcJson } from "./legacy";
import { parseCcJson2 } from "./parse2";
import type { CcJson } from "./types";

/**
 * Valida y normaliza un cc.json.
 *
 * Acepta 2.x nativo y 1.x (desnudo o envuelto en `{ checksum, data }`), que se
 * convierte al modelo 2.x antes de validarse. Lanza `CcJsonError` con la ruta
 * exacta del problema. No es un validador de JSON Schema completo: comprueba la
 * estructura que el producto consume y falla pronto y claro.
 */
export function parseCcJson(input: unknown): CcJson {
  if (isLegacyCcJson(input)) return normalizeLegacyCcJson(input);
  return parseCcJson2(input);
}

export { CcJsonError } from "./errors";
