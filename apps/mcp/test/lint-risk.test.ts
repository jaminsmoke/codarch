import { describe, expect, it } from "vitest";
import { createLintArtifact, lintRiskView, scopeHealth } from "@codarch/lint";
import { aggregateFolder, riskBreakdown } from "@codarch/metrics";
import { parseCcJson, type CcJson } from "@codarch/schema";
import { buildFiles, describeMetrics } from "../src/store-files";
import { buildFolders } from "../src/store-folders";
import { SNAPSHOT } from "./fixtures";

const TREE = "checksum-head";
const NFD = "Caf\u00e9.ts".normalize("NFD");

function withCafe(): CcJson {
  const copy = structuredClone(SNAPSHOT);
  const root = copy.files[0];
  if (!root || root.type !== "Folder") throw new Error("falta la raíz");
  root.children = [...(root.children ?? []), { id: "cafe", name: NFD, type: "File" }];
  copy.lenses = {
    ...copy.lenses,
    metrics: {
      ...copy.lenses?.metrics,
      attributes: {
        ...copy.lenses?.metrics?.attributes,
        cafe: { rloc: 12, maxComplexity: 2, number_of_commits: 1 }
      }
    }
  };
  return parseCcJson(copy);
}

function filesOf(cc: CcJson, lint: ReturnType<typeof createLintArtifact> | null) {
  return buildFiles(cc, describeMetrics(cc), lint);
}

