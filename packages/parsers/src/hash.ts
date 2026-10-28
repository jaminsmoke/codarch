import { sha256Hex } from "@codarch/schema/browser";
import { commentText, type SyntaxNodeLike } from "./syntax";

/**
 * El hash del cuerpo de un símbolo: su identidad (ADR 0026).
 *
 * Son los **tokens**, sin comentarios y sin depender del formato: un
 * reformateo o un comentario nuevo no cambian el hash, pero cambiar una línea
 * de código sí. El **nombre propio no cuenta**: si contara, un renombrado
 * cambiaría el hash y la cadena se rompería justo en lo que tiene que aguantar.
 * El nombre identifica al símbolo en su sitio; el cuerpo es lo que lo hace el
 * mismo símbolo.
 *
 * Es el mismo cálculo para todos los lenguajes: el árbol cambia, los tokens
 * no. Lo único que cambia es cómo se reconoce un comentario: en TS y Java vale
 * el texto (`//`, `/*`) y en Python el tipo de nodo, porque allí `#` a secas
 * también empieza un comentario y el texto de un string podría empezar igual.
 */
export function bodyHash(
  node: SyntaxNodeLike,
  skip?: SyntaxNodeLike | null,
  isComment: (node: SyntaxNodeLike) => boolean = (current) =>
    commentText(current.text)
): string {
  const parts: string[] = [];
  const stack: SyntaxNodeLike[] = [node];

  while (stack.length > 0) {
    const current = stack.pop() as SyntaxNodeLike;

    // El nombre propio queda fuera.
    // Se compara por posición y no por identidad: en el parser del navegador
    // cada acceso a un nodo devuelve un envoltorio nuevo, y el mismo código
    // tiene que dar el mismo hash en los dos.
    //
    // Solo se salta una **hoja**. En un método, en una variable y en muchos
    // tipos el nodo empieza en la misma columna que su nombre; si se saltara
    // el nodo entero, el hash saldría vacío y dos cuerpos distintos serían el
    // mismo símbolo (ADR 0063).
    if (
      skip &&
      current.childCount === 0 &&
      current.startPosition.row === skip.startPosition.row &&
      current.startPosition.column === skip.startPosition.column
    ) {
      continue;
    }

    if (current.childCount === 0) {
      // Los comentarios no son parte del código.
      if (isComment(current)) continue;
      parts.push(current.text);
      continue;
    }

    // Los hijos, una sola vez: cada acceso en el binding nativo los vuelve a
    // materializar.
    const children = current.children;

    // Al revés, para que salgan en el orden del fuente.
    for (let index = children.length - 1; index >= 0; index--) {
      stack.push(children[index] as SyntaxNodeLike);
    }
  }

  return sha256Hex(parts.join(" "));
}
