import { describe, expect, it } from "vitest";
import {
  fileId,
  folderId,
  parseCcJson,
  type CcJson,
  type CcNode
} from "@codarch/schema";
import { diffSnapshots, parseRuleConfig } from "../src/index";

interface FileSpec {
  path: string;
  metrics?: Record<string, number>;
}

interface EdgeSpec {
  from: string;
  to: string;
  cyclic?: boolean;
}

function snapshot(
  projectName: string,
  files: readonly FileSpec[],
  edges: readonly EdgeSpec[] = []
): CcJson {
  const root: CcNode = {
    id: folderId(""),
    name: projectName,
    type: "Folder",
    children: []
  };
  const folders = new Map<string, CcNode>([["", root]]);
  const attributes: Record<string, Record<string, number>> = {};

  for (const file of files) {
    const segments = file.path.split("/");
    const leaf = segments.pop();
    if (!leaf) continue;

    let parent = root;
    let parentPath = "";
    for (const segment of segments) {
      const folderPath = parentPath ? `${parentPath}/${segment}` : segment;
      let folder = folders.get(folderPath);
      if (!folder) {
        folder = {
          id: folderId(folderPath),
          name: segment,
          type: "Folder",
          children: []
        };
        folders.set(folderPath, folder);
        parent.children?.push(folder);
      }
      parent = folder;
      parentPath = folderPath;
    }

    const node: CcNode = {
      id: fileId(file.path),
      name: leaf,
      type: "File"
    };
    parent.children?.push(node);
    attributes[node.id] = { ...(file.metrics ?? {}) };
  }

  return parseCcJson({
    meta: {
      projectName,
      apiVersion: "2.0",
      checksum: `checksum-${projectName}`
    },
    files: [root],
    lenses: {
      metrics: { attributes },
      dependency: {
        edges: edges.map((edge) => ({
          fromId: fileId(edge.from),
          toId: fileId(edge.to),
          attributes: { weight: 1, typeOnly: 0 },
          isCyclic: edge.cyclic === true
        }))
      }
    }
  });
}

