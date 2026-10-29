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
 * Todo lo que sale de un fichero C#, en un solo recorrido (ADR 0090).
 *
 * Es el hermano de `java/analyze.ts`, `python/analyze.ts` y `go/analyze.ts`:
 * métricas, importaciones, símbolos, miembros y —lo que solo tiene C#— los
 * espacios de nombres que declara el fichero, que son la unidad con la que se
 * resuelven sus `using`. Los dos parsers —nativo y WASM— pasan por aquí, así
 * que el CLI y el navegador dan los mismos números.
 *
 * C# tampoco tiene superficie de exportación: publica lo que declara con
 * modificador de acceso. La lista de salidas se queda vacía.
 */
export interface CSharpAnalysis {
  metrics: Metrics;
  imports: ParsedImport[];
  symbols: ParsedSymbol[];
  members: ParsedMember[];
  /**
   * Los espacios de nombres que declara el fichero, con el nombre completo.
   *
   * Un `namespace Acme.Billing;` de fichero entero y un `namespace Acme {
   * namespace Billing { } }` anidado dan el mismo: `Acme.Billing`.
   */
  namespaces: string[];
}

/** Los tipos con nombre propio. */
export const CSHARP_TYPE_KINDS: Record<string, ParsedSymbol["kind"]> = {
  class_declaration: "class",
  struct_declaration: "class",
  record_declaration: "class",
  interface_declaration: "interface",
  enum_declaration: "enum",
  // Un `delegate` declara un tipo, no una función: la función es su valor.
  delegate_declaration: "type"
};

/** Nodos con cuerpo de función. */
export const CSHARP_FUNCTION_TYPES = new Set([
  "method_declaration",
  "constructor_declaration"
]);

/**
 * Puntos de decisión de complejidad ciclomática.
 *
 * Cada `case` cuenta una vez —también en una `switch expression`, donde la
 * etiqueta es un `switch_expression_arm`—; `default` no, porque no abre camino,
 * igual que en Go.
 */
const DECISION_TYPES = new Set([
  "if_statement",
  "for_statement",
  "foreach_statement",
  "while_statement",
  "do_statement",
  "catch_clause",
  "conditional_expression",
  "switch_expression_arm"
]);

const LOGICAL_OPERATORS = new Set(["&&", "||"]);

/**
 * Las reglas de C# para el motor de complejidad.
 *
 * El `default` de un `switch` no abre camino, y por eso una sección de `switch`
 * solo cuenta si su etiqueta no lo es: eso va en `extra`, que sí mira el nodo.
 */
const COMPLEXITY: ComplexityRules = {
  decisions: DECISION_TYPES,
  skip: CSHARP_FUNCTION_TYPES,
  logical: { node: "binary_expression", operators: LOGICAL_OPERATORS },
  extra: (node) =>
    node.type === "switch_section" && node.children[0]?.type !== "default" ? 1 : 0
};

