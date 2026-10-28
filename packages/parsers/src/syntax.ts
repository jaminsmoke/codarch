/**
 * Lo mínimo del árbol de tree-sitter que necesitan los analizadores.
 *
 * Vive fuera de `ts/` porque lo comparten los dos lenguajes: el patrón de
 * nodos es el mismo en el binding nativo y en el WASM, y la regla de qué es
 * una línea de código no depende de la gramática.
 */

export interface SyntaxNodeLike {
  type: string;
  text: string;
  childCount: number;
  children: readonly SyntaxNodeLike[];
  namedChildren: readonly SyntaxNodeLike[];
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
  childForFieldName(name: string): SyntaxNodeLike | null;
}

/**
 * Detecta un comentario por su texto, no por su tipo de nodo.
 *
 * El tipo no sirve: dentro de un `interface` el binding nativo tipa el
 * comentario como `interface_body` (hereda el tipo del padre), mientras que
 * el WASM lo tipa como `comment`. Con la regla por texto los dos builds
 * cuentan las mismas líneas de código. Java usa las mismas tres formas.
 */
export function isComment(text: string): boolean {
  return text.startsWith("//") || text.startsWith("/*") || text.startsWith("#!");
}

/** Si el texto es un comentario. Lo exported porque el hash del cuerpo lo necesita. */
export function commentText(text: string): boolean {
  return isComment(text);
}

/** `loc` cuenta líneas físicas; `rloc` líneas con al menos un token de código. */
export function countLines(source: string): number {
  if (source.length === 0) return 0;

  let lines = 1;
  for (let index = 0; index < source.length; index++) {
    const code = source.charCodeAt(index);
    if (code === 10) {
      lines++;
    } else if (code === 13 && source.charCodeAt(index + 1) !== 10) {
      lines++;
    }
  }

  const last = source.charCodeAt(source.length - 1);
  return last === 10 || last === 13 ? lines - 1 : lines;
}
