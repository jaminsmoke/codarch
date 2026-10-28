import { describe, expect, it } from "vitest";
import {
  CC_JSON_VERSION,
  fileId,
  folderId,
  parseCcJson,
  type CcJson,
  type CcMigrationLens,
  type CcNode
} from "@codarch/schema";
import {
  REPORT_SCHEMA_VERSION,
  diffSnapshots,
  parseRuleConfig
} from "../src/index";

interface FileSpec {
  path: string;
  metrics?: Record<string, number>;
}

interface EdgeSpec {
  from: string;
  to: string;
  cyclic?: boolean;
  typeOnly?: boolean;
}

interface SymbolSpec {
  path: string;
  symbols: Array<{
    name: string;
    kind: "function" | "class" | "interface" | "type" | "enum" | "variable";
    complexity?: number;
    lines?: number;
    line?: number;
    hash?: string;
  }>;
}

function snapshot(
  projectName: string,
  files: readonly FileSpec[],
  edges: readonly EdgeSpec[] = [],
  migration?: CcMigrationLens,
  symbols: readonly SymbolSpec[] = []
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
    attributes[node.id] = { ...file.metrics };
  }

  const symbolNodes: Record<string, unknown[]> = {};
  for (const entry of symbols) {
    symbolNodes[fileId(entry.path)] = entry.symbols.map((symbol) => ({
      name: symbol.name,
      kind: symbol.kind,
      line: symbol.line ?? 1,
      ...(symbol.complexity === undefined ? {} : { complexity: symbol.complexity }),
      ...(symbol.lines === undefined ? {} : { lines: symbol.lines }),
      ...(symbol.hash === undefined ? {} : { hash: symbol.hash })
    }));
  }

  return parseCcJson({
    meta: {
      projectName,
      apiVersion: CC_JSON_VERSION,
      checksum: `checksum-${projectName}`
    },
    files: [root],
    lenses: {
      metrics: { attributes },
      dependency: {
        edges: edges.map((edge) => ({
          fromId: fileId(edge.from),
          toId: fileId(edge.to),
          attributes: { weight: 1, typeOnly: edge.typeOnly === true ? 1 : 0 },
          isCyclic: edge.cyclic === true
        }))
      },
      ...(migration ? { migration } : {}),
      ...(symbols.length > 0
        ? {
            symbols: {
              nodes: symbolNodes,
              summary: {
                symbols: Object.values(symbolNodes).flat().length,
                functions: 0,
                classes: 0,
                interfaces: 0,
                types: 0,
                enums: 0,
                variables: 0,
                mostComplex: null
              }
            }
          }
        : {})
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

    expect(report.schemaVersion).toBe(REPORT_SCHEMA_VERSION);
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

  it("detecta componentes de ciclos y mantiene el orden con aristas duplicadas", () => {
    const files = ["a.ts", "b.ts", "c.ts", "d.ts", "e.ts", "f.ts"].map((path) => ({ path }));
    const edges: EdgeSpec[] = [
      { from: "a.ts", to: "b.ts" },
      { from: "a.ts", to: "b.ts" },
      { from: "b.ts", to: "a.ts" },
      { from: "b.ts", to: "c.ts" },
      { from: "c.ts", to: "d.ts" },
      { from: "d.ts", to: "c.ts" },
      { from: "e.ts", to: "e.ts" },
      { from: "f.ts", to: "f.ts", typeOnly: true }
    ];
    const base = snapshot("proj", files);
    const head = snapshot("proj", files, edges);
    const reordered = snapshot("proj", [...files].reverse(), [...edges].reverse());

    const cycles = diffSnapshots(base, head).cycles.introduced;
    expect(cycles.map((cycle) => cycle.nodes.map((node) => node.path))).toEqual([
      ["a.ts", "b.ts"], ["c.ts", "d.ts"], ["e.ts"]
    ]);
    expect(diffSnapshots(base, reordered).cycles.introduced).toEqual(cycles);
    expect(diffSnapshots(head, base).cycles.fixed).toEqual(cycles);
  });

  it("no cuenta como ciclo un ciclo que solo existe en tipos", () => {
    const base = snapshot("proj", [{ path: "a.ts" }, { path: "b.ts" }]);
    const head = snapshot("proj", [{ path: "a.ts" }, { path: "b.ts" }], [
      { from: "a.ts", to: "b.ts", typeOnly: true, cyclic: true },
      { from: "b.ts", to: "a.ts", typeOnly: true, cyclic: true }
    ]);

    const report = diffSnapshots(base, head);
    expect(report.cycles.introduced).toEqual([]);
    expect(report.cycles.fixed).toEqual([]);
    expect(report.summary.introducedCycles).toBe(0);
    expect(report.edges.cyclicAdded).toEqual([]);

    const config = parseRuleConfig({
      version: 1,
      rules: [{ name: "cycles", type: "cycles" }]
    });
    const withRules = diffSnapshots(base, head, { rules: config });
    expect(withRules.rules.violations.introduced).toEqual([]);
    expect(withRules.rules.summary.introduced).toBe(0);
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

  it("compara la lente de migración entre base y head", () => {
    const migration = (
      nodes: Record<string, { debt: number; status: "js" | "rust" }>,
      total: number
    ): CcMigrationLens => ({
      nodes: Object.fromEntries(
        Object.entries(nodes).map(([path, node]) => [
          fileId(path),
          {
            language: node.status === "rust" ? "rust" : "ts",
            status: node.status,
            loc: 100,
            rloc: 50,
            debt: node.debt,
            crossings: 0
          }
        ])
      ),
      edges: [],
      summary: {
        files: Object.keys(nodes).length,
        languages: { ts: { files: 1, loc: 100, rloc: 50 } },
        status: { js: 1, rust: 0, bridge: 0, native: 0 },
        bridgeFiles: 0,
        ffiEdges: 0,
        ffiCrossings: 0,
        migrationDebt: total
      }
    });

    const base = snapshot(
      "proj",
      [
        { path: "src/a.ts" },
        { path: "src/b.ts" }
      ],
      [],
      migration({ "src/a.ts": { debt: 10, status: "js" }, "src/b.ts": { debt: 5, status: "js" } }, 15)
    );
    const head = snapshot(
      "proj",
      [
        { path: "src/a.ts" },
        { path: "src/b.ts" },
        { path: "src/lib.rs" }
      ],
      [],
      migration(
        {
          "src/a.ts": { debt: 14, status: "js" },
          "src/b.ts": { debt: 2, status: "js" },
          "src/lib.rs": { debt: 0, status: "rust" }
        },
        16
      )
    );

    const report = diffSnapshots(base, head);
    const migrationReport = report.migration;
    expect(migrationReport).not.toBeNull();
    if (!migrationReport) return;
    expect(migrationReport.debt).toEqual({ base: 15, head: 16, delta: 1 });
    expect(migrationReport.files.increased.map((file) => file.path)).toEqual([
      "src/a.ts"
    ]);
    expect(migrationReport.files.increased[0]?.delta).toBe(4);
    expect(migrationReport.files.decreased.map((file) => file.path)).toEqual([
      "src/b.ts"
    ]);
    expect(migrationReport.files.decreased[0]?.delta).toBe(-3);
    expect(migrationReport.topDebt.map((file) => file.path)).toEqual([
      "src/a.ts",
      "src/b.ts"
    ]);
    expect(diffSnapshots(base, head, { top: 1 }).migration?.topDebt.map((file) => file.path)).toEqual([
      "src/a.ts"
    ]);
    expect(diffSnapshots(base, head).migration).toEqual(migrationReport);

    const withoutLens = snapshot("proj", [{ path: "src/a.ts" }]);
    const introduced = diffSnapshots(withoutLens, head).migration;
    expect(introduced?.debt).toEqual({ base: 0, head: 16, delta: 16 });
    expect(introduced?.files).toEqual({ increased: [], decreased: [] });
    expect(diffSnapshots(withoutLens, withoutLens).migration).toBeNull();
  });

  it("compara los símbolos de dentro de los ficheros", () => {
    const base = snapshot(
      "proj",
      [{ path: "src/a.ts", metrics: { rloc: 100 } }],
      [],
      undefined,
      [
        {
          path: "src/a.ts",
          symbols: [
            { name: "cargar", kind: "function", complexity: 12, lines: 40 },
            { name: "viejo", kind: "function", complexity: 3, lines: 8 }
          ]
        }
      ]
    );
    const head = snapshot(
      "proj",
      [{ path: "src/a.ts", metrics: { rloc: 130 } }],
      [],
      undefined,
      [
        {
          path: "src/a.ts",
          symbols: [
            { name: "cargar", kind: "function", complexity: 18, lines: 52 },
            { name: "nuevo", kind: "function", complexity: 1, lines: 3 }
          ]
        }
      ]
    );

    const report = diffSnapshots(base, head);
    expect(report.symbols).not.toBeNull();
    if (!report.symbols) return;

    expect(report.symbols.summary).toEqual({
      added: 1,
      removed: 1,
      changed: 1,
      topFile: { path: "src/a.ts", changed: 3 }
    });

    const symbols = report.symbols.files[0]?.symbols ?? [];
    const cargar = symbols.find((symbol) => symbol.name === "cargar");
    expect(cargar?.status).toBe("changed");
    expect(cargar?.base?.complexity).toBe(12);
    expect(cargar?.head?.complexity).toBe(18);
    expect(cargar?.complexityDelta).toBe(6);

    const nuevo = symbols.find((symbol) => symbol.name === "nuevo");
    expect(nuevo?.status).toBe("added");
    expect(nuevo?.base).toBeNull();

    const viejo = symbols.find((symbol) => symbol.name === "viejo");
    expect(viejo?.status).toBe("removed");
    expect(viejo?.head).toBeNull();
  });

  it("dos símbolos con el mismo nombre no se inventan un cambio", () => {
    // Un fichero puede tener dos `listener` anidados o el constructor de dos
    // clases (ADR 0076): se emparejan por orden, no se guarda solo el último.
    const symbols: SymbolSpec[] = [
      {
        path: "src/a.ts",
        symbols: [
          { name: "listener", kind: "function", line: 3, complexity: 1, lines: 2 },
          { name: "listener", kind: "function", line: 20, complexity: 1, lines: 2 }
        ]
      }
    ];
    const base = snapshot(
      "proj",
      [{ path: "src/a.ts", metrics: { rloc: 40 } }],
      [],
      undefined,
      symbols
    );
    const head = snapshot(
      "proj",
      [{ path: "src/a.ts", metrics: { rloc: 40 } }],
      [],
      undefined,
      symbols
    );

    const report = diffSnapshots(base, head);

    expect(report.symbols?.files ?? []).toEqual([]);
    expect(report.symbols?.summary).toEqual({
      added: 0,
      removed: 0,
      changed: 0,
      topFile: null
    });
  });

  it("detecta un cambio de cuerpo aunque la complejidad y las líneas no cambien", () => {
    const base = snapshot(
      "proj",
      [{ path: "src/a.ts", metrics: { rloc: 10 } }],
      [],
      undefined,
      [
        {
          path: "src/a.ts",
          symbols: [
            {
              name: "LIMITE",
              kind: "variable",
              line: 1,
              hash: "hash-viejo"
            }
          ]
        }
      ]
    );
    const head = snapshot(
      "proj",
      [{ path: "src/a.ts", metrics: { rloc: 10 } }],
      [],
      undefined,
      [
        {
          path: "src/a.ts",
          symbols: [
            {
              name: "LIMITE",
              kind: "variable",
              line: 1,
              hash: "hash-nuevo"
            }
          ]
        }
      ]
    );

    const symbols = diffSnapshots(base, head).symbols;
    if (!symbols) throw new Error("falta la sección de símbolos");

    expect(symbols.summary.changed).toBe(1);
    expect(symbols.files[0]?.symbols[0]).toMatchObject({
      name: "LIMITE",
      kind: "variable",
      status: "changed"
    });
  });

  it("no inventa símbolos: sin la lente, la sección es null", () => {
    const base = snapshot("proj", [{ path: "src/a.ts", metrics: { rloc: 10 } }]);
    const head = snapshot("proj", [{ path: "src/a.ts", metrics: { rloc: 20 } }]);

    const report = diffSnapshots(base, head);

    expect(report.symbols).toBeNull();
  });

  it("con las fuentes a mano, mide las líneas que suma y resta cada símbolo", () => {
    // La ficha enseña `cargar +2 −1`: eso no sale de dos `cc.json`, sale de
    // leer los dos cuerpos y compararlos (ADR 0070).
    const before = ["function cargar() {", "  return 1;", "}"].join("\n");
    const after = [
      "function cargar() {",
      "  const uno = 1;",
      "  return uno;",
      "}"
    ].join("\n");

    const base = snapshot(
      "proj",
      [{ path: "src/a.ts", metrics: { rloc: 3 } }],
      [],
      undefined,
      [
        {
          path: "src/a.ts",
          symbols: [{ name: "cargar", kind: "function", line: 1, lines: 3 }]
        }
      ]
    );
    const head = snapshot(
      "proj",
      [{ path: "src/a.ts", metrics: { rloc: 4 } }],
      [],
      undefined,
      [
        {
          path: "src/a.ts",
          symbols: [{ name: "cargar", kind: "function", line: 1, lines: 4 }]
        }
      ]
    );

    const report = diffSnapshots(base, head, {
      source: (side, path) =>
        path === "src/a.ts" ? (side === "base" ? before : after) : null
    });
    const cargar = report.symbols?.files[0]?.symbols[0];

    expect(cargar).toMatchObject({
      name: "cargar",
      status: "changed",
      addedLines: 2,
      removedLines: 1
    });

    // Dos veces lo mismo, dos veces igual: el reporte es determinista.
    expect(
      diffSnapshots(base, head, {
        source: (side, path) =>
          path === "src/a.ts" ? (side === "base" ? before : after) : null
      })
    ).toEqual(report);
  });

  it("sin fuentes, las líneas de un símbolo quedan sin medir", () => {
    const base = snapshot(
      "proj",
      [{ path: "src/a.ts", metrics: { rloc: 3 } }],
      [],
      undefined,
      [
        {
          path: "src/a.ts",
          symbols: [{ name: "cargar", kind: "function", line: 1, lines: 3 }]
        }
      ]
    );
    const head = snapshot(
      "proj",
      [{ path: "src/a.ts", metrics: { rloc: 4 } }],
      [],
      undefined,
      [
        {
          path: "src/a.ts",
          symbols: [{ name: "cargar", kind: "function", line: 1, lines: 5 }]
        }
      ]
    );

    const cargar = diffSnapshots(base, head).symbols?.files[0]?.symbols[0];

    // Lo que no se midió se dice con `null`, no con un cero.
    expect(cargar).toMatchObject({ addedLines: null, removedLines: null });
  });

  it("un símbolo nuevo suma lo que ocupa y uno que se va resta lo suyo", () => {
    const base = snapshot(
      "proj",
      [{ path: "src/a.ts", metrics: { rloc: 10 } }],
      [],
      undefined,
      [{ path: "src/a.ts", symbols: [{ name: "viejo", kind: "function", lines: 8 }] }]
    );
    const head = snapshot(
      "proj",
      [{ path: "src/a.ts", metrics: { rloc: 12 } }],
      [],
      undefined,
      [{ path: "src/a.ts", symbols: [{ name: "nuevo", kind: "function", lines: 5 }] }]
    );

    const symbols = diffSnapshots(base, head).symbols?.files[0]?.symbols ?? [];

    expect(symbols.find((s) => s.name === "nuevo")).toMatchObject({
      addedLines: 5,
      removedLines: 0
    });
    expect(symbols.find((s) => s.name === "viejo")).toMatchObject({
      addedLines: 0,
      removedLines: 8
    });
  });

  it("los símbolos de un fichero borrado se van con él", () => {
    const base = snapshot(
      "proj",
      [{ path: "src/a.ts", metrics: { rloc: 10 } }],
      [],
      undefined,
      [
        {
          path: "src/a.ts",
          symbols: [{ name: "cargar", kind: "function", complexity: 4 }]
        }
      ]
    );
    const head = snapshot("proj", []);

    const report = diffSnapshots(base, head);

    expect(report.symbols?.summary.removed).toBe(1);
    expect(report.symbols?.files[0]?.path).toBe("src/a.ts");
  });
});