export function analyzeCSharpTree(
  source: string,
  root: SyntaxNodeLike
): CSharpAnalysis {
  const codeLines = new Set<number>();
  const imports: ParsedImport[] = [];
  const symbols: ParsedSymbol[] = [];
  const members: ParsedMember[] = [];
  const namespaces: string[] = [];

  const tally: FunctionTally = { functions: 0, maxComplexity: 0, maxFunctionLength: 0 };

  /**
   * El espacio de nombres en el que estamos: un `namespace` de bloque puede
   * llevar otro dentro, y el nombre completo se compone al bajar.
   */
  const stack: Array<{ node: SyntaxNodeLike; namespace: string }> = [
    { node: root, namespace: "" }
  ];

  while (stack.length > 0) {
    const { node, namespace } = stack.pop() as {
      node: SyntaxNodeLike;
      namespace: string;
    };

    // Hojas: líneas con código. Un comentario de C# empieza por `//` o `/*`.
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

    if (
      node.type === "namespace_declaration" ||
      node.type === "file_scoped_namespace_declaration"
    ) {
      const name = node.childForFieldName("name")?.text;
      if (name) {
        const full = namespace === "" ? name : `${namespace}.${name}`;
        namespaces.push(full);
        for (let index = children.length - 1; index >= 0; index--) {
          stack.push({ node: children[index] as SyntaxNodeLike, namespace: full });
        }
        continue;
      }
    }

    if (node.type === "using_directive") {
      const imported = readUsing(node);
      if (imported) imports.push(imported);
    }

    const typeKind = CSHARP_TYPE_KINDS[node.type];
    if (typeKind) {
      declareType(node, typeKind, { symbols, members });
    } else if (CSHARP_FUNCTION_TYPES.has(node.type)) {
      declareMethod(node, { symbols, tally });
    }

    // Al revés, para visitar el fuente en orden.
    for (let index = children.length - 1; index >= 0; index--) {
      stack.push({
        node: children[index] as SyntaxNodeLike,
        namespace
      });
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
    members,
    namespaces
  };
}

/** Un tipo declarado y, de paso, los miembros que declara. */
function declareType(
  node: SyntaxNodeLike,
  kind: ParsedSymbol["kind"],
  csharp: { symbols: ParsedSymbol[]; members: ParsedMember[] }
): void {
  const nameNode = node.childForFieldName("name");
  const name = nameNode?.text;
  if (!name) return;

  csharp.symbols.push(describeCSharpSymbol(name, kind, node, nameNode));
  csharp.members.push(...membersOfType(node, name));
}

/**
 * Un método o un constructor: su símbolo y, si tiene cuerpo, lo que se mide.
 *
 * Una declaración sin cuerpo —un método abstracto o el de una interfaz— no
 * cuenta como función, pero sí declara el nombre.
 */
function declareMethod(
  node: SyntaxNodeLike,
  csharp: { symbols: ParsedSymbol[]; tally: FunctionTally }
): void {
  const body = node.childForFieldName("body");
  const complexity = body ? cyclomaticComplexity(node, COMPLEXITY) : 1;
  if (body) tallyFunction(csharp.tally, node, complexity);

  const nameNode = node.childForFieldName("name");
  const name = nameNode?.text;
  if (!name) return;
  csharp.symbols.push(
    describeCSharpSymbol(
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
 * El hash del cuerpo es el mismo cálculo que en los demás lenguajes, con el
 * comentario detectado por texto: en C# `//` y `/*` no empiezan un literal,
 * porque un literal empieza por comilla o por `@`.
 */
export function describeCSharpSymbol(
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
 * Los campos y las propiedades de un tipo.
 *
 * Un campo declara varios nombres en una línea (`int a = 1, b = 2;`) y cada uno
 * es un miembro. Una propiedad con cuerpo de expresión (`public int X => 1;`)
 * también: es estado con nombre, no un método. Y un record con parámetros
 * posicionales declara una propiedad por cada uno: `record Money(int Cents)`
 * tiene `Cents`.
 */
export function membersOfType(
  typeNode: SyntaxNodeLike,
  owner: string
): ParsedMember[] {
  const members: ParsedMember[] = [];

  // Solo un record: sus parámetros posicionales son propiedades. Los de un
  // delegado (`delegate void H(int value)`) son la firma, no estado.
  const parameters =
    typeNode.type === "record_declaration"
      ? typeNode.namedChildren.find((child) => child.type === "parameter_list")
      : undefined;
  for (const parameter of parameters?.namedChildren ?? []) {
    if (parameter.type !== "parameter") continue;
    const nameNode = parameter.childForFieldName("name");
    if (!nameNode) continue;
    members.push({
      owner,
      name: nameNode.text,
      line: nameNode.startPosition.row + 1,
      lines: 1,
      from: "parameter"
    });
  }

  const body = typeNode.childForFieldName("body");
  if (!body) return members;

  for (const declaration of body.namedChildren) {
    if (declaration.type === "field_declaration") {
      for (const variable of declaration.namedChildren) {
        if (variable.type !== "variable_declaration") continue;
        for (const declarator of variable.namedChildren) {
          if (declarator.type !== "variable_declarator") continue;
          const nameNode = declarator.childForFieldName("name");
          if (!nameNode) continue;
          members.push({
            owner,
            name: nameNode.text,
            line: nameNode.startPosition.row + 1,
            lines: 1,
            from: "field"
          });
        }
      }
      continue;
    }

    if (declaration.type === "property_declaration") {
      const nameNode = declaration.childForFieldName("name");
      if (!nameNode) continue;
      members.push({
        owner,
        name: nameNode.text,
        line: nameNode.startPosition.row + 1,
        lines: 1,
        from: "field"
      });
    }
  }

  return members;
}

/**
 * El espacio de nombres de un `using`.
 *
 * Un alias (`using Json = Newtonsoft.Json;`) y un `using static` no dependen de
 * un espacio de nombres: el primero nombra un tipo y el segundo importa sus
 * miembros. La decisión dice que no crean arista, así que no se emiten como
 * import: contarlos como dependencia de fuera sería mentir en el número.
 */
function readUsing(node: SyntaxNodeLike): ParsedImport | null {
  for (const child of node.children) {
    if (child.type === "static") return null;
  }

  const alias = node.childForFieldName("name");
  if (alias) return null;

  const target = node.namedChildren[0];
  if (!target) return null;

  return {
    specifier: target.text,
    kind: "static",
    typeOnly: false,
    line: node.startPosition.row + 1
  };
}

/** Si el texto empieza un comentario de C#. */
function startsComment(text: string): boolean {
  return text.startsWith("//") || text.startsWith("/*");
}
