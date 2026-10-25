import type { Metrics, ParsedImport, ParsedSymbol } from "../types";
import {
  FUNCTION_TYPES,
  callImportKind,
  countLines,
  findImportSource,
  functionComplexity,
  isComment,
  stringLiteralValue,
  type SyntaxNodeLike
} from "./measure";
import {
  DECLARATION_KINDS,
  MODULE_SCOPE_WRAPPERS,
  declaratorKind,
  describeSymbol
} from "./symbols";

/**
 * Todo lo que sale de un fichero, en **un solo recorrido** del árbol.
 *
 * Métricas, importaciones y símbolos miran el mismo árbol. Hacerlos por
 * separado (`measureSource`, `collectImports`, `collectSymbols`) recorre el
 * árbol tres veces, y cada visita vuelve a materializar en JS los hijos de cada
 * nodo: en el binding nativo eso es la mayor parte del tiempo de análisis
 * (medido en este repositorio: 4,7 s de 4,9 s para 294 ficheros).
 *
 * El resultado es **exactamente** el de las tres funciones por separado; el
 * test `tree.test.ts` lo comprueba fichero a fichero. Los dos parsers —nativo y
 * WASM— pasan por aquí, así que el checksum no cambia.
 */
export interface TreeAnalysis {
  metrics: Metrics;
  imports: ParsedImport[];
  symbols: ParsedSymbol[];
}

/**
 * Recorre el árbol una vez y devuelve las tres cosas.
 *
 * Se empuja a la pila al revés para visitar el fuente en orden: es el mismo
 * recorrido que hacía `collectImports`, así que las importaciones salen en el
 * mismo orden. Los símbolos se ordenan por línea al final, como antes.
 */
export function analyzeTree(source: string, root: SyntaxNodeLike): TreeAnalysis {
  const codeLines = new Set<number>();
  const imports: ParsedImport[] = [];
  const symbols: ParsedSymbol[] = [];
  /**
   * Complejidad ya medida, por posición (los nodos son envoltorios nuevos en
   * cada acceso, así que no sirven como clave).
   */
  const complexityAt = new Map<string, number>();

  let functions = 0;
  let maxComplexity = 0;
  let maxFunctionLength = 0;

  const stack: Array<{ node: SyntaxNodeLike; moduleScope: boolean }> = [
    { node: root, moduleScope: true }
  ];

  while (stack.length > 0) {
    const { node, moduleScope } = stack.pop() as {
      node: SyntaxNodeLike;
      moduleScope: boolean;
    };

    // Hojas: líneas con código. Los comentarios son hojas y no cuentan.
    if (node.childCount === 0) {
      if (!isComment(node.text) && node.text.trim() !== "") {
        for (let row = node.startPosition.row; row <= node.endPosition.row; row++) {
          codeLines.add(row);
        }
      }
      continue;
    }

    if (FUNCTION_TYPES.has(node.type)) {
      functions++;
      const complexity = complexityOf(node, complexityAt);
      const length = node.endPosition.row - node.startPosition.row + 1;
      if (complexity > maxComplexity) maxComplexity = complexity;
      if (length > maxFunctionLength) maxFunctionLength = length;
    }

    // Los hijos se piden **una vez** por nodo: en el binding nativo cada
    // acceso los vuelve a materializar en JS, y es lo que más cuesta del
    // análisis.
    const children = node.children;

    if (node.type === "import_statement") {
      const sourceNode = findImportSource(node);
      const specifier = sourceNode ? stringLiteralValue(sourceNode) : null;
      if (specifier !== null) {
        const isRequire = node.namedChildren.some(
          (child) => child.type === "import_require_clause"
        );
        imports.push({
          specifier,
          kind: isRequire ? "require" : "static",
          typeOnly: children.some((child) => child.type === "type"),
          line: node.startPosition.row + 1
        });
      }
    } else if (node.type === "export_statement") {
      const sourceNode = node.childForFieldName("source");
      const specifier = sourceNode ? stringLiteralValue(sourceNode) : null;
      if (specifier !== null) {
        imports.push({
          specifier,
          kind: "export",
          typeOnly: children.some((child) => child.type === "type"),
          line: node.startPosition.row + 1
        });
      }
    } else if (node.type === "call_expression") {
      const kind = callImportKind(node);
      if (kind) {
        const argumentsNode = node.childForFieldName("arguments");
        const first = argumentsNode?.namedChildren[0];
        const specifier = first ? stringLiteralValue(first) : null;
        if (specifier !== null) {
          imports.push({
            specifier,
            kind,
            typeOnly: false,
            line: node.startPosition.row + 1
          });
        }
      }
    }

    const kind = DECLARATION_KINDS[node.type];
    if (kind) {
      const nameNode = node.childForFieldName("name");
      const name = nameNode?.text;
      if (name) {
        symbols.push(
          describeSymbol(
            name,
            kind,
            node,
            nameNode,
            // La función de este nodo ya se midió arriba, en las métricas.
            complexityAt.get(positionKey(node))
          )
        );
      }
    } else if (node.type === "variable_declarator") {
      const nameNode = node.childForFieldName("name");
      const name = nameNode?.type === "identifier" ? nameNode.text : null;
      const value = node.childForFieldName("value");
      const declared = declaratorKind(value, moduleScope);
      if (name && value && declared) {
        if (declared === "function") {
          // La flecha todavía no se visitó (viene después): se mide aquí y se
          // guarda para que las métricas no la midan otra vez.
          symbols.push(
            describeSymbol(
              name,
              "function",
              value,
              undefined,
              complexityOf(value, complexityAt)
            )
          );
        } else if (declared === "variable") {
          symbols.push(describeSymbol(name, "variable", node, nameNode));
        } else {
          symbols.push(describeSymbol(name, declared, value));
        }
      }
    }

    // Al revés, para visitar el fuente en orden.
    const childScope = moduleScope && MODULE_SCOPE_WRAPPERS.has(node.type);
    for (let index = children.length - 1; index >= 0; index--) {
      stack.push({ node: children[index] as SyntaxNodeLike, moduleScope: childScope });
    }
  }

  symbols.sort((left, right) => left.line - right.line);

  return {
    metrics: {
      loc: countLines(source),
      rloc: codeLines.size,
      functions,
      maxComplexity,
      maxFunctionLength
    },
    imports,
    symbols
  };
}

/** La complejidad de un nodo, medida una sola vez por fichero. */
function complexityOf(
  node: SyntaxNodeLike,
  cache: Map<string, number>
): number {
  const key = positionKey(node);
  const known = cache.get(key);
  if (known !== undefined) return known;
  const complexity = functionComplexity(node);
  cache.set(key, complexity);
  return complexity;
}

function positionKey(node: SyntaxNodeLike): string {
  return `${node.startPosition.row}:${node.startPosition.column}`;
}
