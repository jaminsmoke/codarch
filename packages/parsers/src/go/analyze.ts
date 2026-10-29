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
 * Todo lo que sale de un fichero Go, en un solo recorrido (ADR 0090).
 *
 * Es el hermano de `java/analyze.ts` y `python/analyze.ts`: métricas,
 * importaciones, símbolos y miembros del mismo árbol, sin retenerlo. Los dos
 * parsers —nativo y WASM— pasan por aquí, así que el CLI y el navegador dan los
 * mismos números y el checksum del snapshot coincide.
 *
 * Go no tiene superficie de exportación: un nombre es público si empieza por
 * mayúscula. La lista de salidas se queda vacía y la ficha lo enseña así.
 */
export interface GoAnalysis {
  metrics: Metrics;
  imports: ParsedImport[];
  symbols: ParsedSymbol[];
  members: ParsedMember[];
}

/**
 * Los tipos con nombre propio: un `struct` es una clase, una `interface` una
 * interfaz, y cualquier otro tipo declarado —`type ID int`— es un tipo.
 */
export const GO_TYPE_KINDS: Record<string, ParsedSymbol["kind"]> = {
  struct_type: "class",
  interface_type: "interface"
};

/** Nodos con cuerpo de función: una función libre y un método con receptor. */
export const GO_FUNCTION_TYPES = new Set([
  "function_declaration",
  "method_declaration"
]);

/**
 * Puntos de decisión de complejidad ciclomática.
 *
 * Cada `case` cuenta una vez, también en un `type switch` y en un `select`;
 * `default` no, porque no abre camino. Un `else if` es un `if_statement`
 * anidado y se cuenta por su cuenta.
 */
const DECISION_TYPES = new Set([
  "if_statement",
  "for_statement",
  "expression_case",
  "type_case",
  "communication_case"
]);

const LOGICAL_OPERATORS = new Set(["&&", "||"]);

/** Las reglas de Go para el motor de complejidad. */
const COMPLEXITY: ComplexityRules = {
  decisions: DECISION_TYPES,
  skip: GO_FUNCTION_TYPES,
  logical: { node: "binary_expression", field: "operator", operators: LOGICAL_OPERATORS }
};