describe("el MCP pasa scopeHealth por fichero al riesgo", () => {
  it("sin artefacto el riesgo es la base", () => {
    const files = filesOf(SNAPSHOT, null);
    const base = riskBreakdown(
      files.map((file) => ({
        complexity: file.complexity,
        churn: file.churn,
        size: file.size
      }))
    );
    for (const [index, file] of files.entries()) {
      expect(file.risk).toBe(base[index]?.risk);
      expect(file.riskBreakdown).not.toBeNull();
      expect(file.risk).toBe(file.riskBreakdown!.risk);
      expect(file.riskBreakdown!.score).toBeCloseTo(100 * file.risk);
      expect(file.risk).toBeGreaterThanOrEqual(0);
      expect(file.risk).toBeLessThanOrEqual(1);
    }
  });

  it("fresh true sube al fichero con hallazgos; false y null no", () => {
    const plain = filesOf(SNAPSHOT, null);
    const messages = [
      { rule: "no-var", severity: "error" as const, message: "usa let" }
    ];
    const fresh = filesOf(
      SNAPSHOT,
      createLintArtifact({
        tools: ["eslint"],
        tree: TREE,
        files: [{ path: "src/b.ts", messages }]
      })
    );
    const stale = filesOf(
      SNAPSHOT,
      createLintArtifact({
        tools: ["eslint"],
        tree: "otro",
        files: [{ path: "src/b.ts", messages }]
      })
    );
    const unverified = filesOf(
      SNAPSHOT,
      createLintArtifact({
        tools: ["eslint"],
        files: [{ path: "src/b.ts", messages }]
      })
    );
    const before = plain.find((file) => file.path === "src/b.ts");
    const now = fresh.find((file) => file.path === "src/b.ts");
    expect(now!.risk).toBeGreaterThan(before!.risk);
    expect(stale.find((file) => file.path === "src/b.ts")!.risk).toBeCloseTo(before!.risk);
    expect(unverified.find((file) => file.path === "src/b.ts")!.risk).toBeCloseTo(
      before!.risk
    );
  });

  it("unknown con hallazgos no se tira, y un fichero no aplicable no suma", () => {
    const unknown = createLintArtifact({
      tools: ["eslint"],
      tree: TREE,
      files: [
        {
          path: "index.ts",
          messages: [
            { rule: "no-var", severity: "error", message: "usa let" },
            { rule: "no-console", severity: "warn", message: "no" }
          ]
        }
      ]
    });
    const health = scopeHealth(unknown, { kind: "file", path: "index.ts" }, {
      treeHash: TREE,
      paths: ["index.ts"]
    });
    expect(health.coverage.state).toBe("unknown");
    expect(health.fresh).toBe(true);
    expect(lintRiskView(health).applicability).toBe("applicable");

    const plain = filesOf(SNAPSHOT, null);
    const raised = filesOf(SNAPSHOT, unknown);
    // src/a.ts ya está en el tope: un hallazgo allí no puede subir el índice.
    expect(raised.find((file) => file.path === "index.ts")!.risk).toBeGreaterThan(
      plain.find((file) => file.path === "index.ts")!.risk
    );

    const limited = createLintArtifact({
      tools: ["eslint"],
      tree: TREE,
      files: [],
      coverage: {
        tools: {
          eslint: {
            outcome: "enumerated",
            measuredPaths: ["src/a.ts"],
            eligiblePaths: ["src/a.ts"]
          }
        }
      }
    });
    const outside = scopeHealth(limited, { kind: "file", path: "src/b.ts" }, {
      treeHash: TREE,
      paths: plain.map((file) => file.path)
    });
    expect(lintRiskView(outside).applicability).toBe("na");
    const na = filesOf(SNAPSHOT, limited);
    expect(na.find((file) => file.path === "src/b.ts")!.risk).toBeCloseTo(
      plain.find((file) => file.path === "src/b.ts")!.risk
    );

    const missing = lintRiskView(
      scopeHealth(limited, { kind: "file", path: "src/no.ts" }, {
        treeHash: TREE,
        paths: plain.map((file) => file.path)
      })
    );
    expect(missing.applicability).toBe("not-found");
    const [row] = riskBreakdown([
      {
        complexity: 4,
        churn: 2,
        size: 8,
        lintView: missing
      }
    ]);
    expect(row?.risk).toBeGreaterThanOrEqual(0);
    expect(row?.risk).toBeLessThanOrEqual(1);
    expect(row?.score).toBeCloseTo(100 * (row?.risk ?? 0));
    expect(row?.lint.normalized).toBeNull();
  });

  it("una ruta NFD casa con el hallazgo y la carpeta toma el máximo", () => {
    const cc = withCafe();
    const plain = filesOf(cc, null);
    const lint = createLintArtifact({
      tools: ["eslint"],
      tree: TREE,
      files: [
        {
          path: NFD,
          messages: [{ rule: "no-any", severity: "error", message: "any" }]
        }
      ]
    });
    const files = filesOf(cc, lint);
    const cafe = files.find((file) => file.name === NFD);
    const before = plain.find((file) => file.name === NFD);
    expect(cafe?.path.normalize("NFC")).not.toBe(NFD);
    expect(cafe!.risk).toBeGreaterThan(before!.risk);

    const folders = buildFolders(files);
    const src = folders.get("src");
    const max = Math.max(...(src?.files.map((file) => file.risk) ?? []));
    expect(src?.risk).toBe(max);
    expect(
      aggregateFolder(
        (src?.files ?? []).map((file) => ({
          path: file.path,
          size: file.size,
          complexity: file.complexity,
          risk: file.risk
        }))
      ).risk
    ).toBe(max);

    const dirty = files.find((file) => file.path === "src/a.ts") ?? cafe!;
    const [breakdown] = riskBreakdown([
      {
        complexity: dirty.complexity,
        churn: dirty.churn,
        size: dirty.size,
        lintView: lintRiskView(
          scopeHealth(lint, { kind: "file", path: dirty.path }, {
            treeHash: TREE,
            paths: files.map((file) => file.path)
          })
        )
      }
    ]);
    expect(breakdown?.score).toBeGreaterThanOrEqual(0);
    expect(breakdown?.score).toBeLessThanOrEqual(100);
    expect(breakdown?.risk).toBeGreaterThanOrEqual(0);
    expect(breakdown?.risk).toBeLessThanOrEqual(1);
    const points = [
      breakdown?.contributions.complexity.points,
      breakdown?.contributions.churn.points,
      breakdown?.contributions.size.points,
      breakdown?.contributions.lint.points
    ].reduce<number>((sum, value) => sum + (value ?? 0), 0);
    expect(points).toBeCloseTo(breakdown?.score ?? 0);
  });
});
