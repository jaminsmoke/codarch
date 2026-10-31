import { describe, expect, it } from "vitest";
import {
  CC_JSON_VERSION,
  folderId,
  parseCcJson,
  type CcDuplicatePair,
  type CcDuplicationLens,
  type CcNode
} from "@codarch/schema";
import { diffSnapshots } from "../src/index";

/** Un árbol plano con los ids que se le pidan, para probar la identidad por ruta. */
function snapshot(
  files: ReadonlyArray<{ id: string; path: string }>,
  lens?: CcDuplicationLens
): ReturnType<typeof parseCcJson> {
  const root: CcNode = {
    id: folderId(""),
    name: "demo",
    type: "Folder",
    children: files.map((file) => ({
      id: file.id,
      name: file.path.split("/").pop() ?? file.path,
      type: "File" as const
    }))
  };

  return parseCcJson({
    meta: {
      projectName: "demo",
      apiVersion: CC_JSON_VERSION,
      checksum: `checksum-${files.map((file) => file.id).join("-")}`
    },
    files: [root],
    lenses: {
      metrics: {
        attributes: Object.fromEntries(
          files.map((file) => [file.id, { rloc: 10 }])
        )
      },
      dependency: { edges: [] },
      ...(lens ? { duplication: lens } : {})
    }
  });
}

function lens(
  pairs: CcDuplicatePair[],
  summary: { duplicatedLines: number; repeatedLines?: number }
): CcDuplicationLens {
  return {
    nodes: {},
    pairs,
    summary: {
      pairs: pairs.length,
      copies: 0,
      duplicatedLines: summary.duplicatedLines,
      repeatedLines: summary.repeatedLines ?? 0,
      ratio: 10
    }
  };
}

const paths = [
  { id: "a", path: "src/a.ts" },
  { id: "b", path: "src/b.ts" },
  { id: "c", path: "src/c.ts" }
];

describe("la duplicación en el diff", () => {
  it("cruza los pares por sus dos rutas, aunque cambien los ids", () => {
    const base = snapshot(
      [
        { id: "old-a", path: "src/a.ts" },
        { id: "old-b", path: "src/b.ts" }
      ],
      lens(
        [
          {
            fromId: "old-a",
            toId: "old-b",
            lines: 20,
            similarity: 100,
            status: "copy"
          }
        ],
        { duplicatedLines: 20 }
      )
    );
    const head = snapshot(
      [
        { id: "new-a", path: "src/a.ts" },
        { id: "new-b", path: "src/b.ts" }
      ],
      lens(
        [
          {
            fromId: "new-a",
            toId: "new-b",
            lines: 20,
            similarity: 100,
            status: "copy"
          }
        ],
        { duplicatedLines: 20 }
      )
    );

    const report = diffSnapshots(base, head);
    expect(report.duplication?.counts).toEqual({
      added: 0,
      removed: 0,
      diverging: 0
    });
    expect(report.duplication?.lines).toEqual({
      base: 20,
      head: 20,
      delta: 0
    });
  });

  it("nombra el par nuevo y el que se separa, con sus líneas", () => {
    const base = snapshot(
      paths,
      lens(
        [
          {
            fromId: "b",
            toId: "c",
            lines: 20,
            similarity: 90,
            status: "diverging"
          }
        ],
        { duplicatedLines: 20 }
      )
    );
    const head = snapshot(
      paths,
      lens(
        [
          { fromId: "a", toId: "b", lines: 12, similarity: 100, status: "copy" },
          {
            fromId: "b",
            toId: "c",
            lines: 30,
            similarity: 66,
            status: "diverging"
          }
        ],
        { duplicatedLines: 50 }
      )
    );

    const report = diffSnapshots(base, head);
    const duplication = report.duplication;
    if (!duplication) throw new Error("falta la sección de duplicación");

    expect(duplication.counts).toEqual({ added: 1, removed: 0, diverging: 1 });
    expect(duplication.lines).toEqual({ base: 20, head: 50, delta: 30 });
    // El nuevo dice de qué va y desde cuándo no hay comparación.
    expect(duplication.added[0]).toEqual({
      from: "a.ts",
      to: "b.ts",
      kind: "added",
      lines: 12,
      similarity: 100,
      previousSimilarity: null,
      linesDelta: null
    });
    // El que se separa conserva de dónde venía y cuánto ha crecido.
    expect(duplication.diverging[0]).toEqual({
      from: "b.ts",
      to: "c.ts",
      kind: "diverging",
      lines: 30,
      similarity: 66,
      previousSimilarity: 90,
      linesDelta: 10
    });
  });

  it("cuenta el par que deja de compartir", () => {
    const base = snapshot(
      paths,
      lens(
        [
          { fromId: "a", toId: "b", lines: 20, similarity: 100, status: "copy" }
        ],
        { duplicatedLines: 20 }
      )
    );
    const head = snapshot(paths, lens([], { duplicatedLines: 0 }));

    const report = diffSnapshots(base, head);
    const duplication = report.duplication;
    if (!duplication) throw new Error("falta la sección de duplicación");

    expect(duplication.counts).toEqual({ added: 0, removed: 1, diverging: 0 });
    expect(duplication.removed[0]?.from).toBe("a.ts");
    expect(duplication.removed[0]?.to).toBe("b.ts");
    expect(duplication.lines.delta).toBe(-20);
  });

  it("con la lente en un solo lado no compara y dice cuál falta", () => {
    const base = snapshot(paths);
    const head = snapshot(
      paths,
      lens(
        [
          { fromId: "a", toId: "b", lines: 20, similarity: 100, status: "copy" }
        ],
        { duplicatedLines: 20 }
      )
    );

    const report = diffSnapshots(base, head);
    const duplication = report.duplication;
    if (!duplication) throw new Error("falta la sección de duplicación");

    expect(duplication.base).toBeNull();
    expect(duplication.head?.duplicatedLines).toBe(20);
    expect(duplication.lines.delta).toBeNull();
    expect(duplication.counts).toEqual({ added: 0, removed: 0, diverging: 0 });
    expect(duplication.added).toEqual([]);
  });

  it("sin lente en ninguno de los dos lados no hay sección", () => {
    const report = diffSnapshots(snapshot(paths), snapshot(paths));
    expect(report.duplication).toBeNull();
  });

  it("un par que se acerca no es noticia y no se lista", () => {
    const base = snapshot(
      paths,
      lens(
        [
          {
            fromId: "a",
            toId: "b",
            lines: 20,
            similarity: 60,
            status: "diverging"
          }
        ],
        { duplicatedLines: 20 }
      )
    );
    const head = snapshot(
      paths,
      lens(
        [
          { fromId: "a", toId: "b", lines: 20, similarity: 80, status: "diverging" }
        ],
        { duplicatedLines: 20 }
      )
    );

    const report = diffSnapshots(base, head);
    expect(report.duplication?.counts).toEqual({
      added: 0,
      removed: 0,
      diverging: 0
    });
  });
});
