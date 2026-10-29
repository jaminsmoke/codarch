import { cyclomaticComplexity, type ComplexityRules } from "../cyclomatic";
import { bodyHash } from "../hash";
import {
  countLines,
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
 * Todo lo que sale de un fichero Python, en un solo recorrido (ADR 0090).
 *
 * Es el hermano de `java/analyze.ts`: métricas, importaciones, símbolos y
 * miembros del mismo árbol, sin retenerlo. Los dos parsers —nativo y WASM—
 * pasan por aquí, así que el CLI y el navegador dan los mismos números y el
 * checksum del snapshot coincide.
 *
 * Lo que no hay es superficie de exportación: Python no exporta nombres, un
 * módulo publica lo que no empieza por guion bajo. La lista de salidas se queda
 * vacía y la ficha lo enseña así.
 */
export interface PythonAnalysis {
  metrics: Metrics;
  imports: ParsedImport[];
  symbols: ParsedSymbol[];
  members: ParsedMember[];
}

/**
 * Puntos de decisión de complejidad ciclomática.
 *
 * `else` y `finally` no cuentan: no abren un camino nuevo. `elif` sí, y es un
 * nodo propio. `if_clause` es el filtro de una comprensión (`[x for x in y if
 * x]`): también ramifica.
 */
const DECISION_TYPES = new Set([
  "if_statement",
  "elif_clause",
  "for_statement",
  "while_statement",
  "except_clause",
  "case_clause",
  "conditional_expression",
  "if_clause"
]);

const LOGICAL_OPERATORS = new Set(["and", "or"]);

/** Las reglas de Python para el motor de complejidad. */
const COMPLEXITY: ComplexityRules = {
  decisions: DECISION_TYPES,
  skip: new Set(["function_definition", "class_definition"]),
  logical: { node: "boolean_operator", field: "operator", operators: LOGICAL_OPERATORS }
};

/**
 * Si el nodo es un comentario.
 *
 * Aquí basta el tipo de nodo —Python lo marca como `comment` en las dos
 * gramáticas—, y es más fiable que mirar el texto: un `#` dentro de un string
 * no es un comentario. Por eso Python no usa `isComment`: en TS el texto es lo
 * que funciona, porque la gramática nativa tipa el comentario como su padre.
 */
export function isPythonComment(node: SyntaxNodeLike): boolean {
  return node.type === "comment";
}

export function analyzePythonTree(
  source: string,
  root: SyntaxNodeLike
): PythonAnalysis {
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
      if (!isPythonComment(node) && node.text.trim() !== "") {
        for (let row = node.startPosition.row; row <= node.endPosition.row; row++) {
          codeLines.add(row);
        }
      }
      continue;
    }

    // Los hijos se piden una sola vez por nodo: en el binding nativo cada
    // acceso los vuelve a materializar.
    const children = node.children;

    if (node.type === "module") {
      symbols.push(...moduleVariables(node));
    }

    if (node.type === "import_statement" || node.type === "import_from_statement") {
      imports.push(...readImports(node));
    }

    if (node.type === "class_definition") {
      declareClass(node, { symbols, members });
    } else if (node.type === "function_definition") {
      declareFunction(node, { symbols, tally });
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

/** Una clase declarada y, de paso, los atributos que declara. */
function declareClass(
  node: SyntaxNodeLike,
  python: { symbols: ParsedSymbol[]; members: ParsedMember[] }
): void {
  const nameNode = node.childForFieldName("name");
  const name = nameNode?.text;
  if (!name) return;

  python.symbols.push(describePythonSymbol(name, "class", node, nameNode));
  python.members.push(...membersOfClass(node, name));
}

/**
 * Una función o un método: su símbolo y, si tiene cuerpo, lo que se mide de él.
 *
 * En Python toda `def` tiene cuerpo; la comprobación se queda por simetría con
 * los demás lenguajes y porque la firma de `describePythonSymbol` la pide.
 */
function declareFunction(
  node: SyntaxNodeLike,
  python: { symbols: ParsedSymbol[]; tally: FunctionTally }
): void {
  const body = node.childForFieldName("body");
  const complexity = body ? cyclomaticComplexity(node, COMPLEXITY) : 1;
  if (body) tallyFunction(python.tally, node, complexity);

  const nameNode = node.childForFieldName("name");
  const name = nameNode?.text;
  if (!name) return;
  python.symbols.push(
    describePythonSymbol(
      name,
      "function",
      node,
      nameNode,
      body ? complexity : undefined
    )
  );
}

/**
 * Un símbolo con su posición y, si es una función, su complejidad.
 *
 * El hash del cuerpo es el mismo cálculo que en TS y Java, con el comentario
 * detectado por tipo de nodo: el renombrado no lo mueve, el cuerpo sí.
 */
export function describePythonSymbol(
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
    hash: bodyHash(node, nameNode, isPythonComment)
  };

  if (kind === "function") {
    symbol.complexity = complexity ?? cyclomaticComplexity(node, COMPLEXITY);
  }

  return symbol;
}

/**
 * Las constantes de módulo.
 *
 * Solo las asignaciones que cuelgan del módulo: `LIMITE = 10` es un símbolo del
 * fichero, `total = 0` dentro de una función no, igual que en TS (ADR 0063).
 * Una asignación a un atributo o a una tupla no es un nombre propio y no entra.
 */
function moduleVariables(moduleNode: SyntaxNodeLike): ParsedSymbol[] {
  const symbols: ParsedSymbol[] = [];

  for (const child of moduleNode.namedChildren) {
    if (child.type !== "expression_statement") continue;
    const assignment = child.namedChildren[0];
    if (assignment?.type !== "assignment") continue;
    const left = assignment.childForFieldName("left");
    if (left?.type !== "identifier") continue;
    symbols.push({
      name: left.text,
      kind: "variable",
      line: assignment.startPosition.row + 1,
      lines: assignment.endPosition.row - assignment.startPosition.row + 1,
      hash: bodyHash(assignment, left, isPythonComment)
    });
  }

  return symbols;
}

/**
 * Los campos de una clase.
 *
 * Python declara el estado de dos maneras y las dos cuentan: una asignación en
 * el cuerpo de la clase (`total = 0`) y una asignación a `self` dentro de un
 * método (`self.total = total`), que es como se declara de verdad. Un atributo
 * asignado en dos métodos es un solo campo: gana la primera línea.
 */
export function membersOfClass(
  classNode: SyntaxNodeLike,
  owner: string
): ParsedMember[] {
  const body = classNode.childForFieldName("body");
  const members: ParsedMember[] = [];
  if (!body) return members;

  for (const child of body.namedChildren) {
    if (child.type === "expression_statement") {
      const assignment = child.namedChildren[0];
      if (assignment?.type !== "assignment") continue;
      const left = assignment.childForFieldName("left");
      if (left?.type !== "identifier") continue;
      members.push({
        owner,
        name: left.text,
        line: left.startPosition.row + 1,
        lines: 1,
        from: "field"
      });
      continue;
    }

    if (child.type === "function_definition") {
      collectSelfAttributes(child, owner, members);
      continue;
    }

    if (child.type === "decorated_definition") {
      const definition = child.childForFieldName("definition");
      if (definition?.type === "function_definition") {
        collectSelfAttributes(definition, owner, members);
      }
    }
  }

  // Primero se ordena por línea y luego se quita el repetido: así el campo se
  // queda donde se declara por primera vez.
  members.sort((left, right) => left.line - right.line);
  const seen = new Set<string>();
  const unique: ParsedMember[] = [];
  for (const member of members) {
    if (seen.has(member.name)) continue;
    seen.add(member.name);
    unique.push(member);
  }
  return unique;
}

/** Los `self.x = …` de un método. Una clase anidada lleva los suyos. */
function collectSelfAttributes(
  method: SyntaxNodeLike,
  owner: string,
  members: ParsedMember[]
): void {
  const stack: SyntaxNodeLike[] = [method];

  while (stack.length > 0) {
    const node = stack.pop() as SyntaxNodeLike;
    // Una clase anidada declara sus campos con sus métodos, no con este.
    if (node.type === "class_definition") continue;

    if (node.type === "assignment") {
      const left = node.childForFieldName("left");
      if (left?.type === "attribute") {
        const object = left.childForFieldName("object");
        const attribute = left.childForFieldName("attribute");
        if (object?.text === "self" && attribute) {
          members.push({
            owner,
            name: attribute.text,
            line: attribute.startPosition.row + 1,
            lines: 1,
            from: "field"
          });
        }
      }
    }

    for (const child of node.children) stack.push(child);
  }
}

/**
 * Las importaciones de una sentencia.
 *
 * `import a.b` es un módulo; `from a.b import C, D` es el módulo `a.b` con dos
 * nombres que pueden ser submódulos o nombres del propio módulo. Los nombres
 * viajan en el import para que la resolución pueda probar las dos cosas.
 */
function readImports(node: SyntaxNodeLike): ParsedImport[] {
  const line = node.startPosition.row + 1;

  if (node.type === "import_statement") {
    const imports: ParsedImport[] = [];
    for (const child of node.namedChildren) {
      const name = child.type === "aliased_import"
        ? child.childForFieldName("name")
        : child.type === "dotted_name"
          ? child
          : null;
      if (!name) continue;
      const alias = child.type === "aliased_import"
        ? child.childForFieldName("alias")?.text
        : undefined;
      imports.push({
        specifier: name.text,
        kind: "static",
        typeOnly: false,
        line,
        ...(alias ? { names: [alias] } : {})
      });
    }
    return imports;
  }

  const moduleNode = node.childForFieldName("module_name");
  const specifier = moduleNode?.text ?? "";
  const names: string[] = [];
  let wildcard = false;

  for (const child of node.namedChildren) {
    if (moduleNode && sameNode(child, moduleNode)) continue;
    if (child.type === "wildcard_import") {
      wildcard = true;
      continue;
    }
    if (child.type === "dotted_name") {
      names.push(child.text);
      continue;
    }
    if (child.type === "aliased_import") {
      const name = child.childForFieldName("name");
      if (name) names.push(name.text);
    }
  }

  if (wildcard) {
    // `from x import *` no apunta a un fichero: la resolución lo cuenta como
    // dependencia y no crea arista.
    return [
      {
        specifier: specifier.endsWith(".") ? `${specifier}*` : `${specifier}.*`,
        kind: "static",
        typeOnly: false,
        line
      }
    ];
  }

  return [
    {
      specifier,
      kind: "static",
      typeOnly: false,
      line,
      ...(names.length > 0 ? { names } : {})
    }
  ];
}

/** Si dos nodos son el mismo del árbol.
 *
 * Se compara por posición: en el parser del navegador cada acceso devuelve un
 * envoltorio nuevo, así que la identidad no sirve.
 */
function sameNode(left: SyntaxNodeLike, right: SyntaxNodeLike): boolean {
  return (
    left.type === right.type &&
    left.startPosition.row === right.startPosition.row &&
    left.startPosition.column === right.startPosition.column &&
    left.endPosition.row === right.endPosition.row &&
    left.endPosition.column === right.endPosition.column
  );
}
