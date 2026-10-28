import { bodyHash } from "../hash";
import { countLines, isComment, type SyntaxNodeLike } from "../syntax";
import type {
  Metrics,
  ParsedImport,
  ParsedMember,
  ParsedSymbol
} from "../types";

/**
 * Todo lo que sale de un fichero Java, en un solo recorrido (ADR 0090).
 *
 * Es el hermano de `ts/tree.ts`: métricas, importaciones, símbolos y miembros
 * del mismo árbol, sin retenerlo. Los dos parsers —nativo y WASM— pasan por
 * aquí, así que el CLI y el navegador dan los mismos números y el checksum del
 * snapshot coincide.
 *
 * Lo que no hay es superficie de exportación: Java no exporta nombres, publica
 * lo que declara. La lista de salidas se queda vacía y la ficha lo enseña así.
 */
export interface JavaAnalysis {
  metrics: Metrics;
  imports: ParsedImport[];
  symbols: ParsedSymbol[];
  members: ParsedMember[];
}

/** Los tipos con nombre propio que el modelo conoce. */
export const JAVA_TYPE_KINDS: Record<string, ParsedSymbol["kind"]> = {
  class_declaration: "class",
  record_declaration: "class",
  interface_declaration: "interface",
  annotation_type_declaration: "interface",
  enum_declaration: "enum"
};

/**
 * Nodos con cuerpo de función. Un método de interfaz sin cuerpo no cuenta: no
 * hay nada que medir, igual que una firma en TS.
 */
export const JAVA_FUNCTION_TYPES = new Set([
  "method_declaration",
  "constructor_declaration"
]);

/** Puntos de decisión de complejidad ciclomática. */
const DECISION_TYPES = new Set([
  "if_statement",
  "for_statement",
  "enhanced_for_statement",
  "while_statement",
  "do_statement",
  "switch_label",
  "catch_clause",
  "ternary_expression"
]);

const LOGICAL_OPERATORS = new Set(["&&", "||"]);

export function analyzeJavaTree(source: string, root: SyntaxNodeLike): JavaAnalysis {
  const codeLines = new Set<number>();
  const imports: ParsedImport[] = [];
  const symbols: ParsedSymbol[] = [];
  const members: ParsedMember[] = [];

  let functions = 0;
  let maxComplexity = 0;
  let maxFunctionLength = 0;

  const stack: SyntaxNodeLike[] = [root];

  while (stack.length > 0) {
    const node = stack.pop() as SyntaxNodeLike;

    // Hojas: líneas con código. Los comentarios son hojas y no cuentan.
    if (node.childCount === 0) {
      if (!isComment(node.text) && node.text.trim() !== "") {
        for (let row = node.startPosition.row; row <= node.endPosition.row; row++) {
          codeLines.add(row);
        }
      }
      continue;
    }

    const isFunction = JAVA_FUNCTION_TYPES.has(node.type);
    const body = isFunction ? node.childForFieldName("body") : null;
    const complexity = isFunction && body ? javaComplexity(node) : 1;

    if (isFunction && body) {
      functions++;
      const length = node.endPosition.row - node.startPosition.row + 1;
      if (complexity > maxComplexity) maxComplexity = complexity;
      if (length > maxFunctionLength) maxFunctionLength = length;
    }

    // Los hijos se piden una sola vez por nodo: en el binding nativo cada
    // acceso los vuelve a materializar.
    const children = node.children;

    if (node.type === "import_declaration") {
      const nameNode = node.namedChildren.find(
        (child) => child.type === "scoped_identifier" || child.type === "identifier"
      );
      const wildcard = children.some((child) => child.type === "asterisk");
      if (nameNode) {
        imports.push({
          specifier: `${nameNode.text}${wildcard ? ".*" : ""}`,
          kind: "static",
          typeOnly: false,
          line: node.startPosition.row + 1
        });
      }
    }

    const typeKind = JAVA_TYPE_KINDS[node.type];
    if (typeKind) {
      const nameNode = node.childForFieldName("name");
      const name = nameNode?.text;
      if (name) {
        symbols.push(describeJavaSymbol(name, typeKind, node, nameNode));
        members.push(...membersOfType(node, name));
      }
    } else if (isFunction) {
      const nameNode = node.childForFieldName("name");
      const name = nameNode?.text;
      if (name) {
        symbols.push(
          describeJavaSymbol(
            name,
            "function",
            node,
            nameNode,
            body ? complexity : undefined
          )
        );
      }
    }

    // Al revés, para visitar el fuente en orden.
    for (let index = children.length - 1; index >= 0; index--) {
      stack.push(children[index] as SyntaxNodeLike);
    }
  }

  symbols.sort((left, right) => left.line - right.line);
  members.sort((left, right) => left.line - right.line);

  return {
    metrics: {
      loc: countLines(source),
      rloc: codeLines.size,
      functions,
      maxComplexity,
      maxFunctionLength
    },
    imports,
    symbols,
    members
  };
}

