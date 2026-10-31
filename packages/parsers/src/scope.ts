import { CODARCH_DIR } from "@codarch/schema/browser";

/**
 * Los directorios que ningún análisis recorre (ADR 0038, ADR 0103).
 *
 * Son los internos del producto, del control de versiones y de las
 * dependencias. Cualquier otro nombre —`dist`, `build`, `target`— no decide
 * alcance: lo deciden `.gitignore` y el `ignore` de `.codarch.yml`. El walker
 * del CLI y el lector del navegador comparten esta lista para no abrir dos
 * verdades.
 */
export const INTERNAL_DIRECTORIES = [".git", "node_modules", CODARCH_DIR] as const;

export function isInternalDirectory(name: string): boolean {
  return (INTERNAL_DIRECTORIES as readonly string[]).includes(name);
}