describe("diffSnapshots", () => {
  it("detecta ficheros, métricas, aristas y ciclos nuevos", () => {
    const base = snapshot(
      "proj",
      [
        { path: "a.ts", metrics: { maxComplexity: 2, rloc: 10 } },
        { path: "b.ts", metrics: { maxComplexity: 1, rloc: 5 } },
        { path: "c.ts", metrics: { maxComplexity: 1, rloc: 5 } }
      ],
      [
        { from: "a.ts", to: "b.ts", cyclic: true },
        { from: "b.ts", to: "a.ts", cyclic: true },
        { from: "b.ts", to: "c.ts" }
      ]
    );
    const head = snapshot(
      "proj",
      [
        { path: "a.ts", metrics: { maxComplexity: 5, rloc: 20 } },
        { path: "b.ts", metrics: { maxComplexity: 1, rloc: 5 } },
        { path: "c.ts", metrics: { maxComplexity: 1, rloc: 5 } },
        { path: "d.ts", metrics: { maxComplexity: 3, rloc: 8 } }
      ],
      [
        { from: "a.ts", to: "b.ts" },
        { from: "b.ts", to: "c.ts", cyclic: true },
        { from: "c.ts", to: "b.ts", cyclic: true },
        { from: "d.ts", to: "a.ts" }
      ]
    );

    const report = diffSnapshots(base, head);

    expect(report.files.added.map((file) => file.path)).toEqual(["d.ts"]);
    expect(report.files.removed).toEqual([]);
    expect(report.files.changed).toHaveLength(1);
    expect(report.files.changed[0]?.path).toBe("a.ts");
    expect(report.files.changed[0]?.changes).toEqual([
      { metric: "maxComplexity", base: 2, head: 5, delta: 3 },
      { metric: "rloc", base: 10, head: 20, delta: 10 }
    ]);

    expect(report.edges.removed.map((edge) => `${edge.from}->${edge.to}`)).toEqual([
      "b.ts->a.ts"
    ]);
    expect(report.edges.added.map((edge) => `${edge.from}->${edge.to}`)).toEqual([
      "c.ts->b.ts",
      "d.ts->a.ts"
    ]);
    expect(report.edges.cyclicAdded.map((edge) => `${edge.from}->${edge.to}`)).toEqual([
      "c.ts->b.ts"
    ]);

    expect(report.cycles.fixed).toHaveLength(1);
    expect(report.cycles.fixed[0]?.nodes.map((node) => node.path)).toEqual([
      "a.ts",
      "b.ts"
    ]);
    expect(report.cycles.introduced).toHaveLength(1);
    expect(report.cycles.introduced[0]?.nodes.map((node) => node.path)).toEqual([
      "b.ts",
      "c.ts"
    ]);

    expect(report.hotspotMetric).toBe("maxComplexity");
    expect(report.hotspots.map((hotspot) => hotspot.path)).toEqual([
      "a.ts",
      "d.ts"
    ]);
    expect(report.summary).toMatchObject({
      addedFiles: 1,
      removedFiles: 0,
      changedFiles: 1,
      addedEdges: 2,
      removedEdges: 1,
      cyclicEdgesAdded: 1,
      introducedCycles: 1,
      fixedCycles: 1,
      hotspots: 2
    });
  });

  it("detecta ficheros y aristas eliminados", () => {
    const base = snapshot(
      "proj",
      [
        { path: "a.ts", metrics: { rloc: 3 } },
        { path: "b.ts", metrics: { rloc: 2 } }
      ],
      [{ from: "a.ts", to: "b.ts" }]
    );
    const head = snapshot("proj", [{ path: "a.ts", metrics: { rloc: 3 } }]);

    const report = diffSnapshots(base, head);
    expect(report.files.removed).toEqual([
      {
        id: fileId("b.ts"),
        path: "b.ts",
        metrics: { rloc: 2 }
      }
    ]);
    expect(report.edges.removed).toHaveLength(1);
    expect(report.summary.removedFiles).toBe(1);
    expect(report.summary.removedEdges).toBe(1);
  });

  it("detecta un self-loop como ciclo nuevo", () => {
    const base = snapshot("proj", [{ path: "a.ts" }, { path: "b.ts" }], [
      { from: "a.ts", to: "b.ts" }
    ]);
    const head = snapshot("proj", [{ path: "a.ts" }, { path: "b.ts" }], [
      { from: "a.ts", to: "b.ts" },
      { from: "b.ts", to: "b.ts", cyclic: true }
    ]);

    const report = diffSnapshots(base, head);
    expect(report.cycles.introduced).toHaveLength(1);
    expect(report.cycles.introduced[0]).toMatchObject({ size: 1 });
    expect(report.cycles.introduced[0]?.nodes[0]?.path).toBe("b.ts");
    expect(report.edges.cyclicAdded).toHaveLength(1);
  });

  it("usa rloc como fallback de hotspot y limita el top", () => {
    const base = snapshot("proj", [
      { path: "a.ts", metrics: { rloc: 1 } },
      { path: "b.ts", metrics: { rloc: 1 } }
    ]);
    const head = snapshot("proj", [
      { path: "a.ts", metrics: { rloc: 4 } },
      { path: "b.ts", metrics: { rloc: 2 } }
    ]);

    const report = diffSnapshots(base, head, { top: 1 });
    expect(report.hotspotMetric).toBe("rloc");
    expect(report.hotspots).toHaveLength(1);
    expect(report.hotspots[0]).toMatchObject({
      path: "a.ts",
      metric: "rloc",
      base: 1,
      head: 4,
      delta: 3
    });
  });

  it("marca métricas que aparecen o desaparecen sin inventar un delta", () => {
    const base = snapshot("proj", [
      { path: "a.ts", metrics: { rloc: 2, oldMetric: 7 } }
    ]);
    const head = snapshot("proj", [
      { path: "a.ts", metrics: { rloc: 2, newMetric: 3 } }
    ]);

    const report = diffSnapshots(base, head);
    expect(report.files.changed[0]?.changes).toEqual([
      { metric: "newMetric", base: null, head: 3, delta: null },
      { metric: "oldMetric", base: 7, head: null, delta: null }
    ]);
  });

  it("quita el nombre de la raíz de las rutas y es determinista", () => {
    const base = snapshot("my-project", [{ path: "src/a.ts", metrics: { rloc: 1 } }]);
    const head = snapshot("my-project", [
      { path: "src/a.ts", metrics: { rloc: 2 } },
      { path: "src/b.ts", metrics: { rloc: 1 } }
    ]);

    const first = diffSnapshots(base, head);
    const second = diffSnapshots(base, head);
    expect(first.files.added[0]?.path).toBe("src/b.ts");
    expect(first.files.changed[0]?.path).toBe("src/a.ts");
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("evalúa reglas y solo marca las violaciones introducidas", () => {
    const base = snapshot(
      "proj",
      [
        { path: "src/domain/a.ts", metrics: { maxComplexity: 1 } },
        { path: "src/infra/b.ts", metrics: { maxComplexity: 1 } }
      ],
      []
    );
    const head = snapshot(
      "proj",
      [
        { path: "src/domain/a.ts", metrics: { maxComplexity: 1 } },
        { path: "src/infra/b.ts", metrics: { maxComplexity: 1 } }
      ],
      [
        { from: "src/domain/a.ts", to: "src/infra/b.ts", cyclic: true },
        { from: "src/infra/b.ts", to: "src/domain/a.ts", cyclic: true }
      ]
    );
    const config = parseRuleConfig({
      version: 1,
      layers: [
        { name: "domain", patterns: ["src/domain/**"] },
        { name: "infra", patterns: ["src/infra/**"] }
      ],
      rules: [
        {
          name: "domain-no-infra",
          type: "forbidden",
          from: "domain",
          to: "infra"
        },
        { name: "cycles", type: "cycles" }
      ]
    });

    const report = diffSnapshots(base, head, { rules: config });
    expect(report.rules.configured).toBe(true);
    expect(report.rules.summary.introduced).toBe(2);
    expect(report.rules.violations.introduced.map((violation) => violation.type)).toEqual([
      "cycles",
      "forbidden"
    ]);
  });
});