/**
 * Complejidad ciclomática de un método: 1 + decisiones de su cuerpo.
 *
 * No desciende a métodos anidados (una clase local dentro de un método): cada
 * uno se mide por separado. Un `switch` cuenta una vez por etiqueta —también en
 * la forma de flecha, donde cada regla lleva la suya—.
 */
export function javaComplexity(fn: SyntaxNodeLike): number {
  let complexity = 1;
  const body = fn.childForFieldName("body");
  const stack: SyntaxNodeLike[] = body ? [body] : [];

  while (stack.length > 0) {
    const node = stack.pop() as SyntaxNodeLike;
    if (JAVA_FUNCTION_TYPES.has(node.type)) continue;

    if (DECISION_TYPES.has(node.type)) complexity++;

    if (node.type === "binary_expression") {
      const operator = node.childForFieldName("operator")?.text;
      if (operator && LOGICAL_OPERATORS.has(operator)) complexity++;
    }

    for (const child of node.children) stack.push(child);
  }

  return complexity;
}

/**
 * Un símbolo con su posición y, si es un método, su complejidad.
 *
 * El hash del cuerpo es el mismo cálculo que en TS: el renombrado no lo mueve,
 * el cuerpo sí.
 */
export function describeJavaSymbol(
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
    lines: node.endPosition.row - node.startPosition.row + 1,
    hash: bodyHash(node, nameNode)
  };

  if (kind === "function") {
    symbol.complexity = complexity ?? javaComplexity(node);
  }

  return symbol;
}

/**
 * Los campos de un tipo, y los componentes de un `record`.
 *
 * Java declara varios campos en una línea (`int a, b;`), así que cada
 * `variable_declarator` es un miembro. En un `record` el estado son sus
 * componentes, que funcionan como campos finales.
 */
export function membersOfType(
  typeNode: SyntaxNodeLike,
  owner: string
): ParsedMember[] {
  const members: ParsedMember[] = [];

  const parameters = typeNode.childForFieldName("parameters");
  if (typeNode.type === "record_declaration" && parameters) {
    for (const parameter of parameters.namedChildren) {
      if (parameter.type !== "formal_parameter") continue;
      const nameNode = parameter.childForFieldName("name");
      if (!nameNode) continue;
      members.push({
        owner,
        name: nameNode.text,
        line: parameter.startPosition.row + 1,
        lines: parameter.endPosition.row - parameter.startPosition.row + 1,
        from: "field"
      });
    }
  }

  const body = typeNode.childForFieldName("body");
  if (!body) return members.sort((left, right) => left.line - right.line);

  for (const declaration of body.namedChildren) {
    if (declaration.type !== "field_declaration") continue;
    for (const declarator of declaration.namedChildren) {
      if (declarator.type !== "variable_declarator") continue;
      const nameNode = declarator.childForFieldName("name");
      if (!nameNode) continue;
      members.push({
        owner,
        name: nameNode.text,
        line: declarator.startPosition.row + 1,
        lines: declarator.endPosition.row - declarator.startPosition.row + 1,
        from: "field"
      });
    }
  }

  return members.sort((left, right) => left.line - right.line);
}
