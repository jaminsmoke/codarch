import { describe, expect, it } from "vitest";
import { createLintArtifact, lintRiskView, scopeHealth } from "@codarch/lint";
import { aggregateFolder, riskBreakdown } from "@codarch/metrics";
import { parseCcJson, type CcJson } from "@codarch/schema";
import { buildRenderModel } from "../src/index";

const TREE = "tree-d";
const NFD = "Caf\u00e9.ts".normalize("NFD");

/**
 * Cuatro ficheros con la base por debajo del tope, uno fuera del universo y
 * una ruta en NFD. El p95 de complejidad queda en 100, el de churn y tamaño
 * lo pone solo `peer`.
 */
function snapshot(): CcJson {
  return parseCcJson({
    meta: { projectName: "riesgo", apiVersion: "2.1", checksum: TREE },
    files: [
      {
        id: "root",
        name: "root",
        type: "Folder",
        children: [
          { id: "leader", name: "leader.ts", type: "File" },
          { id: "anchor", name: "anchor.ts", type: "File" },
          { id: "dirty", name: "dirty.ts", type: "File" },
          { id: "peer", name: "peer.ts", type: "File" },
          { id: "notes", name: "notes.md", type: "File" },
          { id: "cafe", name: NFD, type: "File" }
        ]
      }
    ],
    lenses: {
      metrics: {
        attributes: {
          leader: { rloc: 0, complexity: 100, number_of_commits: 0 },
          anchor: { rloc: 0, complexity: 100, number_of_commits: 0 },
          dirty: { rloc: 0, complexity: 80, number_of_commits: 0 },
          peer: { rloc: 40, complexity: 1, number_of_commits: 10 },
          notes: { rloc: 0, complexity: 0, number_of_commits: 0 },
          cafe: { rloc: 0, complexity: 3, number_of_commits: 0 }
        }
      }
    }
  });
}

const eligible = ["leader.ts", "anchor.ts", "dirty.ts", "peer.ts"];

function enumerated(paths: string[] = eligible) {
  return {
    tools: {
      eslint: {
        outcome: "enumerated" as const,
        measuredPaths: paths,
        eligiblePaths: paths
      }
    }
  };
}

function errors(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    rule: "no-any",
    severity: "error" as const,
    message: `any ${index}`
  }));
}

function fileNamed(model: ReturnType<typeof buildRenderModel>, name: string) {
  const file = model.files.find((entry) => entry.name === name);
  if (!file) throw new Error(`falta ${name}`);
  return file;
}

