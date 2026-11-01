import { describe, expect, it } from "vitest";
import type { EdgePair } from "@codarch/render/browser";
import {
  boundarySummary,
  cyclesSummary,
  folderBoundary,
  folderCycles,
  type FolderGraph
} from "../src/boundary";

/** Un grafo con los ficheros que se nombren, en ese orden. */
function graph(
  paths: string[],
  edges: Array<[number, number]>,
  cycles: Array<[number, number]> = []
): FolderGraph {
  const pair = ([from, to]: [number, number]): EdgePair => ({ from, to });
  return {
    files: paths.map((path) => ({ path })),
    edges: edges.map(pair),
    cycles: cycles.map(pair)
  };
}

const paths = ["src/a.ts", "src/b.ts", "src/deep/c.ts", "lib/d.ts", "lib/e.ts"];

describe("la frontera de una carpeta (ADR 0092)", () => {
  it("separa lo interno de lo que entra y lo que sale", () => {
    const boundary = folderBoundary(
      graph(paths, [
        [0, 1], // dentro
        [3, 0], // entra: lib/d usa src/a
        [4, 2], // entra: lib/e usa src/deep/c
        [1, 3] // sale: src/b usa lib/d
      ]),
      "src"
    );

    expect(boundary.internal).toBe(1);
    expect(boundary.incoming.map((file) => file.path)).toEqual([
      "lib/d.ts",
      "lib/e.ts"
    ]);
    expect(boundary.outgoing.map((file) => file.path)).toEqual(["lib/d.ts"]);
  });

  it("cuenta cada arista de un mismo fichero externo", () => {
    const boundary = folderBoundary(
      graph(paths, [
        [0, 3],
        [1, 3],
        [2, 4]
      ]),
      "src"
    );

    expect(boundary.outgoing).toEqual([
      { path: "lib/d.ts", edges: 2 },
      { path: "lib/e.ts", edges: 1 }
    ]);
  });

  it("una arista entre dos ficheros de fuera no toca la carpeta", () => {
    const boundary = folderBoundary(graph(paths, [[3, 4]]), "src");

    expect(boundary).toEqual({ internal: 0, incoming: [], outgoing: [] });
  });

  it("ignora las aristas que apuntan a un fichero que no está", () => {
    const boundary = folderBoundary(graph(paths, [[0, 99]]), "src");

    expect(boundary).toEqual({ internal: 0, incoming: [], outgoing: [] });
  });

  it("ordena por ruta, no por el orden del snapshot", () => {
    const boundary = folderBoundary(
      graph(paths, [
        [0, 4],
        [0, 3]
      ]),
      "src"
    );

    expect(boundary.outgoing.map((file) => file.path)).toEqual([
      "lib/d.ts",
      "lib/e.ts"
    ]);
  });

  it("la raíz es toda dentro", () => {
    const boundary = folderBoundary(graph(paths, [[0, 3]]), "");

    expect(boundary.internal).toBe(1);
    expect(boundary.incoming).toEqual([]);
    expect(boundary.outgoing).toEqual([]);
  });

  it("una carpeta sin aristas no inventa reparto", () => {
    expect(boundarySummary(folderBoundary(graph(paths, []), "src"))).toBe(
      "sin aristas"
    );
  });

  it("escribe el reparto con sus palabras", () => {
    expect(
      boundarySummary(
        folderBoundary(
          graph(paths, [
            [0, 1],
            [3, 0],
            [1, 4]
          ]),
          "src"
        )
      )
    ).toBe("1 dentro · 1 entrante · 1 saliente");
  });
});

describe("los ciclos de una carpeta (ADR 0092)", () => {
  it("separa los que caen dentro de los que cruzan", () => {
    const cycles = folderCycles(
      graph(
        paths,
        [],
        [
          [0, 1], // dentro
          [1, 3], // cruza: src/b con lib/d
          [3, 0] // cruza: lib/d con src/a
        ]
      ),
      "src"
    );

    expect(cycles.inside).toBe(1);
    expect(cycles.crossing).toEqual([{ path: "lib/d.ts", edges: 2 }]);
  });

  it("un ciclo entre dos ficheros de fuera no es de la carpeta", () => {
    expect(folderCycles(graph(paths, [], [[3, 4]]), "src")).toEqual({
      inside: 0,
      crossing: []
    });
  });

  it("cuenta las aristas de cierre, no tamaños que el mapa no guarda", () => {
    expect(cyclesSummary(folderCycles(graph(paths, [], [[0, 1], [1, 3]]), "src"))).toBe(
      "1 dentro · 1 que cruza"
    );
  });

  it("una carpeta limpia lo dice", () => {
    expect(cyclesSummary(folderCycles(graph(paths, []), "src"))).toBe("sin ciclos");
  });
});
