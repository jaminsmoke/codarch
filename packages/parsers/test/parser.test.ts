import { describe, expect, it } from "vitest";
import { TypeScriptParser } from "../src/index";

const parser = new TypeScriptParser();

describe("TypeScriptParser · métricas", () => {
  it("cuenta loc, sloc, funciones, complejidad y longitud máxima", () => {
    const source = `// comment
const top = 1;

function outer(a: number) {
  if (a > 0 && a < 10) {
    return a;
  }
  for (let i = 0; i < 2; i++) {
    console.log(i);
  }
  return 0;
}

const arrow = (x: number) => {
  return x ? x : 0;
};`;

    expect(parser.parse(source, "src/x.ts").metrics).toEqual({
      loc: 16,
      rloc: 13,
      functions: 2,
      maxComplexity: 4,
      maxFunctionLength: 9
    });
  });

  it("no mezcla la complejidad de funciones anidadas", () => {
    const source = `function outer() {
  function inner() {
    if (a) {}
    if (b) {}
  }
  if (c) {}
}`;

    expect(parser.parse(source, "src/nested.ts").metrics).toEqual({
      loc: 7,
      rloc: 7,
      functions: 2,
      maxComplexity: 3,
      maxFunctionLength: 7
    });
  });

  it("mide el cuerpo de expresión de una arrow", () => {
    const source = [
      "const pick = (x: number) => x ? 1 : 0;",
      "const both = (a: boolean, b: boolean) => a && b;",
      "const block = (x: number) => { return x ? 1 : 0; };"
    ].join("\n");

    expect(parser.parse(source, "src/expresion.ts").metrics).toEqual({
      loc: 3,
      rloc: 3,
      functions: 3,
      maxComplexity: 2,
      maxFunctionLength: 1
    });
  });

  it("excluye comentarios y líneas en blanco del sloc", () => {
    const source = `/* block
 comment */
const a = 1; // trailing

// only
const b = 2;
`;

    expect(parser.parse(source, "src/comments.ts").metrics).toEqual({
      loc: 6,
      rloc: 2,
      functions: 0,
      maxComplexity: 0,
      maxFunctionLength: 0
    });
  });

  it("trata TSX y JSX con la gramática tsx", () => {
    const source = `export function App() {
  return <div>hola</div>;
}`;
    const result = parser.parse(source, "src/App.tsx");
    expect(result.metrics.functions).toBe(1);
    expect(result.metrics.rloc).toBe(3);
  });

  it(
    "parsea ficheros grandes por encima del buffer de 32 KB",
    () => {
      const body = Array.from(
        { length: 900 },
        (_, index) =>
          `const value${index} = ${index}; // ${"padding".repeat(6)}`
      ).join("\n");
      const source = `export function big() {\n${body}\n  return value0;\n}`;

      expect(source.length).toBeGreaterThan(32 * 1024);
      const result = parser.parse(source, "src/big.ts");
      expect(result.metrics.functions).toBe(1);
      expect(result.metrics.loc).toBeGreaterThan(900);
      expect(result.metrics.maxComplexity).toBe(1);
    },
    15_000
  );
});

describe("TypeScriptParser · imports", () => {
  it("extrae estáticos, type-only, reexports, dinámicos y require", () => {
    const source = `import x from "./a";
import type { Y } from "./b";
export * from "./c";
export type { Z } from "./d";
const l = import("./e");
const r = require("./f");
import foo = require("./g");
import "./h";
`;

    expect(parser.parse(source, "src/y.ts").imports).toEqual([
      { specifier: "./a", kind: "static", typeOnly: false, line: 1 },
      { specifier: "./b", kind: "static", typeOnly: true, line: 2 },
      { specifier: "./c", kind: "export", typeOnly: false, line: 3 },
      { specifier: "./d", kind: "export", typeOnly: true, line: 4 },
      { specifier: "./e", kind: "dynamic", typeOnly: false, line: 5 },
      { specifier: "./f", kind: "require", typeOnly: false, line: 6 },
      { specifier: "./g", kind: "require", typeOnly: false, line: 7 },
      { specifier: "./h", kind: "static", typeOnly: false, line: 8 }
    ]);
  });

  it("ignora imports con specifier no literal", () => {
    const source = `const name = "./a";
import(name);
require(name);
`;
    expect(parser.parse(source, "src/dynamic.ts").imports).toEqual([]);
  });
});
