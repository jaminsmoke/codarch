import type { SourceParser } from "./types";

/**
 * El registro de parsers del análisis (ADR 0090).
 *
 * El análisis ya no recibe **un** parser: recibe los que sabe usar y elige por
 * extensión. La regla es determinista y explícita: el primero que declara la
 * extensión es el que la atiende, así que el orden de la lista manda y no
 * depende del sistema de ficheros.
 */

/** El parser que atiende una ruta, o `null` si ninguno declara su extensión. */
export function parserFor(
  parsers: readonly SourceParser[],
  filePath: string
): SourceParser | null {
  const lower = filePath.toLowerCase();
  for (const parser of parsers) {
    if (parser.extensions.some((extension) => lower.endsWith(extension))) {
      return parser;
    }
  }
  return null;
}

/**
 * Las extensiones que el análisis tiene que recorrer.
 *
 * Es la unión de las de los parsers y las que la lente de migración mide sin
 * árbol (Rust, wasm, node). El orden no importa: el recorrido compara por
 * sufijo, y los ficheros salen ordenados por ruta.
 */
export function extensionsFor(
  parsers: readonly SourceParser[],
  extra: readonly string[] = []
): string[] {
  const all = new Set<string>(extra);
  for (const parser of parsers) {
    for (const extension of parser.extensions) all.add(extension);
  }
  return [...all].sort();
}
