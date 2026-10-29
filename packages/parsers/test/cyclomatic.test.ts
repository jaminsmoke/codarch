import { describe, expect, it } from "vitest";
import {
  cyclomaticComplexity,
  type ComplexityRules
} from "../src/cyclomatic";
import type { SyntaxNodeLike } from "../src/syntax";

/** Un nodo con lo justo que miran el motor y sus reglas. */
function node(
  type: string,
  children: SyntaxNodeLike[] = [],
  fields: Record<string, SyntaxNodeLike> = {}
): SyntaxNodeLike {
  return {
    type,
    text: type,
    childCount: children.length,
    children,
    namedChildren: children,
    startPosition: { row: 0, column: 0 },
    endPosition: { row: 0, column: 0 },
    childForFieldName: (name: string) => fields[name] ?? null
  };
}

/** Una función con el cuerpo dado. */
function fn(body: SyntaxNodeLike): SyntaxNodeLike {
  return node("function_declaration", [body], { body });
}

const rules: ComplexityRules = {
  decisions: new Set(["if_statement", "for_statement"]),
  skip: new Set(["function_declaration"])
};

describe("complejidad ciclomática", () => {
  it("una función sin decisiones vale 1", () => {
    expect(cyclomaticComplexity(fn(node("block")), rules)).toBe(1);
  });

  it("cada decisión de su cuerpo suma uno", () => {
    const body = node("block", [
      node("if_statement", [node("call")]),
      node("for_statement", [node("if_statement")])
    ]);
    // El `if` de dentro del `for` también cuenta: los dos están en el cuerpo.
    expect(cyclomaticComplexity(fn(body), rules)).toBe(4);
  });

  it("no desciende a lo que se mide por su cuenta", () => {
    const nested = fn(node("if_statement"));
    const body = node("block", [node("if_statement"), nested]);
    expect(cyclomaticComplexity(fn(body), rules)).toBe(2);
  });

  it("una función sin cuerpo no tiene decisiones que contar", () => {
    const signature = node("function_declaration");
    expect(cyclomaticComplexity(signature, rules)).toBe(1);
  });
});

describe("las reglas de cada lenguaje", () => {
  it("cuenta el operador lógico que vive en un campo", () => {
    const withOperator = (operator: string) =>
      node("binary_expression", [], { operator: node(operator) });
    const fieldRules: ComplexityRules = {
      decisions: new Set(),
      skip: new Set(),
      logical: { node: "binary_expression", field: "operator", operators: new Set(["&&", "||"]) }
    };
    expect(cyclomaticComplexity(fn(withOperator("&&")), fieldRules)).toBe(2);
    expect(cyclomaticComplexity(fn(withOperator("and")), fieldRules)).toBe(1);
  });

  it("cuenta el operador lógico que es un nodo hijo", () => {
    const childRules: ComplexityRules = {
      decisions: new Set(),
      skip: new Set(),
      logical: { node: "binary_expression", operators: new Set(["&&", "||"]) }
    };
    const withChild = node("binary_expression", [node("identifier"), node("||"), node("identifier")]);
    expect(cyclomaticComplexity(fn(withChild), childRules)).toBe(2);
  });

  it("deja las decisiones que no son un tipo de nodo a la regla extra", () => {
    const extraRules: ComplexityRules = {
      decisions: new Set(),
      skip: new Set(),
      extra: (value) => (value.type === "switch_section" && value.children[0]?.type !== "default" ? 1 : 0)
    };
    const labelled = node("block", [
      node("switch_section", [node("case")]),
      node("switch_section", [node("default")])
    ]);
    expect(cyclomaticComplexity(fn(labelled), extraRules)).toBe(2);
  });
});
