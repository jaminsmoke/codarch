import { describe, expect, it } from "vitest";
import type { LintArtifact, LintMessage } from "../src/format";
import {
  adoptEnumeration,
  coverageFromEnumeration,
  isCurrentClean,
  scopeHealth,
  type LintCoverage,
  type ToolCoverage
} from "../src/health";

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
    meta: { checksum: "abc", tools: ["eslint"], systems: [] },
    files: {},
    summary: { files: 0, errors: 0, warnings: 0, messages: 0 },
    ...over
  };
}

function enumerated(
  measured: string[],
  eligible: string[] | null
): ToolCoverage {
  return { outcome: "enumerated", measuredPaths: measured, eligiblePaths: eligible };
}

function withCoverage(
  tools: LintCoverage["tools"],
  files: LintArtifact["files"] = {},
  over: Partial<LintArtifact> = {}
): LintArtifact {
  return artifact({
    files,
    coverage: { tools },
    meta: {
      checksum: "abc",
      tools: Object.keys(tools).filter((name) => tools[name]?.outcome === "enumerated"),
      systems: [],
      tree: "tree-1"
    },
    ...over
  });
}

const project = { kind: "project" as const, path: "" };

describe("scopeHealth", () => {
  it("sin artefacto no es cero medido: es sin medir", () => {
    const health = scopeHealth(null, project);

    expect(health.coverage.state).toBe("unmeasured");
    expect(health.coverage.eligible).toBeNull();
    expect(health.coverage.measured).toBeNull();
    expect(health.fresh).toBeNull();
    expect(health.coverage.reasons.map((item) => item.code)).toEqual([
      "freshness-unverified"
    ]);
    expect(health.counts).toEqual({
      errors: 0,
      warnings: 0,
      info: 0,
      findings: 0,
      filesWithFindings: 0
    });
    expect(isCurrentClean(health)).toBe(false);
  });

  it("un 1.0, un 1.1 y un 1.2 son unknown con legacy-global, y no inventan medidos", () => {
    for (const schemaVersion of ["1.0", "1.1", "1.2"] as const) {
      const health = scopeHealth(
        artifact({
          schemaVersion,
          summary: { files: 9, errors: 9, warnings: 9, messages: 9, measured: 9 },
          files: {
            "src/a.ts": {
              errors: 9,
              warnings: 9,
              messages: [message()]
            }
          }
        }),
        project,
        { treeHash: "tree-1", paths: ["src/a.ts"] }
      );

      expect(health.coverage.state).toBe("unknown");
      expect(health.coverage.measured).toBeNull();
      expect(health.coverage.eligible).toBeNull();
      expect(health.coverage.reasons.map((item) => item.code)).toContain(
        "legacy-global"
      );
      expect(health.counts).toMatchObject({ warnings: 1, findings: 1, filesWithFindings: 1 });
      expect(health.fresh).toBeNull();
    }
  });

  it("un legado con meta.tree compara la frescura y no borra el unknown", () => {
    const legacy = artifact({
      schemaVersion: "1.2",
      meta: { checksum: "abc", tools: ["eslint"], systems: [], tree: "tree-1" },
      files: {
        "src/a.ts": { errors: 0, warnings: 1, messages: [message()] }
      }
    });

    const same = scopeHealth(legacy, project, { treeHash: "tree-1", paths: [] });
    const other = scopeHealth(legacy, project, { treeHash: "otra", paths: [] });

    expect(same.fresh).toBe(true);
    expect(same.coverage.state).toBe("unknown");
    expect(other.fresh).toBe(false);
    expect(other.coverage.state).toBe("unknown");
    expect(other.coverage.reasons.map((item) => item.code)).not.toContain(
      "freshness-unverified"
    );
  });

  it("los mensajes se conservan con cobertura unknown o parcial, y las cuentas son la suma", () => {
    const files: LintArtifact["files"] = {
      "src/a.ts": {
        errors: 0,
        warnings: 1,
        messages: [message(), message({ severity: "info", rule: "no-console", message: "log" })]
      },
      "src/b.ts": {
        errors: 1,
        warnings: 0,
        messages: [message({ severity: "error", rule: "no-var", message: "var" })]
      }
    };
    const health = scopeHealth(
      withCoverage(
        {
          eslint: enumerated(["src/a.ts"], null),
          oxlint: {
            outcome: "unknown",
            eligiblePaths: null,
            reasons: [{ code: "unknown-eligibility" }]
          }
        },
        files
      ),
      project
    );

    expect(health.coverage.state).toBe("partial");
    expect(health.coverage.measured).toBe(1);
    expect(health.coverage.eligible).toBeNull();
    expect(health.counts).toEqual({
      errors: 1,
      warnings: 1,
      info: 1,
      findings: 3,
      filesWithFindings: 2
    });
    const summed = health.affectedFiles.reduce(
      (total, file) => ({
        errors: total.errors + file.counts.errors,
        warnings: total.warnings + file.counts.warnings,
        info: total.info + file.counts.info,
        findings: total.findings + file.counts.findings,
        filesWithFindings: total.filesWithFindings + file.counts.filesWithFindings
      }),
      { errors: 0, warnings: 0, info: 0, findings: 0, filesWithFindings: 0 }
    );
    expect(health.counts).toEqual(summed);
    expect(health.messages).toEqual([]);
    expect(health.fresh).toBeNull();
  });

  it("una medida vieja no borra el parcial", () => {
    const health = scopeHealth(
      withCoverage(
        {
          eslint: enumerated(["src/a.ts"], null),
          oxlint: { outcome: "failed", eligiblePaths: null, reasons: [{ code: "tool-failed" }] }
        },
        {
          "src/a.ts": { errors: 0, warnings: 1, messages: [message()] }
        }
      ),
      project,
      { treeHash: "otro-arbol", paths: ["src/a.ts"] }
    );

    expect(health.coverage.state).toBe("partial");
    expect(health.fresh).toBe(false);
    expect(health.counts.findings).toBe(1);
  });

  it("ESLint y Checkstyle no cierran el universo: nunca complete", () => {
    for (const name of ["eslint", "checkstyle"]) {
      const health = scopeHealth(
        withCoverage(
          { [name]: enumerated(["src/a.ts", "src/b.ts"], null) },
          {},
          { domain: "code", meta: { checksum: "abc", tools: [name], systems: [], tree: "tree-1" } }
        ),
        project,
        { treeHash: "tree-1", paths: ["src/a.ts", "src/b.ts"] }
      );

      expect(health.coverage.state).toBe("unknown");
      expect(health.coverage.measured).toBe(2);
      expect(health.coverage.eligible).toBeNull();
      expect(health.coverage.reasons.map((item) => item.code)).toContain(
        "unknown-eligibility"
      );
      expect(isCurrentClean(health)).toBe(false);
    }
  });

  it("los documentos se conocen enteros: complete si el árbol cuadra y no hay hallazgos", () => {
    const health = scopeHealth(
      withCoverage(
        { codarch: enumerated(["README.md", "docs/a.md"], ["README.md", "docs/a.md"]) },
        {},
        {
          domain: "docs",
          meta: { checksum: "abc", tools: ["codarch"], systems: [], tree: "rest-1" }
        }
      ),
      project,
      { treeHash: "rest-1", paths: ["README.md", "docs/a.md"] }
    );

    expect(health.domain).toBe("docs");
    expect(health.coverage.state).toBe("complete");
    expect(health.coverage.eligible).toBe(2);
    expect(health.coverage.measured).toBe(2);
    expect(health.fresh).toBe(true);
    expect(isCurrentClean(health)).toBe(true);
  });

  it("complete con frescura null no es limpio actual", () => {
    const health = scopeHealth(
      withCoverage(
        { codarch: enumerated(["README.md"], ["README.md"]) },
        {},
        { domain: "docs", meta: { checksum: "abc", tools: ["codarch"], systems: [] } }
      ),
      project
    );

    expect(health.coverage.state).toBe("complete");
    expect(health.fresh).toBeNull();
    expect(health.counts.findings).toBe(0);
    expect(isCurrentClean(health)).toBe(false);
    expect(health.coverage.reasons.map((item) => item.code)).toContain(
      "freshness-unverified"
    );
  });

  it("eligiblePaths vacío es no-eligible, no medido y limpio", () => {
    const health = scopeHealth(
      withCoverage(
        { codarch: enumerated([], []) },
        {},
        {
          domain: "docs",
          meta: { checksum: "abc", tools: ["codarch"], systems: [], tree: "rest-1" }
        }
      ),
      project,
      { treeHash: "rest-1", paths: [] }
    );

    expect(health.coverage.state).toBe("unmeasured");
    expect(health.coverage.reasons.map((item) => item.code)).toContain("no-eligible");
    expect(health.coverage.eligible).toBe(0);
    expect(health.coverage.measured).toBe(0);
    expect(isCurrentClean(health)).toBe(false);
  });

  it("not-eligible solo con universo probado; not-found solo si el snapshot lo demuestra", () => {
    const docs = withCoverage(
      { codarch: enumerated(["README.md"], ["README.md"]) },
      {},
      { domain: "docs", meta: { checksum: "abc", tools: ["codarch"], systems: [], tree: "rest-1" } }
    );

    const missing = scopeHealth(docs, { kind: "file", path: "docs/no.md" }, {
      treeHash: "rest-1",
      paths: ["README.md"]
    });
    expect(missing.coverage.state).toBe("unmeasured");
    expect(missing.coverage.reasons.map((item) => item.code)).toContain("not-found");

    const outside = scopeHealth(docs, { kind: "file", path: "docs/otro.md" }, {
      treeHash: "rest-1",
      paths: ["README.md", "docs/otro.md"]
    });
    expect(outside.coverage.state).toBe("unmeasured");
    expect(outside.coverage.reasons.map((item) => item.code)).toContain("not-eligible");
    expect(outside.coverage.eligible).toBe(0);

    // Sin snapshot no se puede decir «no está», pero el universo sí dice que no entra.
    const noSnapshot = scopeHealth(docs, { kind: "file", path: "docs/fantasma.md" });
    expect(noSnapshot.coverage.state).toBe("unmeasured");
    expect(noSnapshot.coverage.reasons.map((item) => item.code)).toContain("not-eligible");
    expect(noSnapshot.coverage.reasons.map((item) => item.code)).not.toContain("not-found");

    const unresolved = scopeHealth(
      withCoverage({ eslint: enumerated(["src/a.ts"], null) }, {}),
      { kind: "file", path: "src/fantasma.ts" }
    );
    expect(unresolved.coverage.state).toBe("unknown");
    expect(unresolved.coverage.reasons.map((item) => item.code)).toContain("unknown-paths");
    expect(unresolved.coverage.reasons.map((item) => item.code)).not.toContain("not-found");
    expect(unresolved.coverage.measured).toBeNull();
  });

  it("sin universo no se dice not-eligible", () => {
    const health = scopeHealth(
      withCoverage({ eslint: enumerated(["src/a.ts"], null) }, {}),
      { kind: "file", path: "src/b.ts" },
      { treeHash: "tree-1", paths: ["src/a.ts", "src/b.ts"] }
    );

    expect(health.coverage.reasons.map((item) => item.code)).not.toContain("not-eligible");
    expect(health.coverage.reasons.map((item) => item.code)).not.toContain("not-found");
    expect(health.coverage.eligible).toBeNull();
    expect(health.coverage.measured).toBe(0);
  });

  it("la carpeta suma solo lo suyo y el fichero devuelve sus mensajes", () => {
    const files: LintArtifact["files"] = {
      "src/a.ts": { errors: 0, warnings: 1, messages: [message({ message: "uno" })] },
      "lib/b.ts": {
        errors: 1,
        warnings: 0,
        messages: [message({ severity: "error", message: "dos" })]
      }
    };
    const source = withCoverage(
      { codarch: enumerated(["src/a.ts", "lib/b.ts"], ["src/a.ts", "lib/b.ts"]) },
      files,
      { domain: "docs" }
    );

    const folder = scopeHealth(source, { kind: "folder", path: "src" });
    expect(folder.counts).toMatchObject({ warnings: 1, errors: 0, filesWithFindings: 1 });
    expect(folder.affectedFiles.map((file) => file.path)).toEqual(["src/a.ts"]);
    expect(folder.messages).toEqual([]);
    expect(folder.coverage.eligible).toBe(1);
    expect(folder.coverage.measured).toBe(1);

    const file = scopeHealth(source, { kind: "file", path: "src/Cafe\u0301.ts".replace("Cafe\u0301", "a") });
    expect(file.messages.map((item) => item.message)).toEqual(["uno"]);
  });

  it("busca el fichero por la ruta canónica", () => {
    const health = scopeHealth(
      withCoverage(
        { eslint: enumerated(["src/Caf\u00e9.ts"], null) },
        {
          "src/Caf\u00e9.ts": { errors: 0, warnings: 1, messages: [message()] }
        }
      ),
      { kind: "file", path: "src/Cafe\u0301.ts" }
    );

    expect(health.scope.path).toBe("src/Caf\u00e9.ts");
    expect(health.counts.warnings).toBe(1);
    expect(health.messages).toHaveLength(1);
  });

  it("oxlint, biome, ruff, go vet y dotnet no enumeran: unknown y los hallazgos se quedan", () => {
    for (const name of ["oxlint", "biome", "ruff", "go-vet", "dotnet"]) {
      const adopted = adoptEnumeration(name, { ok: true, paths: ["src/a.ts"] });
      expect(adopted).toBe("unsupported");
      const coverage = coverageFromEnumeration(adopted);
      expect(coverage).toEqual({
        outcome: "unknown",
        eligiblePaths: null,
        reasons: [{ code: "unknown-eligibility" }]
      });
    }

    const health = scopeHealth(
      withCoverage(
        {
          oxlint: {
            outcome: "unknown",
            eligiblePaths: null,
            reasons: [{ code: "unknown-eligibility" }]
          }
        },
        { "src/a.ts": { errors: 0, warnings: 1, messages: [message()] } }
      ),
      project
    );
    expect(health.coverage.state).toBe("unknown");
    expect(health.coverage.measured).toBeNull();
    expect(health.counts.warnings).toBe(1);
  });
});

describe("la enumeración de un adaptador", () => {
  it("[] solo si la enumeración es válida; un fallo no es una lista vacía", () => {
    expect(adoptEnumeration("eslint", { ok: true, paths: [] })).toEqual({
      ok: true,
      measuredPaths: []
    });
    expect(adoptEnumeration("checkstyle-xml", { ok: true, paths: ["src/A.java"] })).toEqual({
      ok: true,
      measuredPaths: ["src/A.java"]
    });
    const failed = adoptEnumeration("eslint", {
      ok: false,
      reason: { code: "tool-failed", text: "no es JSON" }
    });
    expect(failed).toEqual({ ok: false, reason: { code: "tool-failed", text: "no es JSON" } });
    expect(failed).not.toHaveProperty("measuredPaths");

    expect(coverageFromEnumeration(failed as { ok: false; reason: { code: "tool-failed"; text: string } })).toEqual({
      outcome: "failed",
      eligiblePaths: null,
      reasons: [{ code: "tool-failed", text: "no es JSON" }]
    });
    expect(
      coverageFromEnumeration({ ok: false, reason: { code: "tool-missing", text: "no está" } })
    ).toMatchObject({ outcome: "missing" });
  });
});
