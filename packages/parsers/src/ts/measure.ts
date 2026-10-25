import type { ImportKind, Metrics, ParsedImport } from "../types";
import { importedNames } from "./structure";
import { stringLiteralValue } from "./strings";

/**
 * Subconjunto de la API de nodos de tree-sitter que usa la medición.
 *
 * Lo comparten el binding nativo (`tree-sitter`) y el WASM (`web-tree-sitter`):
 * ambos exponen los mismos nodos, así que el cálculo de métricas es el mismo
 * código y el navegador da los mismos números que el CLI.
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
 * Nodos que representan una función implementada. Las firmas de interfaces y
 * los métodos abstractos no cuentan: no tienen cuerpo que medir.
 */
export const FUNCTION_TYPES = new Set([
  "function_declaration",
  "function_expression",
  "arrow_function",
  "method_definition",
  "generator_function_declaration",
  "generator_function"
]);

/** Puntos de decisión de complejidad ciclomática. */
const DECISION_TYPES = new Set([
  "if_statement",
  "for_statement",
  "for_in_statement",
  "while_statement",
  "do_statement",
  "switch_case",
  "catch_clause",
  "ternary_expression",
  "conditional_expression"
]);

const LOGICAL_OPERATORS = new Set(["&&", "||", "??"]);

/**
 * `.tsx`, `.jsx` y los `.js` usan la gramática con JSX; el resto, la de TS.
 */
export function usesTsxGrammar(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return (
    lower.endsWith(".tsx") ||
    lower.endsWith(".jsx") ||
    lower.endsWith(".js") ||
    lower.endsWith(".mjs") ||
    lower.endsWith(".cjs")
  );
}

/**
 * Detecta un comentario por su texto, no por su tipo de nodo.
 *
 * El tipo no sirve: dentro de un `interface` el binding nativo tipa el
 * comentario como `interface_body` (hereda el tipo del padre), mientras que
 * el WASM lo tipa como `comment`. Con la regla por texto los dos builds
 * cuentan las mismas líneas de código.
 */
export function isComment(text: string): boolean {
  return text.startsWith("//") || text.startsWith("/*") || text.startsWith("#!");
}

/** Si el texto es un comentario. Lo exported porque el hash del cuerpo lo necesita. */
export function commentText(text: string): boolean {
  return isComment(text);
}

/**
 * Agregados por fichero a partir del árbol de sintaxis.
 *
 * Recorre el árbol por su cuenta. El análisis de un fichero necesita además
 * las importaciones y los símbolos, y cada recorrido vuelve a materializar los
 * hijos de cada nodo en el binding: por eso el camino normal es `analyzeTree`
 * (`tree.ts`), que hace las tres cosas en una sola pasada. Esta función se
 * queda para lo que solo quiere métricas.
 */
export function measureSource(source: string, root: SyntaxNodeLike): Metrics {
  const codeLines = new Set<number>();
  const stack: SyntaxNodeLike[] = [root];
  let functions = 0;
  let maxComplexity = 0;
  let maxFunctionLength = 0;

  while (stack.length > 0) {
    const node = stack.pop() as SyntaxNodeLike;

    if (node.childCount === 0) {
      // Los comentarios son hojas. Se detectan por texto porque el tipo de
      // nodo no es fiable entre el binding nativo y el WASM.
      if (isComment(node.text)) continue;
      if (node.text.trim() !== "") {
        for (let row = node.startPosition.row; row <= node.endPosition.row; row++) {
          codeLines.add(row);
        }
      }
      continue;
    }

    if (FUNCTION_TYPES.has(node.type)) {
      functions++;
      const complexity = functionComplexity(node);
      const length = node.endPosition.row - node.startPosition.row + 1;
      if (complexity > maxComplexity) maxComplexity = complexity;
      if (length > maxFunctionLength) maxFunctionLength = length;
    }

    for (const child of node.children) stack.push(child);
  }

  return {
    loc: countLines(source),
    rloc: codeLines.size,
    functions,
    maxComplexity,
    maxFunctionLength
  };
}

/**
 * Complejidad ciclomática de una función: 1 + decisiones de su cuerpo.
 * No desciende a funciones anidadas: cada una se mide por separado.
 */
export function functionComplexity(fn: SyntaxNodeLike): number {
  let complexity = 1;
  const body = fn.childForFieldName("body");
  const stack: SyntaxNodeLike[] = [];

  // El cuerpo también se visita: en una arrow de expresión, el `?:`, el `&&`
  // o el `??` está en el propio nodo del cuerpo, no en sus hijos (ADR 0040).
  if (body) {
    stack.push(body);
  } else {
    for (const child of fn.children) stack.push(child);
  }

  while (stack.length > 0) {
    const node = stack.pop() as SyntaxNodeLike;
    if (FUNCTION_TYPES.has(node.type)) continue;

    if (DECISION_TYPES.has(node.type)) complexity++;

    if (
      node.type === "binary_expression" ||
      node.type === "augmented_assignment_expression"
    ) {
      const operator = node.childForFieldName("operator")?.text;
      if (operator && LOGICAL_OPERATORS.has(operator)) complexity++;
    }

    for (const child of node.children) stack.push(child);
  }

  return complexity;
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

/**
 * Importaciones, reexportaciones e imports dinámicos o por `require`.
 *
 * Como `measureSource`, recorre el árbol por su cuenta; el camino normal para
 * un fichero del análisis es `analyzeTree`.
 */
export function collectImports(root: SyntaxNodeLike): ParsedImport[] {
  const imports: ParsedImport[] = [];
  const stack: SyntaxNodeLike[] = [root];

  while (stack.length > 0) {
    const node = stack.pop() as SyntaxNodeLike;

    if (node.type === "import_statement") {
      const source = findImportSource(node);
      const specifier = source ? stringLiteralValue(source) : null;
      if (specifier !== null) {
        const isRequire = node.namedChildren.some(
          (child) => child.type === "import_require_clause"
        );
        const names = importedNames(node);
        imports.push({
          specifier,
          kind: isRequire ? "require" : "static",
          typeOnly: node.children.some((child) => child.type === "type"),
          line: node.startPosition.row + 1,
          ...(names.length > 0 ? { names } : {})
        });
      }
    } else if (node.type === "export_statement") {
      const source = node.childForFieldName("source");
      const specifier = source ? stringLiteralValue(source) : null;
      if (specifier !== null) {
        imports.push({
          specifier,
          kind: "export",
          typeOnly: node.children.some((child) => child.type === "type"),
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

    // Stack LIFO: empujar en orden inverso para recorrer el fuente en orden.
    for (let index = node.children.length - 1; index >= 0; index--) {
      stack.push(node.children[index] as SyntaxNodeLike);
    }
  }

  return imports;
}

export function findImportSource(
  node: SyntaxNodeLike
): SyntaxNodeLike | null {
  const direct = node.childForFieldName("source");
  if (direct) return direct;

  const clause = node.namedChildren.find(
    (child) => child.type === "import_require_clause"
  );
  return clause?.childForFieldName("source") ?? null;
}

export function callImportKind(node: SyntaxNodeLike): ImportKind | null {
  const fn = node.childForFieldName("function");
  if (!fn) return null;
  if (fn.type === "import") return "dynamic";
  if (fn.type === "identifier" && fn.text === "require") return "require";
  return null;
}

export { stringLiteralValue } from "./strings";
