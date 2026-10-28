/**
 * Extensiones que el análisis entiende por defecto.
 *
 * Vive aparte de `walk.ts` porque ese módulo usa `node:fs` y la entrada del
 * navegador no puede importarlo.
 */
export const DEFAULT_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".java",
  ".py",
  ".go",
  ".cs"
] as const;
