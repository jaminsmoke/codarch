import type {
  Metrics,
  ParsedExport,
  ParsedImport,
  ParsedMember,
  ParsedSymbol
} from "../types";
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
import {
  exportSurface,
  importedNames,
  membersOfClass
} from "./structure";

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
  /** Campos y propiedades del constructor, agrupados por clase (ADR 0064). */
  members: ParsedMember[];
  /** Declaraciones exportadas y reexportaciones. */
  exports: ParsedExport[];
}

/** Lo que se va acumulando durante el recorrido. */
interface WalkState {
  /** Líneas con al menos un token de código. */
  codeLines: Set<number>;
  imports: ParsedImport[];
  symbols: ParsedSymbol[];
  members: ParsedMember[];
  exports: ParsedExport[];
  /**
   * Complejidad ya medida, por posición (los nodos son envoltorios nuevos en
   * cada acceso, así que no sirven como clave).
   */
  complexityAt: Map<string, number>;
  functions: number;
  maxComplexity: number;
  maxFunctionLength: number;
}

/**
 * Recorre el árbol una vez y devuelve las tres cosas.
 *
 * Se empuja a la pila al revés para visitar el fuente en orden: es el mismo
 * recorrido que hacía `collectImports`, así que las importaciones salen en el
 * mismo orden. Los símbolos se ordenan por línea al final, como antes.
 */
export function analyzeTree(source: string, root: SyntaxNodeLike): TreeAnalysis {
  const state: WalkState = {
    codeLines: new Set<number>(),
    imports: [],
    symbols: [],
    members: [],
    exports: [],
    complexityAt: new Map<string, number>(),
    functions: 0,
    maxComplexity: 0,
    maxFunctionLength: 0
  };

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
      markCodeLines(node, state.codeLines);
      continue;
    }

    if (FUNCTION_TYPES.has(node.type)) measureFunctionNode(node, state);

    // Los hijos se piden **una vez** por nodo: en el binding nativo cada
    // acceso los vuelve a materializar en JS, y es lo que más cuesta del
    // análisis.
    const children = node.children;

    collectImports(node, children, state);
    collectDeclaration(node, moduleScope, state);

    // Al revés, para visitar el fuente en orden.
    const childScope = moduleScope && MODULE_SCOPE_WRAPPERS.has(node.type);
    for (let index = children.length - 1; index >= 0; index--) {
      stack.push({ node: children[index] as SyntaxNodeLike, moduleScope: childScope });
    }
  }

  state.symbols.sort((left, right) => left.line - right.line);
  state.members.sort((left, right) => left.line - right.line);
  state.exports.sort((left, right) => left.line - right.line);

  return {
    metrics: {
      loc: countLines(source),
      rloc: state.codeLines.size,
      functions: state.functions,
      maxComplexity: state.maxComplexity,
      maxFunctionLength: state.maxFunctionLength
    },
    imports: state.imports,
    symbols: state.symbols,
    members: state.members,
    exports: state.exports
  };
}

/** Una hoja suma sus líneas si tiene código: los comentarios no cuentan. */
function markCodeLines(node: SyntaxNodeLike, codeLines: Set<number>): void {
  if (isComment(node.text) || node.text.trim() === "") return;
  for (let row = node.startPosition.row; row <= node.endPosition.row; row++) {
    codeLines.add(row);
  }
}

/** Cuenta la función y actualiza los dos máximos del fichero. */
function measureFunctionNode(node: SyntaxNodeLike, state: WalkState): void {
  state.functions++;
  const complexity = complexityOf(node, state.complexityAt);
  const length = node.endPosition.row - node.startPosition.row + 1;
  if (complexity > state.maxComplexity) state.maxComplexity = complexity;
  if (length > state.maxFunctionLength) state.maxFunctionLength = length;
}

/**
 * Las importaciones salen de tres sitios: un `import`, un `export ... from`
 * (que también exporta) y un `require()`/`import()` de una llamada.
 */