describe("el riesgo lee scopeHealth por fichero", () => {
  const cc = snapshot();

  it("sin artefacto el riesgo es la base y la deuda de la lente es cero", () => {
    const model = buildRenderModel(cc);
    const base = riskBreakdown(
      model.files.map((file) => ({
        complexity: file.complexity,
        churn: file.churn,
        size: file.actualArea
      }))
    );
    for (const [index, file] of model.files.entries()) {
      expect(file.lint).toBe(0);
      expect(file.risk).toBe(base[index]?.risk);
      expect(file.risk).toBeGreaterThanOrEqual(0);
      expect(file.risk).toBeLessThanOrEqual(1);
    }
  });

  it("fresh true sube el índice, fresh false y null no", () => {
    const plain = buildRenderModel(cc);
    const fresh = buildRenderModel(cc, {
      lint: createLintArtifact({
        tools: ["eslint"],
        tree: TREE,
        files: [{ path: "dirty.ts", messages: errors(10) }]
      })
    });
    const stale = buildRenderModel(cc, {
      lint: createLintArtifact({
        tools: ["eslint"],
        tree: "otro-arbol",
        files: [{ path: "dirty.ts", messages: errors(10) }]
      })
    });
    const unverified = buildRenderModel(cc, {
      lint: createLintArtifact({
        tools: ["eslint"],
        files: [{ path: "dirty.ts", messages: errors(10) }]
      })
    });

    const before = fileNamed(plain, "dirty.ts");
    const now = fileNamed(fresh, "dirty.ts");
    expect(now.lint).toBe(10);
    expect(now.risk).toBeGreaterThan(before.risk);
    expect(fileNamed(stale, "dirty.ts").risk).toBeCloseTo(before.risk);
    expect(fileNamed(unverified, "dirty.ts").risk).toBeCloseTo(before.risk);
    expect(fileNamed(stale, "dirty.ts").lint).toBe(10);
    expect(fileNamed(unverified, "dirty.ts").lint).toBe(10);

    const health = scopeHealth(
      createLintArtifact({
        tools: ["eslint"],
        tree: TREE,
        files: [{ path: "dirty.ts", messages: errors(10) }]
      }),
      { kind: "file", path: "dirty.ts" },
      { treeHash: TREE, paths: ["dirty.ts"] }
    );
    expect(health.fresh).toBe(true);
    expect(lintRiskView(health).applicability).toBe("applicable");
  });

  it("unknown con hallazgos y árbol al día cuenta como mínimo observado", () => {
    const plain = buildRenderModel(cc);
    const artifact = createLintArtifact({
      tools: ["eslint"],
      tree: TREE,
      files: [{ path: "dirty.ts", messages: errors(4) }]
    });
    const model = buildRenderModel(cc, { lint: artifact });
    const dirty = fileNamed(model, "dirty.ts");
    const health = scopeHealth(artifact, { kind: "file", path: "dirty.ts" }, {
      treeHash: TREE,
      paths: model.files.map((file) => file.path)
    });
    const view = lintRiskView(health);
    const [breakdown] = riskBreakdown([
      {
        complexity: dirty.complexity,
        churn: dirty.churn,
        size: dirty.actualArea,
        lintView: view
      },
      ...model.files
        .filter((file) => file.name !== "dirty.ts")
        .map((file) => ({
          complexity: file.complexity,
          churn: file.churn,
          size: file.actualArea,
          lintView: lintRiskView(
            scopeHealth(artifact, { kind: "file", path: file.path }, {
              treeHash: TREE,
              paths: model.files.map((entry) => entry.path)
            })
          )
        }))
    ]);

    expect(health.coverage.state).toBe("unknown");
    expect(health.counts.errors).toBe(4);
    expect(view.applicability).toBe("applicable");
    expect(dirty.risk).toBeGreaterThan(fileNamed(plain, "dirty.ts").risk);
    expect(dirty.risk).toBe(breakdown?.risk);
    expect(breakdown?.lint.confidence).toBe("observedMinimum");
    expect(breakdown?.lint.normalized).not.toBeNull();
    expect(breakdown?.score).toBeCloseTo(100 * (breakdown?.risk ?? 0));
    expect(breakdown?.score).toBeGreaterThanOrEqual(0);
    expect(breakdown?.score).toBeLessThanOrEqual(100);
    const points = [
      breakdown?.contributions.complexity.points,
      breakdown?.contributions.churn.points,
      breakdown?.contributions.size.points,
      breakdown?.contributions.lint.points
    ].reduce<number>((sum, value) => sum + (value ?? 0), 0);
    expect(points).toBeCloseTo(breakdown?.score ?? 0);
  });

  it("un fichero fuera del universo no suma, y uno que no está no es cero", () => {
    const artifact = createLintArtifact({
      tools: ["eslint"],
      tree: TREE,
      files: [],
      coverage: enumerated()
    });
    const plain = buildRenderModel(cc);
    const model = buildRenderModel(cc, { lint: artifact });
    const notes = fileNamed(model, "notes.md");
    const health = scopeHealth(artifact, { kind: "file", path: "notes.md" }, {
      treeHash: TREE,
      paths: model.files.map((file) => file.path)
    });
    const view = lintRiskView(health);
    expect(view.applicability).toBe("na");
    expect(view.reason).toBe("not-eligible");
    expect(notes.risk).toBeCloseTo(fileNamed(plain, "notes.md").risk);
    expect(notes.riskParts.lint.share).toBe(0);

    const missing = lintRiskView(
      scopeHealth(artifact, { kind: "file", path: "src/no.ts" }, {
        treeHash: TREE,
        paths: model.files.map((file) => file.path)
      })
    );
    expect(missing.applicability).toBe("not-found");
    expect(missing.reason).toBe("not-found");
    const [absent] = riskBreakdown([
      { complexity: 3, churn: 1, size: 2, lintView: missing }
    ]);
    expect(absent?.lint.normalized).toBeNull();
    expect(absent?.lint.applicability).toBe("not-found");
  });

  it("una ruta NFD del snapshot casa con el hallazgo NFC", () => {
    const plain = buildRenderModel(cc);
    const model = buildRenderModel(cc, {
      lint: createLintArtifact({
        tools: ["eslint"],
        tree: TREE,
        files: [
          {
            path: NFD,
            messages: [{ rule: "no-any", severity: "error", message: "any" }]
          }
        ]
      })
    });
    const cafe = fileNamed(model, NFD);
    expect(cafe.path.normalize("NFC")).not.toBe(NFD);
    expect(cafe.lint).toBe(1);
    expect(cafe.risk).toBeGreaterThan(fileNamed(plain, NFD).risk);
  });

  it("la carpeta se queda con el máximo, y el lint puede cambiar quién lo es", () => {
    const plain = buildRenderModel(cc);
    const model = buildRenderModel(cc, {
      lint: createLintArtifact({
        tools: ["eslint"],
        tree: TREE,
        coverage: enumerated(),
        files: [{ path: "dirty.ts", messages: errors(10) }]
      })
    });
    const maxOf = (files: typeof model.files) =>
      Math.max(...files.map((file) => file.risk));
    const folder = (files: typeof model.files) =>
      aggregateFolder(
        files.map((file) => ({
          path: file.path,
          size: file.actualArea,
          complexity: file.complexity,
          risk: file.risk
        }))
      );

    expect(folder(model.files).risk).toBe(maxOf(model.files));
    expect(folder(model.files).riskOwner).toBe("dirty.ts");
    expect(folder(plain.files).riskOwner).not.toBe("dirty.ts");
    expect(folder(model.files).risk).toBeGreaterThan(folder(plain.files).risk);
  });
});
