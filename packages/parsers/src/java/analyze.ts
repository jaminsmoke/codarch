import { cyclomaticComplexity, type ComplexityRules } from "../cyclomatic";
import { bodyHash } from "../hash";
import {
  countLines,
  isComment,
  tallyFunction,
  type FunctionTally,
  type SyntaxNodeLike
} from "../syntax";
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

/** Las reglas de Java para el motor de complejidad. */
const COMPLEXITY: ComplexityRules = {
  decisions: DECISION_TYPES,
  skip: JAVA_FUNCTION_TYPES,
  logical: { node: "binary_expression", field: "operator", operators: LOGICAL_OPERATORS }
};

export function analyzeJavaTree(source: string, root: SyntaxNodeLike): JavaAnalysis {
  const codeLines = new Set<number>();
  const imports: ParsedImport[] = [];
  const symbols: ParsedSymbol[] = [];
  const members: ParsedMember[] = [];

  const tally: FunctionTally = { functions: 0, maxComplexity: 0, maxFunctionLength: 0 };

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

    // Los hijos se piden una sola vez por nodo: en el binding nativo cada
    // acceso los vuelve a materializar.
    const children = node.children;

    if (node.type === "import_declaration") {
      const imported = readImport(node);
      if (imported) imports.push(imported);
    }

    const typeKind = JAVA_TYPE_KINDS[node.type];
    if (typeKind) {
      declareType(node, typeKind, { symbols, members });
    } else if (JAVA_FUNCTION_TYPES.has(node.type)) {
      declareMethod(node, { symbols, tally });
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
      functions: tally.functions,
      maxComplexity: tally.maxComplexity,
      maxFunctionLength: tally.maxFunctionLength
    },
    imports,
    symbols,
    members
  };
}

/** El `import` de Java, con su comodín si lo lleva. */
function readImport(node: SyntaxNodeLike): ParsedImport | null {
  const nameNode = node.namedChildren.find(
    (child) => child.type === "scoped_identifier" || child.type === "identifier"
  );
  if (!nameNode) return null;

  const wildcard = node.children.some((child) => child.type === "asterisk");
  return {
    specifier: `${nameNode.text}${wildcard ? ".*" : ""}`,
    kind: "static",
    typeOnly: false,
    line: node.startPosition.row + 1
  };
}

/** Un tipo declarado y, de paso, los miembros que declara. */
function declareType(
  node: SyntaxNodeLike,
  kind: ParsedSymbol["kind"],
  java: { symbols: ParsedSymbol[]; members: ParsedMember[] }
): void {
  const nameNode = node.childForFieldName("name");
  const name = nameNode?.text;
  if (!name) return;

  java.symbols.push(describeJavaSymbol(name, kind, node, nameNode));
  java.members.push(...membersOfType(node, name));
}

/**
 * Un método: su símbolo y, si tiene cuerpo, lo que se mide de él.
 *
 * Un método abstracto o de interfaz sin cuerpo no cuenta como función, pero sí
 * declara el nombre.
 */
function declareMethod(
  node: SyntaxNodeLike,
  java: { symbols: ParsedSymbol[]; tally: FunctionTally }
): void {
  const body = node.childForFieldName("body");
  const complexity = body ? cyclomaticComplexity(node, COMPLEXITY) : 1;
  if (body) tallyFunction(java.tally, node, complexity);

  const nameNode = node.childForFieldName("name");
  const name = nameNode?.text;
  if (!name) return;
  java.symbols.push(
    describeJavaSymbol(
      name,
      "function",
      node,
      nameNode,
      body ? complexity : undefined
    )
  );
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
    symbol.complexity = complexity ?? cyclomaticComplexity(node, COMPLEXITY);
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
