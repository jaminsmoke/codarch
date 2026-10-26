import { REPORT_SCHEMA_VERSION, type DiffReport } from "@codarch/metrics";
import { CC_JSON_VERSION, parseCcJson, type CcJson } from "@codarch/schema";
import { ArchitectureStore } from "../src/store";

export const SNAPSHOT: CcJson = {
  meta: {
    projectName: "Acme",
    apiVersion: CC_JSON_VERSION,
    checksum: "checksum-head",
    commitHash: "head-commit"
  },
  files: [
    {
      id: "root",
      name: "acme",
      type: "Folder",
      children: [
        {
          id: "src",
          name: "src",
          type: "Folder",
          children: [
            { id: "a", name: "a.ts", type: "File" },
            { id: "b", name: "b.ts", type: "File" },
            {
              id: "domain",
              name: "domain",
              type: "Folder",
              children: [{ id: "c", name: "c.ts", type: "File" }]
            },
            {
              id: "infra",
              name: "infra",
              type: "Folder",
              children: [{ id: "d", name: "d.ts", type: "File" }]
            }
          ]
        },
        { id: "index", name: "index.ts", type: "File" }
      ]
    }
  ],
  lenses: {
    metrics: {
      attributes: {
        a: { rloc: 100, maxComplexity: 10, number_of_commits: 5 },
        b: { rloc: 40, maxComplexity: 2, number_of_commits: 1 },
        c: { rloc: 80, maxComplexity: 20, number_of_commits: 8 },
        d: { rloc: 20, maxComplexity: 1, number_of_commits: 1 },
        index: { rloc: 10, maxComplexity: 1, number_of_commits: 1 }
      }
    },
    dependency: {
      edges: [
        { fromId: "a", toId: "b" },
        { fromId: "b", toId: "c" },
        { fromId: "c", toId: "a", isCyclic: true },
        { fromId: "index", toId: "a" },
        { fromId: "d", toId: "c" }
      ]
    },
    migration: {
      nodes: {
        a: { language: "ts", status: "js", loc: 200, rloc: 100, debt: 22, crossings: 1 },
        b: { language: "ts", status: "js", loc: 80, rloc: 40, debt: 6, crossings: 0 },
        c: { language: "ts", status: "js", loc: 160, rloc: 80, debt: 42, crossings: 2 },
        d: { language: "rust", status: "native", loc: 40, rloc: 20, crossings: 1 },
        index: { language: "ts", status: "js", loc: 20, rloc: 10, debt: 2, crossings: 0 }
      },
      edges: [{ fromId: "d", toId: "c", kind: "native" }],
      summary: {
        files: 5,
        languages: {
          ts: { files: 4, loc: 460, rloc: 230 },
          rust: { files: 1, loc: 40, rloc: 20 }
        },
        status: { js: 4, rust: 0, bridge: 0, native: 1 },
        bridgeFiles: 1,
        ffiEdges: 1,
        ffiCrossings: 4,
        migrationDebt: 72
      }
    },
    symbols: {
      nodes: {
        a: [
          { name: "cargar", kind: "function", line: 10, complexity: 12, lines: 40 },
          { name: "Guardar", kind: "interface", line: 3 }
        ],
        c: [
          { name: "resolver", kind: "function", line: 20, complexity: 20, lines: 60 }
        ]
      },
      summary: {
        symbols: 3,
        functions: 2,
        classes: 0,
        interfaces: 1,
        types: 0,
        enums: 0,
        variables: 0,
        mostComplex: {
          path: "src/domain/c.ts",
          name: "resolver",
          complexity: 20
        }
      }
    }
  }
};

export function makeStore(
  report: DiffReport | null = makeReport(),
  root = "C:/repo"
): ArchitectureStore {
  return new ArchitectureStore(parseCcJson(SNAPSHOT), {
    root,
    report
  });
}

