import { describe, expect, it } from "vitest";
import { fileId } from "@codarch/schema";
import { analyzeDuplication } from "../src/duplication";
import { buildGraph } from "../src/graph";
import { buildSnapshot } from "../src/snapshot";

/** Ocho líneas significativas: la ventana mínima de la lente (ADR 0102). */
const BLOCK = [
  "const uno = 1;",
  "const dos = 2;",
  "const tres = 3;",
  "const cuatro = 4;",
  "const cinco = 5;",
  "const seis = 6;",
  "const siete = 7;",
  "const ocho = 8;"
];

/** Otras ocho líneas distintas, para un bloque de dieciséis. */
const BLOCK_B = [
  "const nueve = 9;",
  "const diez = 10;",
  "const once = 11;",
  "const doce = 12;",
  "const trece = 13;",
  "const catorce = 14;",
  "const quince = 15;",
  "const dieciseis = 16;"
];

function file(relativePath: string, lines: readonly string[]) {
  return { relativePath, rloc: lines.length, source: lines.join("\n") };
}

describe("analyzeDuplication", () => {
  it("cuenta un bloque de ocho líneas y no de siete", () => {
    const seven = analyzeDuplication([
      file("a.ts", BLOCK.slice(0, 7)),
      file("b.ts", BLOCK.slice(0, 7))
    ]);
    expect(seven.pairs).toHaveLength(0);
    expect(seven.nodes.get("a.ts")?.duplicatedLines).toBe(0);

    const eight = analyzeDuplication([file("a.ts", BLOCK), file("b.ts", BLOCK)]);
    expect(eight.pairs).toEqual([
      {
        from: "a.ts",
        to: "b.ts",
        lines: 8,
        similarity: 100,
        status: "copy"
      }
    ]);
    expect(eight.nodes.get("a.ts")?.duplicatedLines).toBe(8);
    expect(eight.nodes.get("b.ts")?.duplicatedLines).toBe(8);
    expect(eight.summary).toEqual({
      pairs: 1,
      copies: 1,
      duplicatedLines: 16,
      repeatedLines: 0,
      ratio: 100
    });
  });

  it("señala el gemelo canónico de un fichero idéntico, aunque no tenga ventanas", () => {
    const small = ["const a = 1;", "const b = 2;", "export { a, b };"];
    const result = analyzeDuplication([
      file("z.ts", small),
      file("a.ts", small)
    ]);

    expect(result.nodes.get("a.ts")?.duplicateOf).toBeUndefined();
    expect(result.nodes.get("z.ts")?.duplicateOf).toBe("a.ts");
    expect(result.pairs).toHaveLength(0);
    expect(result.summary.copies).toBe(1);
  });

  it("cuenta la repetición dentro del mismo fichero y no la mezcla con los pares", () => {
    const gap = Array.from({ length: 8 }, (_, index) => `const gap${index} = ${index};`);
    const result = analyzeDuplication([
      file("a.ts", [...BLOCK, ...gap, ...BLOCK])
    ]);
    const node = result.nodes.get("a.ts");

    expect(node?.repeatedLines).toBe(16);
    expect(node?.duplicatedLines).toBe(0);
    expect(result.pairs).toHaveLength(0);
  });

  it("distingue una copia de una copia que empieza a separarse", () => {
    const diverging = analyzeDuplication([
      file("a.ts", [...BLOCK, "const extraA = 1;"]),
      file("b.ts", [...BLOCK, "const extraB = 2;"])
    ]);

    expect(diverging.pairs).toHaveLength(1);
    expect(diverging.pairs[0]).toMatchObject({
      from: "a.ts",
      to: "b.ts",
      lines: 8,
      similarity: 50,
      status: "diverging"
    });
  });

  it("no hace par con una similitud por debajo del umbral", () => {
    const tailA = Array.from({ length: 22 }, (_, index) => `const valor${index} = ${index};`);
    const tailB = Array.from({ length: 22 }, (_, index) => `const valor${index} = ${index + 1};`);
    const result = analyzeDuplication([
      file("a.ts", [...BLOCK, ...tailA]),
      file("b.ts", [...BLOCK, ...tailB])
    ]);

    // Una ventana compartida de 23 es un 4 %: se cuenta como copiada, pero no
    // como par.
    expect(result.pairs).toHaveLength(0);
    expect(result.nodes.get("a.ts")?.duplicatedLines).toBe(8);
  });

  it("cuenta cada bloque una vez, no una vez por ventana", () => {
    const block = [...BLOCK, ...BLOCK_B];
    const result = analyzeDuplication([file("a.ts", block), file("b.ts", block)]);

    expect(result.pairs[0]).toMatchObject({ lines: 16, similarity: 100 });
    expect(result.nodes.get("a.ts")?.duplicatedLines).toBe(16);
  });

  it("ignora comentarios y líneas vacías al comparar", () => {
    const formatted = [
      "// cabecera",
      "",
      ...BLOCK.slice(0, 4),
      "/* una nota */",
      ...BLOCK.slice(4),
      ""
    ];
    const result = analyzeDuplication([
      file("a.ts", BLOCK),
      file("b.ts", formatted)
    ]);

    expect(result.pairs[0]).toMatchObject({ similarity: 100, status: "copy" });
  });

  it("es determinista y no depende del orden de entrada", () => {
    const first = analyzeDuplication([file("a.ts", BLOCK), file("b.ts", BLOCK)]);
    const second = analyzeDuplication([file("b.ts", BLOCK), file("a.ts", BLOCK)]);

    expect(second.pairs).toEqual(first.pairs);
    expect([...second.nodes.entries()]).toEqual([...first.nodes.entries()]);
    expect(second.summary).toEqual(first.summary);
  });
});

describe("la lente de duplicación en el snapshot", () => {
  const files = [
    { relativePath: "src/a.ts", metrics: { rloc: 8 } },
    { relativePath: "src/b.ts", metrics: { rloc: 8 } }
  ];

  it("lleva los nodos, los pares y el resumen a ids de fichero", () => {
    const duplication = analyzeDuplication([
      file("src/b.ts", BLOCK),
      file("src/a.ts", BLOCK)
    ]);
    const snapshot = buildSnapshot({
      projectName: "demo",
      files,
      graph: buildGraph(["src/a.ts", "src/b.ts"], []),
      duplication
    });
    const lens = snapshot.lenses?.duplication;

    expect(lens?.nodes[fileId("src/a.ts")]).toEqual({
      duplicatedLines: 8,
      repeatedLines: 0
    });
    expect(lens?.nodes[fileId("src/b.ts")]).toMatchObject({
      duplicatedLines: 8,
      duplicateOf: "src/a.ts"
    });
    expect(lens?.pairs).toEqual([
      {
        fromId: fileId("src/a.ts"),
        toId: fileId("src/b.ts"),
        lines: 8,
        similarity: 100,
        status: "copy"
      }
    ]);
    expect(lens?.summary).toMatchObject({
      pairs: 1,
      copies: 1,
      duplicatedLines: 16,
      ratio: 100
    });
  });

  it("no aparece cuando no se midió: ausente no es cero", () => {
    const snapshot = buildSnapshot({
      projectName: "demo",
      files,
      graph: buildGraph(["src/a.ts", "src/b.ts"], [])
    });

    expect(snapshot.lenses?.duplication).toBeUndefined();
  });
});