function collectImports(
  node: SyntaxNodeLike,
  children: readonly SyntaxNodeLike[],
  state: WalkState
): void {
  if (node.type === "import_statement") {
    pushImportStatement(node, children, state.imports);
  } else if (node.type === "export_statement") {
    pushExportStatement(node, children, state);
  } else if (node.type === "call_expression") {
    pushCallImport(node, state.imports);
  }
}

function pushImportStatement(
  node: SyntaxNodeLike,
  children: readonly SyntaxNodeLike[],
  imports: ParsedImport[]
): void {
  const sourceNode = findImportSource(node);
  const specifier = sourceNode ? stringLiteralValue(sourceNode) : null;
  if (specifier === null) return;

  const isRequire = node.namedChildren.some(
    (child) => child.type === "import_require_clause"
  );
  const names = importedNames(node);
  imports.push({
    specifier,
    kind: isRequire ? "require" : "static",
    typeOnly: children.some((child) => child.type === "type"),
    line: node.startPosition.row + 1,
    ...(names.length > 0 ? { names } : {})
  });
}

function pushExportStatement(
  node: SyntaxNodeLike,
  children: readonly SyntaxNodeLike[],
  state: WalkState
): void {
  state.exports.push(...exportSurface(node));

  const sourceNode = node.childForFieldName("source");
  const specifier = sourceNode ? stringLiteralValue(sourceNode) : null;
  if (specifier === null) return;

  state.imports.push({
    specifier,
    kind: "export",
    typeOnly: children.some((child) => child.type === "type"),
    line: node.startPosition.row + 1
  });
}

function pushCallImport(node: SyntaxNodeLike, imports: ParsedImport[]): void {
  const kind = callImportKind(node);
  if (!kind) return;

  const argumentsNode = node.childForFieldName("arguments");
  const first = argumentsNode?.namedChildren[0];
  const specifier = first ? stringLiteralValue(first) : null;
  if (specifier === null) return;

  imports.push({
    specifier,
    kind,
    typeOnly: false,
    line: node.startPosition.row + 1
  });
}

/**
 * Declaraciones con nombre propio (`function`, `class`, `interface`, …) y
 * declaradores de variable, que pueden esconder una función, una clase o un
 * simple valor.
 */
function collectDeclaration(
  node: SyntaxNodeLike,
  moduleScope: boolean,
  state: WalkState
): void {
  const kind = DECLARATION_KINDS[node.type];
  if (kind) {
    collectNamedDeclaration(node, kind, state);
    return;
  }
  if (node.type === "variable_declarator") {
    collectDeclarator(node, moduleScope, state);
  }
}

function collectNamedDeclaration(
  node: SyntaxNodeLike,
  kind: ParsedSymbol["kind"],
  state: WalkState
): void {
  const nameNode = node.childForFieldName("name");
  const name = nameNode?.text;
  if (!name) return;

  state.symbols.push(
    describeSymbol(
      name,
      kind,
      node,
      nameNode,
      // La función de este nodo ya se midió arriba, en las métricas.
      state.complexityAt.get(positionKey(node))
    )
  );
  if (kind === "class") state.members.push(...membersOfClass(node, name));
}

function collectDeclarator(
  node: SyntaxNodeLike,
  moduleScope: boolean,
  state: WalkState
): void {
  const nameNode = node.childForFieldName("name");
  const name = nameNode?.type === "identifier" ? nameNode.text : null;
  const value = node.childForFieldName("value");
  const declared = declaratorKind(value, moduleScope);
  if (!name || !value || !declared) return;

  if (declared === "function") {
    // La flecha todavía no se visitó (viene después): se mide aquí y se
    // guarda para que las métricas no la midan otra vez.
    state.symbols.push(
      describeSymbol(
        name,
        "function",
        value,
        undefined,
        complexityOf(value, state.complexityAt)
      )
    );
    return;
  }

  if (declared === "variable") {
    state.symbols.push(describeSymbol(name, "variable", node, nameNode));
    return;
  }

  state.symbols.push(describeSymbol(name, declared, value));
  if (declared === "class") state.members.push(...membersOfClass(value, name));
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
