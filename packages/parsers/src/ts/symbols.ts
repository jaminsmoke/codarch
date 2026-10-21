import type { ParsedSymbol } from "../types";
import { sha256Hex } from "@codarch/schema";
import {
  commentText,
  functionComplexity,
  type SyntaxNodeLike
} from "./measure";

/**
 * Los símbolos de un fichero: lo que hay dentro, más allá del fichero.
 *
 * Un directorio con veinte ficheros de cien líneas cada uno y un fichero de
 * dos mil líneas son el mismo mapa hasta que se mira dentro: el segundo tiene
 * muchas más funciones, y eso no sale de ningún agregado.
 *
 * Solo se listan los símbolos con **forma**: funciones, clases, interfaces,
 * tipos y enums. Las constantes no: son datos, no estructura, y una lista de
 * treinta `const` esconde la función que de verdad importa.
 */

/** Nodos que declaran un símbolo con nombre propio. */
const DECLARATION_KINDS: Record<string, ParsedSymbol["kind"]> = {
  function_declaration: "function",
  generator_function_declaration: "function",
  method_definition: "function",
  class_declaration: "class",
  abstract_class_declaration: "class",
  interface_declaration: "interface",
  type_alias_declaration: "type",
  enum_declaration: "enum"
};

/** Valores que son una función o una clase aunque no se declaren con `function`/`class`. */
const FUNCTION_VALUES = new Set([
  "arrow_function",
  "function_expression",
  "generator_function"
]);

const CLASS_VALUES = new Set(["class", "class_expression"]);

/**
 * Los símbolos del fichero, en el orden en que aparecen.
 *
 * Comparte código con el parser del navegador: los dos dan la misma lista,
 * que es lo que hace que el checksum del snapshot siga siendo el mismo.
 */
export function collectSymbols(root: SyntaxNodeLike): ParsedSymbol[] {
  const symbols: ParsedSymbol[] = [];
  const stack: SyntaxNodeLike[] = [root];

  while (stack.length > 0) {
    const node = stack.pop() as SyntaxNodeLike;

    const kind = DECLARATION_KINDS[node.type];
    if (kind) {
      const nameNode = node.childForFieldName("name");
      const name = nameNode?.text;
      if (name) symbols.push(describe(name, kind, node, nameNode));
    } else if (node.type === "variable_declarator") {
      const nameNode = node.childForFieldName("name");
      const name = nameNode?.text;
      const value = node.childForFieldName("value");
      if (name && value) {
        if (FUNCTION_VALUES.has(value.type)) {
          symbols.push(describe(name, "function", value));
        } else if (CLASS_VALUES.has(value.type)) {
          symbols.push(describe(name, "class", value));
        }
      }
    }

    for (const child of node.children) stack.push(child);
  }

  return symbols.sort((a, b) => a.line - b.line);
}

/** Un símbolo con su posición y, si es una función, su complejidad. */
function describe(
  name: string,
  kind: ParsedSymbol["kind"],
  node: SyntaxNodeLike,
  nameNode?: SyntaxNodeLike | null
): ParsedSymbol {
  const symbol: ParsedSymbol = {
    name,
    kind,
    line: node.startPosition.row + 1,
    hash: bodyHash(node, nameNode)
  };

  if (kind === "function") {
    symbol.complexity = functionComplexity(node);
    symbol.lines = node.endPosition.row - node.startPosition.row + 1;
  }

  return symbol;
}

/**
 * El hash del cuerpo: la identidad del símbolo.
 *
 * Son los **tokens**, sin comentarios y sin depender del formato: un
 * reformateo o un comentario nuevo no cambian el hash ✓, pero cambiar una
 * línea de código sí ✓.
 *
 * El **nombre propio no cuenta** ✓: si contara, un renombrado cambiaría el
 * hash y la cadena se rompería justo en lo que tiene que aguantar ✓. El
 * nombre identifica al símbolo en su sitio; el cuerpo es lo que lo hace el
 * mismo símbolo ✓.
 *
 * Es lo que permite reconocer un renombrado o una mudanza: el nombre y la ruta
 * cambian, el cuerpo no ✓ (ADR 0026 ✓).
 */
function bodyHash(node: SyntaxNodeLike, skip?: SyntaxNodeLike | null): string {
  const parts: string[] = [];
  const stack: SyntaxNodeLike[] = [node];

  while (stack.length > 0) {
    const current = stack.pop() as SyntaxNodeLike;

    // El nombre propio queda fuera ✓.
    // Se compara por posición y no por identidad: en el parser del navegador
    // cada acceso a un nodo devuelve un envoltorio nuevo ✗, y el mismo código
    // tiene que dar el mismo hash en los dos ✓.
    if (
      skip &&
      current.startPosition.row === skip.startPosition.row &&
      current.startPosition.column === skip.startPosition.column
    ) {
      continue;
    }

    if (current.childCount === 0) {
      // Los comentarios no son parte del código: se detectan por texto ✓.
      if (commentText(current.text)) continue;
      parts.push(current.text);
      continue;
    }

    // Al revés, para que salgan en el orden del fuente ✓.
    for (let index = current.children.length - 1; index >= 0; index--) {
      stack.push(current.children[index] as SyntaxNodeLike);
    }
  }

  return sha256Hex(parts.join(" "));
}
