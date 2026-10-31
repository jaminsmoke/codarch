/**
 * Entrada browser-safe del schema.
 *
 * No exporta `history-store` ni `chain-store`: esos módulos usan `node:fs` y
 * `node:path`. El parser compartido importa esta entrada para que el bundle del
 * navegador no arrastre código de Node; la entrada raíz sigue teniendo los
 * almacenes para CLI, MCP y escritorio.
 */

export * from "./shared";
export { CcJsonError } from "./errors";
export { parseCcJson2 as parseCcJson } from "./parse2";
