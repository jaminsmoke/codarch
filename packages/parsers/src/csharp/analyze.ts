import { bodyHash } from "../hash";
import { countLines, type SyntaxNodeLike } from "../syntax";
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

export function analyzeCSharpTree(
  source: string,
  root: SyntaxNodeLike
): CSharpAnalysis {
  const codeLines = new Set<number>();
  const imports: ParsedImport[] = [];
  const symbols: ParsedSymbol[] = [];
  const members: ParsedMember[] = [];
  const namespaces: string[] = [];

  let functions = 0;
  let maxComplexity = 0;
  let maxFunctionLength = 0;

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
      const nameNode = node.childForFieldName("name");
      const name = nameNode?.text;
      if (name) {
        symbols.push(describeCSharpSymbol(name, typeKind, node, nameNode));
        members.push(...membersOfType(node, name));
      }
    } else if (CSHARP_FUNCTION_TYPES.has(node.type)) {
      const body = node.childForFieldName("body");
      const complexity = body ? csharpComplexity(node) : 1;
      if (body) {
        functions++;
        const length = node.endPosition.row - node.startPosition.row + 1;
        if (complexity > maxComplexity) maxComplexity = complexity;
        if (length > maxFunctionLength) maxFunctionLength = length;
      }

      const nameNode = node.childForFieldName("name");
      const name = nameNode?.text;
      if (name) {
        symbols.push(
          describeCSharpSymbol(
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
      functions,
      maxComplexity,
      maxFunctionLength
    },
    imports,
    symbols,
    members,
    namespaces
  };
}

/**
 * Complejidad ciclomática de un método: 1 + decisiones de su cuerpo.
 *
 * No desciende a lo que se mide aparte: otro método de una clase anidada. Una
 * lambda y una función local sí quedan dentro del método que las escribe.
 */
export function csharpComplexity(fn: SyntaxNodeLike): number {
  let complexity = 1;
  const body = fn.childForFieldName("body");
  const stack: SyntaxNodeLike[] = body ? [body] : [];

  while (stack.length > 0) {
    const node = stack.pop() as SyntaxNodeLike;
    if (CSHARP_FUNCTION_TYPES.has(node.type)) continue;

    if (DECISION_TYPES.has(node.type)) complexity++;

    // Un `case` es una sección; `default` no cuenta.
    if (node.type === "switch_section") {
      const first = node.children[0];
      if (first?.type !== "default") complexity++;
    }

    if (node.type === "binary_expression") {
      for (const child of node.children) {
        if (LOGICAL_OPERATORS.has(child.type)) {
          complexity++;
          break;
        }
      }
    }

    for (const child of node.children) stack.push(child);
  }

  return complexity;
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
    symbol.complexity = complexity ?? csharpComplexity(node);
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
