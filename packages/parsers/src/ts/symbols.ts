import type { ParsedSymbol } from "../types";
import { functionComplexity, type SyntaxNodeLike } from "./measure";

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
      const name = node.childForFieldName("name")?.text;
      if (name) symbols.push(describe(name, kind, node));
    } else if (node.type === "variable_declarator") {
      const name = node.childForFieldName("name")?.text;
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
  node: SyntaxNodeLike
): ParsedSymbol {
  const symbol: ParsedSymbol = {
    name,
    kind,
    line: node.startPosition.row + 1
  };

  if (kind === "function") {
    symbol.complexity = functionComplexity(node);
    symbol.lines = node.endPosition.row - node.startPosition.row + 1;
  }

  return symbol;
}
