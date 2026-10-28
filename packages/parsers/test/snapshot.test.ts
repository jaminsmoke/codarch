import { describe, expect, it } from "vitest";
import { fileId } from "@codarch/schema";
import { buildGraph } from "../src/graph";
import { buildSnapshot, type SnapshotFile } from "../src/snapshot";

const files: SnapshotFile[] = [
  {
    relativePath: "src/b/segundo.ts",
    metrics: { rloc: 30, loc: 40, maxComplexity: 9 },
    symbols: [
      { name: "segundo", kind: "function", line: 1, complexity: 9 },
      { name: "empate", kind: "function", line: 5, complexity: 9 },
      { name: "sinComplejidad", kind: "function", line: 9 }
    ],
    imports: [
      { specifier: "./a", kind: "static", typeOnly: false, line: 1, names: ["a"] },
      { specifier: "./cjs", kind: "require", typeOnly: true, line: 2, names: ["c"] },
      { specifier: "./re", kind: "export", typeOnly: false, line: 3, names: ["r"] }
    ],
    exports: [
      { name: "segundo", kind: "declaration", line: 1 },
      { name: "alias", local: "segundo", kind: "named", line: 2 },
      { name: "reexportado", source: "./a", kind: "all", typeOnly: true, line: 3 }
    ],
    members: [{ owner: "Caja", name: "valor", line: 4, from: "field" }]
  },
  { relativePath: "README.md", metrics: { loc: 12 } },
  {
    relativePath: "src/a/primero.ts",
    metrics: { rloc: 10, loc: 12, medidaDelAddon: 3 },
    symbols: [
      { name: "Clase", kind: "class", line: 1 },
      { name: "Iface", kind: "interface", line: 2 },
      { name: "Tipo", kind: "type", line: 3 },
      { name: "Enumerado", kind: "enum", line: 4 },
      { name: "constante", kind: "variable", line: 5 }
    ]
  }
];

const graph = buildGraph(
  ["src/a/primero.ts", "src/b/segundo.ts", "README.md"],
  [
    { from: "src/b/segundo.ts", to: "src/a/primero.ts" },
    { from: "src/a/primero.ts", to: "src/b/segundo.ts", typeOnly: true }
  ]
);

function input(commitHash?: string) {
  return { projectName: "demo", files, graph, ...(commitHash ? { commitHash } : {}) };
}

describe("buildSnapshot", () => {
  it("es determinista y no depende del commit en el checksum", () => {
    const first = buildSnapshot(input("abc123"));
    const second = buildSnapshot(input("abc123"));
    const otherCommit = buildSnapshot(input("ffffff"));

    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(first.meta.checksum).toMatch(/^[0-9a-f]{32}$/);
    // Dos clones del mismo código pesan igual: el commit no entra en el checksum.
    expect(otherCommit.meta.checksum).toBe(first.meta.checksum);
    expect(otherCommit.meta.commitHash).not.toBe(first.meta.commitHash);
  });

  it("pone las métricas conocidas antes que las que añade un addon", () => {
    const cc = buildSnapshot(input());
    // Las conocidas llevan descriptor; la del addon solo tipo, y va al final.
    expect(Object.keys(cc.lenses?.metrics?.attributeDescriptors ?? {})).toEqual([
      "loc",
      "rloc",
      "maxComplexity"
    ]);
    expect(Object.keys(cc.lenses?.metrics?.attributeTypes ?? {})).toEqual([
      "loc",
      "rloc",
      "maxComplexity",
      "medidaDelAddon"
    ]);
    expect(cc.lenses?.metrics?.attributes[fileId("src/a/primero.ts")]).toEqual({
      rloc: 10,
      loc: 12,
      medidaDelAddon: 3
    });
  });

  it("cuenta los símbolos, guarda el más complejo y no rompe con funciones sin complejidad", () => {
    const cc = buildSnapshot(input());
    const symbols = cc.lenses?.symbols;
    const summary = symbols?.summary;

    // Las claves siguen el orden de análisis: rutas ordenadas.
    expect(Object.keys(symbols?.nodes ?? {})).toEqual([
      fileId("src/a/primero.ts"),
      fileId("src/b/segundo.ts")
    ]);
    expect(summary).toMatchObject({
      symbols: 8,
      functions: 3,
      classes: 1,
      interfaces: 1,
      types: 1,
      enums: 1,
      variables: 1
    });
    // Empate a 9: gana el primero, y `sinComplejidad` no participa.
    expect(summary?.mostComplex).toEqual({
      path: "src/b/segundo.ts",
      name: "segundo",
      complexity: 9
    });
  });

  it("separa estructura de símbolos y descarta los imports de tipo export", () => {
    const cc = buildSnapshot(input());
    const structure = cc.lenses?.structure?.nodes[fileId("src/b/segundo.ts")];

    expect(structure?.imports.map((entry) => entry.source)).toEqual(["./a", "./cjs"]);
    expect(structure?.imports[1]).toMatchObject({ kind: "require", typeOnly: true });
    expect(structure?.exports).toEqual([
      { name: "segundo", kind: "declaration", line: 1 },
      { name: "alias", local: "segundo", kind: "named", line: 2 },
      { name: "reexportado", source: "./a", kind: "all", typeOnly: true, line: 3 }
    ]);
    expect(structure?.members).toEqual([{ owner: "Caja", name: "valor", line: 4, from: "field" }]);
    // README no aporta símbolos ni estructura: no aparece en esas lentes.
    expect(cc.lenses?.symbols?.nodes[fileId("README.md")]).toBeUndefined();
    expect(cc.lenses?.structure?.nodes[fileId("README.md")]).toBeUndefined();
  });

  it("ordena carpetas antes que ficheros y los ficheros por nombre", () => {
    const cc = buildSnapshot(input());
    const root = cc.files[0];

    expect(root?.name).toBe("demo");
    expect(root?.children?.map((child) => child.name)).toEqual(["src", "README.md"]);
    expect(root?.children?.[0]?.children?.map((child) => child.name)).toEqual(["a", "b"]);
  });
});
