import fs from "node:fs";
import path from "node:path";
import Parser from "tree-sitter";
import TypeScript from "tree-sitter-typescript";
import { describe, expect, it } from "vitest";
import {
  collectImports,
  measureSource,
  usesTsxGrammar,
  type SyntaxNodeLike
} from "../src/ts/measure";
import { collectSymbols } from "../src/ts/symbols";
import { analyzeTree } from "../src/ts/tree";

// `analyzeTree` recorre el árbol una sola vez para métricas, importaciones y
// símbolos. Tiene que dar **exactamente** lo mismo que las tres funciones por
// separado: si cambia una coma, cambia el checksum del snapshot (ADR 0004).

const tsParser = new Parser();
tsParser.setLanguage(TypeScript.typescript);
const tsxParser = new Parser();
tsxParser.setLanguage(TypeScript.tsx);

function rootOf(source: string, filePath: string): SyntaxNodeLike {
  const parser = usesTsxGrammar(filePath) ? tsxParser : tsParser;
  return parser.parse(source, undefined, {
    bufferSize: Math.max(64 * 1024, Buffer.byteLength(source, "utf8") + 1)
  }).rootNode as unknown as SyntaxNodeLike;
}

/** El camino viejo: tres recorridos del mismo árbol. */
function inThreePasses(source: string, filePath: string) {
  const root = rootOf(source, filePath);
  return {
    metrics: measureSource(source, root),
    imports: collectImports(root),
    symbols: collectSymbols(root)
  };
}

function inOnePass(source: string, filePath: string) {
  return analyzeTree(source, rootOf(source, filePath));
}

const SAMPLES: Array<{ file: string; source: string }> = [
  {
    file: "src/vacio.ts",
    source: ""
  },
  {
    file: "src/comentarios.ts",
    source: [
      "// solo un comentario, sin código",
      "/* y un bloque",
      "   de varias líneas */",
      ""
    ].join("\n")
  },
  {
    file: "src/imports.ts",
    source: [
      'import fs from "node:fs";',
      'import { a, b } from "./a";',
      'import type { C } from "./c";',
      'import data from "./data.json" with { type: "json" };',
      'export { d as e } from "./d";',
      'export * from "./f";',
      'export type { G } from "./g";',
      'export const here = 1;',
      'const lazy = await import("./lazy");',
      'const legacy = require("./legacy");',
      'const object = { nested: require("./nested") };'
    ].join("\n")
  },
  {
    file: "src/simbolos.ts",
    source: [
      "export interface Shape {",
      "  area(): number;",
      "  label?: string;",
      "}",
      "",
      "type Kind = \"circle\" | \"square\";",
      "",
      "enum Size { Small, Large }",
      "",
      "abstract class Base {",
      "  abstract draw(): void;",
      "  protected helper(value: number) {",
      "    return value > 0 ? value : -value;",
      "  }",
      "}",
      "",
      "class Circle extends Base {",
      "  constructor(private readonly radius: number) {",
      "    super();",
      "  }",
      "",
      "  draw() {",
      "    if (this.radius > 0 && this.radius < 10) {",
      "      console.log(this.radius);",
      "    }",
      "  }",
      "}",
      "",
      "export function make(kind: Kind, size: Size): Base {",
      "  return kind === \"circle\" ? new Circle(1) : ({} as Base);",
      "}",
      "",
      "export const arrow = (x: number) => (x ? x : 0);",
      "const wrapped = function (y: number) {",
      "  while (y > 0) y--;",
      "  return y;",
      "};",
      "const generator = function* () {",
      "  yield 1;",
      "};"
    ].join("\n")
  },
  {
    file: "src/anidadas.ts",
    source: [
      "function outer(a: number) {",
      "  function inner(b: number) {",
      "    if (b) return 1;",
      "    if (b > 1) return 2;",
      "  }",
      "  const deep = () => {",
      "    try {",
      "      return inner(a) ?? 0;",
      "    } catch {",
      "      return 0;",
      "    }",
      "  };",
      "  for (const item of [1, 2]) {",
      "    deep();",
      "  }",
      "  return inner(a);",
      "}"
    ].join("\n")
  },
  {
    file: "src/vista.tsx",
    source: [
      'import { useState } from "react";',
      "",
      "export function Counter({ start }: { start: number }) {",
      "  const [value, setValue] = useState(start);",
      "  return (",
      "    <button",
      "      onClick={() => setValue(value + 1)}",
      "      title={`valor ${value}`}",
      "    >",
      "      {value}",
      "    </button>",
      "  );",
      "}"
    ].join("\n")
  },
  {
    file: "src/sobrecargas.ts",
    source: [
      "export function parse(value: string): number;",
      "export function parse(value: number): string;",
      "export function parse(value: string | number) {",
      "  return typeof value === \"string\" ? Number(value) : String(value);",
      "}"
    ].join("\n")
  },
  {
    file: "src/formato.ts",
    source: [
      "const value = 1;",
      "",
      "",
      "/* separación generosa */",
      "",
      "",
      "function spaced() {",
      "",
      "  return value;",
      "}",
      ""
    ].join("\n")
  }
];

function repoFiles(): string[] {
  const root = path.resolve(import.meta.dirname, "..", "..", "..");
  const roots = [
    "packages/parsers/src",
    "packages/schema/src",
    "packages/metrics/src",
    "packages/layouts/src",
    "packages/ui/src",
    "apps/desktop/src",
    "apps/web/src",
    "apps/cli/src"
  ];
  const files: string[] = [];

  for (const directory of roots) {
    const start = path.join(root, directory);
    if (!fs.existsSync(start)) continue;
    const stack = [start];
    while (stack.length > 0) {
      const current = stack.pop() as string;
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) stack.push(full);
        else if (/\.(ts|tsx|mts|cts|js|mjs|cjs)$/.test(entry.name)) {
          files.push(full);
        }
      }
    }
  }

  return files.sort();
}

describe("analyzeTree · una pasada, el mismo resultado", () => {
  for (const sample of SAMPLES) {
    it(`da lo mismo que las tres pasadas en ${sample.file}`, () => {
      expect(inOnePass(sample.source, sample.file)).toEqual(
        inThreePasses(sample.source, sample.file)
      );
    });
  }

  it("da lo mismo fichero a fichero en el código del propio repositorio", () => {
    const files = repoFiles();
    expect(files.length).toBeGreaterThan(100);

    for (const file of files) {
      const source = fs.readFileSync(file, "utf8");
      const relative = path.relative(process.cwd(), file).replaceAll("\\", "/");
      // La ruta va dentro del valor para que el fallo diga qué fichero es.
      expect({ file: relative, ...inOnePass(source, file) }).toEqual({
        file: relative,
        ...inThreePasses(source, file)
      });
    }
  });

  it("es determinista: dos pasadas dan lo mismo", () => {
    const source = SAMPLES[3]!.source;
    expect(inOnePass(source, "src/a.ts")).toEqual(inOnePass(source, "src/a.ts"));
  });
});