export function analyzeGoTree(source: string, root: SyntaxNodeLike): GoAnalysis {
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
      if (node.text.trim() !== "" && !startsComment(node.text)) {
        for (let row = node.startPosition.row; row <= node.endPosition.row; row++) {
          codeLines.add(row);
        }
      }
      continue;
    }

    // Los hijos se piden una sola vez por nodo: en el binding nativo cada
    // acceso los vuelve a materializar.
    const children = node.children;

    if (node.type === "source_file") {
      symbols.push(...packageVariables(node));
    }

    if (node.type === "import_declaration") {
      imports.push(...readImports(node));
    }

    if (node.type === "type_spec") {
      declareType(node, { symbols, members });
    } else if (GO_FUNCTION_TYPES.has(node.type)) {
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

/** Lo que van llenando los manejadores de declaración. */
interface GoDeclarations {
  symbols: ParsedSymbol[];
  members: ParsedMember[];
  tally: FunctionTally;
}

/** Un `type_spec`: el nombre, su clase y —si es un `struct`— sus campos. */
function declareType(
  node: SyntaxNodeLike,
  go: Pick<GoDeclarations, "symbols" | "members">
): void {
  const nameNode = node.childForFieldName("name");
  const type = node.childForFieldName("type");
  const name = nameNode?.text;
  if (!name || !type) return;

  go.symbols.push(
    describeGoSymbol(name, GO_TYPE_KINDS[type.type] ?? "type", node, nameNode)
  );
  if (type.type === "struct_type") go.members.push(...fieldsOfStruct(type, name));
}

/**
 * Una función o un método: su símbolo y, si tiene cuerpo, lo que se mide de él.
 *
 * Una firma sin cuerpo —la de una función ensambladora— no cuenta como
 * función, pero sí declara el nombre.
 */
function declareFunction(
  node: SyntaxNodeLike,
  go: Pick<GoDeclarations, "symbols" | "tally">
): void {
  const body = node.childForFieldName("body");
  const complexity = body ? cyclomaticComplexity(node, COMPLEXITY) : 1;
  if (body) tallyFunction(go.tally, node, complexity);

  const nameNode = node.childForFieldName("name");
  const name = nameNode?.text;
  if (!name) return;
  go.symbols.push(
    describeGoSymbol(name, "function", node, nameNode, body ? complexity : undefined)
  );
}

/**
 * Un símbolo con su posición y, si es una función, su complejidad.
 *
 * El hash del cuerpo es el mismo cálculo que en los demás lenguajes; el
 * comentario se detecta por texto, que en Go basta: `//` y `/*` no aparecen al
 * principio de un string, porque un string empieza por comilla o por acento
 * grave.
 */
export function describeGoSymbol(
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
 * Los campos de un `struct`.
 *
 * Un campo incrustado (`*money.Money`) no declara nombre —lo presta su tipo— y
 * no es miembro. Los métodos no son campos: van como símbolos.
 */
export function fieldsOfStruct(
  structNode: SyntaxNodeLike,
  owner: string
): ParsedMember[] {
  const members: ParsedMember[] = [];
  const list = structNode.namedChildren.find(
    (child) => child.type === "field_declaration_list"
  );
  if (!list) return members;

  for (const field of list.namedChildren) {
    if (field.type !== "field_declaration") continue;
    for (const child of field.namedChildren) {
      if (child.type !== "field_identifier") continue;
      members.push({
        owner,
        name: child.text,
        line: child.startPosition.row + 1,
        lines: 1,
        from: "field"
      });
    }
  }

  return members;
}

/**
 * Las constantes y variables del paquete.
 *
 * Solo las que cuelgan de `source_file`: `var total int` dentro de una función
 * es local y no es un símbolo del fichero, igual que en TS (ADR 0063).
 *
 * El hash es el del valor —o el del tipo, si no hay valor—, así que renombrar
 * la variable no lo mueve y cambiar lo que guarda sí.
 */
function packageVariables(sourceFile: SyntaxNodeLike): ParsedSymbol[] {
  const symbols: ParsedSymbol[] = [];

  for (const declaration of sourceFile.namedChildren) {
    if (
      declaration.type !== "const_declaration" &&
      declaration.type !== "var_declaration"
    ) {
      continue;
    }

    for (const spec of declaration.namedChildren) {
      if (spec.type !== "const_spec" && spec.type !== "var_spec") continue;
      const body =
        spec.childForFieldName("value") ?? spec.childForFieldName("type") ?? spec;
      const hash = bodyHash(body);

      for (const child of spec.namedChildren) {
        if (child.type !== "identifier") continue;
        symbols.push({
          name: child.text,
          kind: "variable",
          line: child.startPosition.row + 1,
          lines: 1,
          hash
        });
      }
    }
  }

  return symbols;
}

/**
 * Las importaciones de una declaración, con o sin paréntesis.
 *
 * El nombre del paquete no entra en el modelo: lo que se guarda es la ruta, que
 * es lo que se resuelve. Un alias se guarda como nombre para que la ficha lo
 * enseñe, salvo `_` y `.`, que no son alias sino formas de importar.
 */
function readImports(node: SyntaxNodeLike): ParsedImport[] {
  const imports: ParsedImport[] = [];
  const specs: SyntaxNodeLike[] = [];

  for (const child of node.namedChildren) {
    if (child.type === "import_spec_list") {
      for (const spec of child.namedChildren) {
        if (spec.type === "import_spec") specs.push(spec);
      }
      continue;
    }
    if (child.type === "import_spec") specs.push(child);
  }

  for (const spec of specs) {
    const pathNode = spec.childForFieldName("path");
    if (!pathNode) continue;
    const specifier = unquote(pathNode);
    if (specifier === "") continue;

    const alias = spec.childForFieldName("name")?.text;
    imports.push({
      specifier,
      kind: "static",
      typeOnly: false,
      line: spec.startPosition.row + 1,
      ...(alias && alias !== "_" && alias !== "." ? { names: [alias] } : {})
    });
  }

  return imports;
}

/** El texto de un literal de Go sin sus comillas. */
function unquote(node: SyntaxNodeLike): string {
  const content = node.namedChildren.find(
    (child) => child.type === "interpreted_string_literal_content"
  );
  if (content) return content.text;
  const text = node.text;
  return text.length >= 2 ? text.slice(1, -1) : text;
}

/** Si el texto empieza un comentario de Go. */
function startsComment(text: string): boolean {
  return text.startsWith("//") || text.startsWith("/*");
}
