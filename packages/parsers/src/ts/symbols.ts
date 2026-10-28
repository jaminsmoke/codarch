import type { ParsedSymbol } from "../types";
import { bodyHash } from "../hash";
import { functionComplexity, type SyntaxNodeLike } from "./measure";

/**
 * Los símbolos de un fichero: lo que hay dentro, más allá del fichero.
 *
 * Un directorio con veinte ficheros de cien líneas cada uno y un fichero de
 * dos mil líneas son el mismo mapa hasta que se mira dentro: el segundo tiene
 * muchas más funciones, y eso no sale de ningún agregado.
 *
 * Se listan todas las declaraciones con nombre que el modelo conoce:
 * funciones, clases, interfaces, tipos, enums y variables. Una variable del
 * módulo es un símbolo —también una constante de texto o un objeto de
 * configuración—, pero una variable local no: vive dentro de una función y
 * llenaría la lista de ruido (ADR 0063).
 */

/** Nodos que declaran un símbolo con nombre propio. */
export const DECLARATION_KINDS: Record<string, ParsedSymbol["kind"]> = {
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
export const FUNCTION_VALUES = new Set([
  "arrow_function",
  "function_expression",
  "generator_function"
]);

export const CLASS_VALUES = new Set(["class", "class_expression"]);

/**
 * Nodos que no abren un ámbito propio: el módulo, el `export`, la declaración
 * `declare` y los envoltorios de `const`/`let`/`var`. Al bajar por ellos, una
 * variable sigue siendo del módulo.
 *
 * Un bloque, una función o una clase no están aquí: lo que declare dentro no
 * es un símbolo del fichero, salvo que sea una función o una clase (ADR 0063).
 */
export const MODULE_SCOPE_WRAPPERS = new Set([
  "program",
  "export_statement",
  "ambient_declaration",
  "lexical_declaration",
  "variable_declaration"
]);

/**
 * El tipo de símbolo que declara un `variable_declarator`, o `null` si no es
 * uno.
 *
 * Una flecha o una clase guardadas en una constante son una función o una
 * clase, en cualquier ámbito. Cualquier otro valor solo cuenta en el módulo:
 * `const LIMITE = 10` es un símbolo; `const total = 0` dentro de una función,
 * no.
 */
export function declaratorKind(
  value: SyntaxNodeLike | null,
  moduleScope: boolean
): ParsedSymbol["kind"] | null {
  if (!value) return null;
  if (FUNCTION_VALUES.has(value.type)) return "function";
  if (CLASS_VALUES.has(value.type)) return "class";
  return moduleScope ? "variable" : null;
}

/**
 * Los símbolos del fichero, en el orden en que aparecen.
 *
 * Comparte código con el parser del navegador: los dos dan la misma lista,
 * que es lo que hace que el checksum del snapshot siga siendo el mismo.
 *
 * El camino normal de un fichero es `analyzeTree` (`tree.ts`), que recorre el
 * árbol una sola vez para métricas, importaciones y símbolos; esto se queda
 * para lo que solo quiere símbolos.
 */
export function collectSymbols(root: SyntaxNodeLike): ParsedSymbol[] {
  const symbols: ParsedSymbol[] = [];
  const stack: Array<{ node: SyntaxNodeLike; moduleScope: boolean }> = [
    { node: root, moduleScope: true }
  ];

  while (stack.length > 0) {
    const { node, moduleScope } = stack.pop() as {
      node: SyntaxNodeLike;
      moduleScope: boolean;
    };

    const kind = DECLARATION_KINDS[node.type];
    if (kind) {
      const nameNode = node.childForFieldName("name");
      const name = nameNode?.text;
      if (name) symbols.push(describeSymbol(name, kind, node, nameNode));
    } else if (node.type === "variable_declarator") {
      // Solo un identificador es un nombre propio; `const { a } = ...` declara
      // un enlace, no un símbolo con nombre (ADR 0063).
      const nameNode = node.childForFieldName("name");
      const name = nameNode?.type === "identifier" ? nameNode.text : null;
      const value = node.childForFieldName("value");
      const declared = declaratorKind(value, moduleScope);
      if (name && value && declared) {
        const symbolNode = declared === "variable" ? node : value;
        symbols.push(
          describeSymbol(
            name,
            declared,
            symbolNode,
            declared === "variable" ? nameNode : undefined
          )
        );
      }
    }

    const children = node.children;
    const childScope = moduleScope && MODULE_SCOPE_WRAPPERS.has(node.type);
    for (let index = children.length - 1; index >= 0; index--) {
      stack.push({ node: children[index] as SyntaxNodeLike, moduleScope: childScope });
    }
  }

  return symbols.sort((a, b) => a.line - b.line);
}

/**
 * Un símbolo con su posición y, si es una función, su complejidad.
 *
 * `complexity` llega desde fuera cuando el recorrido ya la calculó para las
 * métricas del fichero: es la misma función y no hay que volver a medirla.
 */
export function describeSymbol(
  name: string,
  kind: ParsedSymbol["kind"],
  node: SyntaxNodeLike,
  nameNode?: SyntaxNodeLike | null,
  complexity?: number
): ParsedSymbol {
  const symbol: ParsedSymbol = {
    name,
    kind,
    line: node.startPosition.row + 1,
    // La ficha necesita el cuerpo entero para enseñar el código del símbolo
    // (ADR 0067): no solo las funciones tienen líneas.
    lines: node.endPosition.row - node.startPosition.row + 1,
    hash: bodyHash(node, nameNode)
  };

  if (kind === "function") {
    symbol.complexity = complexity ?? functionComplexity(node);
  }

  return symbol;
}
