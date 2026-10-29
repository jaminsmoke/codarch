import type { SyntaxNodeLike } from "./syntax";

/**
 * El operador lógico, cuando el lenguaje lo guarda como nodo del árbol.
 *
 * C# y Go lo dejan como hijo de la expresión (`&&` es un nodo más); Java y
 * Python lo guardan en un campo `operator`.
 */
export interface LogicalRule {
  /** Tipo del nodo que envuelve la operación. */
  node: string;
  /** Campo donde vive el operador; sin él, se busca por tipo entre los hijos. */
  field?: string;
  /** Los operadores que abren un camino: `&&`/`||`, `and`/`or`. */
  operators: ReadonlySet<string>;
}

/** Cómo cuenta un lenguaje los caminos de una función. */
export interface ComplexityRules {
  /** Tipos de nodo que abren un camino. */
  decisions: ReadonlySet<string>;
  /**
   * Nodos que se miden por su cuenta: al encontrarlos no se baja.
   *
   * Es lo que impide que un método anidado sume sus decisiones al de fuera.
   */
  skip: ReadonlySet<string>;
  logical?: LogicalRule;
  /**
   * Decisiones que no dependen solo del tipo de nodo.
   *
   * Un `case` de C# es un `switch_section`, y si su etiqueta es `default` no
   * abre camino: eso no cabe en un conjunto de tipos.
   */
  extra?: (node: SyntaxNodeLike) => number;
}

/**
 * Complejidad ciclomática de una función: 1 + los caminos de su cuerpo.
 *
 * Recorre en profundidad sin recursión y sin retener el árbol, como el resto de
 * los analizadores (ADR 0090): una lambda o una función local quedan dentro de
 * la función que las escribe, pero un nodo de `skip` se mide aparte.
 */
export function cyclomaticComplexity(
  fn: SyntaxNodeLike,
  rules: ComplexityRules
): number {
  let complexity = 1;
  const body = fn.childForFieldName("body");
  const stack: SyntaxNodeLike[] = body ? [body] : [];

  while (stack.length > 0) {
    const node = stack.pop() as SyntaxNodeLike;
    if (rules.skip.has(node.type)) continue;

    if (rules.decisions.has(node.type)) complexity++;
    if (rules.extra) complexity += rules.extra(node);
    if (isLogical(node, rules.logical)) complexity++;

    for (const child of node.children) stack.push(child);
  }

  return complexity;
}

/** Si el nodo es una operación lógica que abre un camino. */
function isLogical(node: SyntaxNodeLike, rule?: LogicalRule): boolean {
  if (!rule || node.type !== rule.node) return false;

  if (rule.field) {
    const operator = node.childForFieldName(rule.field)?.text;
    return operator !== undefined && rule.operators.has(operator);
  }

  return node.children.some((child) => rule.operators.has(child.type));
}
