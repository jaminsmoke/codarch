import { describe, expect, it } from "vitest";
import type { LintArtifact, LintMessage } from "../src/format";
import { scopeHealth, type ToolCoverage } from "../src/health";
import { scopeHealthMerged } from "../src/merged";

function message(over: Partial<LintMessage> = {}): LintMessage {
  return {
    rule: "no-unused-vars",
    severity: "warn",
    message: "la variable no se usa",
    ...over
  };
}

function artifact(over: Partial<LintArtifact> = {}): LintArtifact {
  return {
    schemaVersion: "1.3",
    domain: "code",
    meta: { checksum: "abc", tools: ["eslint"], systems: [], tree: "code-tree" },
    files: {},
    summary: { files: 0, errors: 0, warnings: 0, messages: 0 },
    ...over
  };
}

function enumerated(measured: string[], eligible: string[] | null): ToolCoverage {
  return { outcome: "enumerated", measuredPaths: measured, eligiblePaths: eligible };
}

const project = { kind: "project" as const, path: "" };

describe("scopeHealthMerged", () => {
  it("en la raíz suma los dos orígenes y no recorta los docs con las rutas del código", () => {
    const code = artifact({
      schemaVersion: "1.2",
      meta: { checksum: "abc", tools: ["eslint"], systems: [], tree: "code-tree" },
      summary: { files: 0, errors: 0, warnings: 0, messages: 0, measured: 12 },
      files: {
        "src/a.ts": {
          errors: 0,
          warnings: 1,
          messages: [message()]
        }
      }
    });
    const docs = artifact({
      domain: "docs",
      meta: {
        checksum: "def",
        tools: ["codarch"],
        systems: [
          {
            name: "codarch",
            config: null,
            rules: [{ id: "doc/broken-link", severity: "error" }]
          }
        ],
        tree: "docs-tree"
      },
      files: {
        "apps/site/docs/nota.md": {
          errors: 2,
          warnings: 0,
          messages: [
            message({
              rule: "doc/broken-link",
              severity: "error",
              message: "el enlace no llega"
            }),
            message({
              rule: "doc/broken-link",
              severity: "error",
              message: "otro enlace no llega"
            })
          ]
        }
      },
      coverage: {
        tools: {
          codarch: enumerated(
            ["apps/site/docs/nota.md", "apps/site/docs/otra.md"],
            ["apps/site/docs/nota.md", "apps/site/docs/otra.md"]
          )
        }
      },
      summary: { files: 1, errors: 2, warnings: 0, messages: 2, measured: 2 }
    });
    const codePaths = ["src/a.ts", "src/b.ts"];
    const health = scopeHealthMerged([code, docs], project, {
      treeHash: "code-tree",
      paths: codePaths
    });

    expect(health.counts.findings).toBe(3);
    expect(health.counts).toEqual({
      errors: 2,
      warnings: 1,
      info: 0,
      findings: 3,
      filesWithFindings: 2
    });
    const summed = health.origins.reduce(
      (total, origin) => ({
        errors: total.errors + origin.counts.errors,
        warnings: total.warnings + origin.counts.warnings,
        info: total.info + origin.counts.info,
        findings: total.findings + origin.counts.findings,
        filesWithFindings: total.filesWithFindings + origin.counts.filesWithFindings
      }),
      { errors: 0, warnings: 0, info: 0, findings: 0, filesWithFindings: 0 }
    );
    expect(health.counts).toEqual(summed);
    expect(health.findings).toHaveLength(health.counts.findings);
    expect(health.findings.map((finding) => finding.path)).toContain(
      "apps/site/docs/nota.md"
    );
    expect(
      health.paths.some(
        (row) => row.path === "apps/site/docs/otra.md" && row.kind === "enumerated"
      )
    ).toBe(true);
    expect(health.domains.map((domain) => domain.domain)).toEqual(["code", "docs"]);
    expect(health.domains.every((domain) => domain.applicability === "applicable")).toBe(
      true
    );
    expect(health.origins[0]?.tree).toBe("code-tree");
    expect(health.origins[1]?.tree).toBe("docs-tree");
    expect(health.origins[0]?.fresh).toBe(true);
    expect(health.origins[1]?.fresh).toBeNull();
    expect(health.clean).toBe(false);
    expect(health.coverage.state).not.toBe("complete");
  });

  it("un legado con measured > 0 no pasa a complete ni a verificado", () => {
    const legacy = artifact({
      schemaVersion: "1.2",
      summary: { files: 1, errors: 0, warnings: 1, messages: 1, measured: 9 },
      files: {
        "src/a.ts": { errors: 0, warnings: 1, messages: [message()] }
      }
    });
    const health = scopeHealthMerged([legacy], project, {
      treeHash: "code-tree",
      paths: ["src/a.ts"]
    });
    const origin = health.origins[0];

    expect(origin?.declaredMeasured).toBe(9);
    expect(origin?.coverage.state).toBe("unknown");
    expect(origin?.coverage.measured).toBeNull();
    expect(origin?.coverage.reasons.map((item) => item.code)).toContain("legacy-version");
    expect(health.coverage.state).toBe("unknown");
    expect(health.paths.every((row) => row.state !== "complete")).toBe(true);
    expect(health.clean).toBe(false);
    expect(scopeHealth(legacy, project).coverage.state).toBe("unknown");
  });

  it("filtra carpeta y fichero por la ruta canónica, no por el listado del código", () => {
    const docs = artifact({
      domain: "docs",
      meta: {
        checksum: "def",
        tools: ["codarch"],
        systems: [],
        tree: "docs-tree"
      },
      files: {
        "apps/site/docs/./nota.md": {
          errors: 1,
          warnings: 0,
          messages: [
            message({ rule: "doc/broken-link", severity: "error", message: "roto" })
          ]
        },
        "apps/site-docs/otro.md": {
          errors: 1,
          warnings: 0,
          messages: [
            message({ rule: "doc/broken-link", severity: "error", message: "otro" })
          ]
        }
      },
      coverage: {
        tools: {
          codarch: enumerated(
            ["apps/site/docs/nota.md", "apps/site-docs/otro.md"],
            ["apps/site/docs/nota.md", "apps/site-docs/otro.md"]
          )
        }
      }
    });
    const snapshot = { treeHash: "code-tree", paths: ["src/a.ts"] };
    const folder = scopeHealthMerged([docs], { kind: "folder", path: "apps/site/docs" }, snapshot);
    const file = scopeHealthMerged(
      [docs],
      { kind: "file", path: "./apps/site/docs/nota.md" },
      snapshot
    );

    expect(folder.findings.map((finding) => finding.path)).toEqual([
      "apps/site/docs/nota.md"
    ]);
    expect(folder.counts.findings).toBe(1);
    expect(file.findings).toHaveLength(1);
    expect(file.findings[0]).toMatchObject({
      domain: "docs",
      tool: "codarch",
      inferred: false,
      ruleId: "doc/broken-link",
      anchor: { map: "rest", path: "apps/site/docs/nota.md" }
    });
    expect(file.domains[0]?.applicability).toBe("applicable");
  });

  it("un code 1.3 con eslint sin universo y oxlint unknown sigue en partial", () => {
    const measured = Array.from({ length: 3 }, (_, index) => `src/f${index}.ts`);
    const code = artifact({
      meta: {
        checksum: "abc",
        tools: ["eslint", "oxlint"],
        systems: [
          { name: "eslint", config: "eslint.config.js", rules: [{ id: "no-var", severity: "error" }] },
          { name: "oxlint", config: null, note: "corre sus correcciones por defecto; no se enumeran" }
        ],
        tree: "code-tree"
      },
      files: {
        "src/f0.ts": {
          errors: 1,
          warnings: 0,
          messages: [message({ rule: "no-var", severity: "error", message: "var" })]
        }
      },
      coverage: {
        tools: {
          eslint: enumerated(measured, null),
          oxlint: {
            outcome: "unknown",
            eligiblePaths: null,
            reasons: [{ code: "unknown-eligibility" }]
          }
        }
      }
    });
    const health = scopeHealthMerged([code], project, {
      treeHash: "code-tree",
      paths: measured
    });

    expect(health.origins[0]?.coverage.state).toBe("partial");
    expect(health.coverage.state).toBe("partial");
    expect(health.clean).toBe(false);
    expect(health.paths.every((row) => row.state !== "complete")).toBe(true);
    expect(health.findings[0]).toMatchObject({
      tool: "eslint",
      inferred: true,
      ruleId: "no-var",
      anchor: { map: "code", path: "src/f0.ts" }
    });
  });

  it("si la regla está en las dos herramientas no se cuenta dos veces y se marca inferida", () => {
    const code = artifact({
      meta: {
        checksum: "abc",
        tools: ["eslint", "oxlint"],
        systems: [
          { name: "eslint", config: null, rules: [{ id: "no-var", severity: "error" }] },
          { name: "oxlint", config: null, rules: [{ id: "no-var", severity: "error" }] }
        ],
        tree: "code-tree"
      },
      files: {
        "src/a.ts": {
          errors: 1,
          warnings: 0,
          messages: [message({ rule: "no-var", severity: "error", message: "var" })]
        }
      },
      coverage: {
        tools: {
          eslint: enumerated(["src/a.ts"], null),
          oxlint: {
            outcome: "unknown",
            eligiblePaths: null,
            reasons: [{ code: "unknown-eligibility" }]
          }
        }
      }
    });
    const health = scopeHealthMerged([code], { kind: "file", path: "src/a.ts" });

    expect(health.findings).toHaveLength(1);
    expect(health.counts.findings).toBe(1);
    expect(health.findings[0]).toMatchObject({
      tool: "eslint+oxlint",
      inferred: true
    });
  });

  it("un prefijo de plugin se atribuye a eslint y queda inferido", () => {
    const code = artifact({
      meta: {
        checksum: "abc",
        tools: ["eslint", "oxlint"],
        systems: [],
        tree: "code-tree"
      },
      files: {
        "src/a.ts": {
          errors: 0,
          warnings: 1,
          messages: [
            message({ rule: "@typescript-eslint/no-explicit-any", message: "any" })
          ]
        }
      }
    });
    const finding = scopeHealthMerged([code], project).findings[0];

    expect(finding).toMatchObject({ tool: "eslint", inferred: true });
  });

  it("está limpio solo cuando cada dominio aplicable está completo, fresco y sin hallazgos", () => {
    const docs = artifact({
      domain: "docs",
      meta: { checksum: "def", tools: ["codarch"], systems: [], tree: "docs-tree" },
      coverage: {
        tools: {
          codarch: enumerated(["docs/a.md"], ["docs/a.md"])
        }
      }
    });
    const snapshot = { treeHash: "docs-tree", paths: ["docs/a.md"] };
    const alone = scopeHealthMerged([docs], { kind: "file", path: "docs/a.md" }, snapshot);

    expect(alone.clean).toBe(true);
    expect(alone.domains[0]?.applicability).toBe("applicable");

    const legacy = artifact({
      schemaVersion: "1.2",
      meta: { checksum: "abc", tools: ["eslint"], systems: [], tree: "code-tree" },
      summary: { files: 0, errors: 0, warnings: 0, messages: 0, measured: 4 }
    });
    const withLegacy = scopeHealthMerged([legacy, docs], project, {
      treeHash: "code-tree",
      paths: ["src/a.ts"]
    });

    expect(withLegacy.clean).toBe(false);
    expect(withLegacy.coverage.state).toBe("unknown");
    const docsFile = scopeHealthMerged([legacy, docs], { kind: "file", path: "docs/a.md" }, {
      treeHash: "code-tree",
      paths: ["src/a.ts"]
    });
    expect(docsFile.domains.find((domain) => domain.domain === "code")?.applicability).toBe(
      "not-applicable"
    );
    expect(docsFile.domains.find((domain) => domain.domain === "docs")?.applicability).toBe(
      "applicable"
    );
  });
});