export function makeReport(): DiffReport {
  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    base: {
      projectName: "Acme",
      checksum: "checksum-base",
      files: 4,
      folders: 3,
      edges: 4
    },
    head: {
      projectName: "Acme",
      checksum: "checksum-head",
      files: 5,
      folders: 4,
      edges: 5
    },
    summary: {
      addedFiles: 1,
      removedFiles: 1,
      changedFiles: 1,
      addedEdges: 1,
      removedEdges: 0,
      cyclicEdgesAdded: 1,
      cyclicEdgesRemoved: 0,
      introducedCycles: 1,
      fixedCycles: 0,
      hotspots: 1,
      addedRloc: 120,
      removedRloc: 40,
      changedRloc: 25
    },
    hotspotMetric: "maxComplexity",
    rules: {
      configured: true,
      profile: null,
      summary: {
        layers: 2,
        rules: 2,
        introduced: 1,
        existing: 1,
        resolved: 0,
        introducedErrors: 1,
        introducedWarnings: 0
      },
      violations: {
        introduced: [
          {
            key: "forbidden:domain-no-infra:c->d",
            rule: "domain-no-infra",
            source: "config",
            type: "forbidden",
            severity: "error",
            message: "domain no puede depender de infra",
            files: ["src/domain/c.ts", "src/infra/d.ts"],
            edge: {
              fromId: "c",
              toId: "d",
              from: "src/domain/c.ts",
              to: "src/infra/d.ts"
            }
          }
        ],
        existing: [
          {
            key: "threshold:a:maxComplexity",
            rule: "complejidad-maxima",
            source: "config",
            type: "threshold",
            severity: "warn",
            message: "src/a.ts: maxComplexity = 10 (máximo 8)",
            files: ["src/a.ts"],
            metric: { name: "maxComplexity", value: 10, max: 8 }
          }
        ],
        resolved: []
      }
    },
    files: {
      added: [
        {
          id: "index",
          path: "index.ts",
          metrics: {
            rloc: 10,
            maxComplexity: 1,
            number_of_commits: 1
          }
        }
      ],
      removed: [
        {
          id: "legacy",
          path: "legacy.ts",
          metrics: { rloc: 5, maxComplexity: 1 }
        }
      ],
      changed: [
        {
          id: "c",
          path: "src/domain/c.ts",
          changes: [
            {
              metric: "maxComplexity",
              base: 12,
              head: 20,
              delta: 8
            }
          ]
        }
      ]
    },
    edges: {
      added: [
        {
          fromId: "b",
          toId: "c",
          from: "src/b.ts",
          to: "src/domain/c.ts",
          weight: 1,
          typeOnly: 0,
          isCyclic: true
        }
      ],
      removed: [],
      cyclicAdded: [
        {
          fromId: "b",
          toId: "c",
          from: "src/b.ts",
          to: "src/domain/c.ts",
          weight: 1,
          typeOnly: 0,
          isCyclic: true
        }
      ],
      cyclicRemoved: []
    },
    cycles: {
      introduced: [
        {
          size: 3,
          nodes: [
            { id: "a", path: "src/a.ts" },
            { id: "b", path: "src/b.ts" },
            { id: "c", path: "src/domain/c.ts" }
          ]
        }
      ],
      fixed: []
    },
    hotspots: [
      {
        id: "c",
        path: "src/domain/c.ts",
        metric: "maxComplexity",
        base: 12,
        head: 20,
        delta: 8,
        change: "changed"
      }
    ],
    migration: {
      languages: {
        base: { ts: { files: 3, loc: 120, rloc: 60 } },
        head: { ts: { files: 4, loc: 160, rloc: 80 }, rust: { files: 1, loc: 40, rloc: 20 } }
      },
      status: {
        base: { js: 3, rust: 0, bridge: 0, native: 0 },
        head: { js: 3, rust: 1, bridge: 0, native: 0 }
      },
      debt: { base: 40, head: 30, delta: -10 },
      crossings: { base: 2, head: 1, delta: -1 },
      bridgeFiles: { base: 1, head: 1, delta: 0 },
      files: {
        increased: [
          {
            id: "c",
            path: "src/domain/c.ts",
            language: "ts",
            status: "js",
            base: 10,
            head: 14,
            delta: 4
          }
        ],
        decreased: [
          {
            id: "a",
            path: "src/a.ts",
            language: "ts",
            status: "js",
            base: 20,
            head: 16,
            delta: -4
          }
        ]
      },
      topDebt: [
        {
          id: "a",
          path: "src/a.ts",
          language: "ts",
          status: "js",
          debt: 16,
          rloc: 30,
          crossings: 1
        }
      ]
    },
    symbols: {
      files: [
        {
          id: "c",
          path: "src/domain/c.ts",
          symbols: [
            {
              name: "resolver",
              kind: "function",
              status: "changed",
              base: { complexity: 12, lines: 40, line: 20 },
              head: { complexity: 18, lines: 52, line: 24 },
              complexityDelta: 6,
              addedLines: 16,
              removedLines: 4
            }
          ]
        }
      ],
      summary: {
        added: 1,
        removed: 0,
        changed: 1,
        topFile: { path: "src/domain/c.ts", changed: 1 }
      }
    }
  };
}
