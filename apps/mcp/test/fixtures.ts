import type { DiffReport } from "@codarch/metrics";
import { parseCcJson, type CcJson } from "@codarch/schema";
import { ArchitectureStore } from "../src/store";

export const SNAPSHOT: CcJson = {
  meta: {
    projectName: "Acme",
    apiVersion: "2.1",
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
    }
  }
};

export function makeStore(report: DiffReport | null = makeReport()): ArchitectureStore {
  return new ArchitectureStore(parseCcJson(SNAPSHOT), {
    root: "C:/repo",
    report
  });
}

export function makeReport(): DiffReport {
  return {
    schemaVersion: "1.0",
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
      hotspots: 1
    },
    hotspotMetric: "maxComplexity",
    rules: {
      configured: true,
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
    ]
  };
}
