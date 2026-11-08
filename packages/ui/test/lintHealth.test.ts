import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { LintArtifact, LintCoverage, LintMessage, ToolCoverage } from "@codarch/lint/browser";
import { scopeHealth } from "@codarch/lint/browser";
import { LintSection } from "../src/LintSection";
import { healthCopy, healthOf } from "../src/lintHealth";

function message(over: Partial<LintMessage> = {}): LintMessage {
  return {
    rule: "no-console",
    severity: "error",
    message: "Unexpected console",
    line: 12,
    column: 3,
    ...over
  };
}

function artifact(over: Partial<LintArtifact> = {}): LintArtifact {
  return {
    schemaVersion: "1.3",
    domain: "code",
    meta: { checksum: "abc", tools: ["eslint"], systems: [], tree: "tree-1" },
    files: {},
    summary: { files: 0, errors: 0, warnings: 0, messages: 0 },
    ...over
  };
}

function enumerated(measured: string[], eligible: string[] | null): ToolCoverage {
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
    ...over
  });
}

const current = { treeHash: "tree-1", paths: ["src/a.ts", "src/b.ts", "README.md"] };

function markup(
  lint: LintArtifact | null,
  scope: { folder: string; filePath?: string } = { folder: "" },
  snapshot: { treeHash: string | null; paths: readonly string[] } | undefined = current
): string {
  return renderToStaticMarkup(
    createElement(LintSection, {
      id: "lint",
      artifact: lint,
      folder: scope.folder,
      filePath: scope.filePath,
      snapshot
    })
  );
}

describe("la ficha sigue a scopeHealth", () => {
  it("complete y fresh true con hallazgos cero y elegibles es limpio y al día", () => {
    const lint = withCoverage(
      { codarch: enumerated(["README.md", "docs/a.md"], ["README.md", "docs/a.md"]) },
      {},
      {
        domain: "docs",
        meta: { checksum: "abc", tools: ["codarch"], systems: [], tree: "tree-1" }
      }
    );
    const health = healthOf(lint, { kind: "project", path: "" }, {
      treeHash: "tree-1",
      paths: ["README.md", "docs/a.md"]
    });
    expect(health.coverage.state).toBe("complete");
    expect(health.fresh).toBe(true);
    expect(health.coverage.eligible).toBeGreaterThan(0);
    const html = markup(lint, { folder: "" }, {
      treeHash: "tree-1",
      paths: ["README.md", "docs/a.md"]
    });
    expect(html).toContain("Limpio y al día");
    expect(html).not.toContain("Medido y limpio");
    expect(healthCopy(health)).toBe("Limpio y al día.");
  });

  it("partial conserva el hallazgo y avisa de la cobertura", () => {
    const lint = withCoverage(
      {
        eslint: enumerated(["src/a.ts"], null),
        oxlint: {
          outcome: "failed",
          eligiblePaths: null,
          reasons: [{ code: "tool-failed", text: "la salida no es JSON" }]
        }
      },
      {
        "src/a.ts": {
          errors: 1,
          warnings: 0,
          messages: [message()]
        }
      }
    );
    const health = scopeHealth(lint, { kind: "project", path: "" }, current);
    expect(health.coverage.state).toBe("partial");
    expect(health.counts.findings).toBe(1);
    const html = markup(lint);
    expect(html).toContain("Cobertura parcial");
    expect(html).toContain("src/a.ts");
    expect(html).toContain("1 error");
    expect(html).toContain("Una herramienta falló");
    expect(html).not.toContain("Limpio y al día");
    const file = markup(lint, { folder: "src/a.ts", filePath: "src/a.ts" });
    expect(file).toContain("Unexpected console");
    expect(file).toContain("12:3");
    expect(file).toContain("no-console");
  });

  it("unknown de ESLint o Checkstyle dice medidos N y universo no verificado", () => {
    for (const name of ["eslint", "checkstyle"] as const) {
      const lint = withCoverage(
        { [name]: enumerated(["src/a.ts", "src/b.ts"], null) },
        {},
        { meta: { checksum: "abc", tools: [name], systems: [], tree: "tree-1" } }
      );
      const health = scopeHealth(lint, { kind: "project", path: "" }, current);
      expect(health.coverage.state).toBe("unknown");
      expect(health.coverage.measured).toBe(2);
      expect(health.fresh).toBe(true);
      const html = markup(lint);
      expect(html).toContain("Medidos 2, sin hallazgos, universo no verificado.");
      expect(html).not.toContain("Limpio y al día");
    }
  });

  it("fresh true, false y null no se confunden", () => {
    const complete = withCoverage(
      { codarch: enumerated(["README.md"], ["README.md"]) },
      {},
      {
        domain: "docs",
        meta: { checksum: "abc", tools: ["codarch"], systems: [], tree: "tree-1" }
      }
    );
    const snap = { treeHash: "tree-1", paths: ["README.md"] };
    const fresh = scopeHealth(complete, { kind: "project", path: "" }, snap);
    const stale = scopeHealth(complete, { kind: "project", path: "" }, {
      treeHash: "otro",
      paths: ["README.md"]
    });
    const unverified = scopeHealth(complete, { kind: "project", path: "" });

    expect(fresh.fresh).toBe(true);
    expect(stale.fresh).toBe(false);
    expect(unverified.fresh).toBeNull();
    expect(healthCopy(fresh)).toBe("Limpio y al día.");
    expect(healthCopy(unverified)).toBe("Sin hallazgos, no verificado.");
    expect(healthCopy(stale)).toContain("desfasado");
    expect(healthCopy(stale)).not.toContain("Limpio y al día");

    const html = markup(complete, { folder: "" }, { treeHash: "otro", paths: ["README.md"] });
    expect(html).toContain("otro árbol");
    expect(html).not.toContain("Limpio y al día");
  });

  it("un partial viejo no se borra", () => {
    const lint = withCoverage(
      {
        eslint: enumerated(["src/a.ts"], null),
        oxlint: { outcome: "failed", eligiblePaths: null, reasons: [{ code: "tool-failed" }] }
      },
      { "src/a.ts": { errors: 1, warnings: 0, messages: [message()] } }
    );
    const health = scopeHealth(lint, { kind: "project", path: "" }, {
      treeHash: "otro",
      paths: ["src/a.ts"]
    });
    expect(health.coverage.state).toBe("partial");
    expect(health.fresh).toBe(false);
    const html = markup(lint, { folder: "" }, { treeHash: "otro", paths: ["src/a.ts"] });
    expect(html).toContain("Cobertura parcial");
    expect(html).toContain("src/a.ts");
    expect(html).toContain("otro árbol");
  });

  it("no aplica: not-found, not-eligible y no-eligible son sin medir", () => {
    const docs = withCoverage(
      { codarch: enumerated(["README.md"], ["README.md"]) },
      {},
      {
        domain: "docs",
        meta: { checksum: "abc", tools: ["codarch"], systems: [], tree: "tree-1" }
      }
    );
    const snap = { treeHash: "tree-1", paths: ["README.md", "docs/otro.md"] };

    const missing = markup(docs, { folder: "docs/no.md", filePath: "docs/no.md" }, {
      treeHash: "tree-1",
      paths: ["README.md"]
    });
    expect(missing).toContain("Sin medir");
    expect(missing).toContain("no está en el árbol");
    expect(missing).not.toContain("Limpio y al día");

    const outside = markup(docs, { folder: "docs/otro.md", filePath: "docs/otro.md" }, snap);
    expect(outside).toContain("Sin medir");
    expect(outside).toContain("no entra en el universo medible");

    const empty = withCoverage(
      { codarch: enumerated([], []) },
      {},
      {
        domain: "docs",
        meta: { checksum: "abc", tools: ["codarch"], systems: [], tree: "tree-1" }
      }
    );
    const none = markup(empty, { folder: "" }, { treeHash: "tree-1", paths: [] });
    expect(none).toContain("Sin medir");
    expect(none).toContain("No hay ficheros elegibles");
    expect(none).not.toContain("Limpio y al día");
  });

  it("proyecto, carpeta y fichero completos y limpios se dicen limpios", () => {
    const files = ["src/a.ts", "src/b.ts"];
    const lint = withCoverage(
      {
        eslint: enumerated(files, files),
        oxlint: enumerated(files, files)
      },
      {},
      {
        meta: {
          checksum: "abc",
          tools: ["eslint", "oxlint"],
          systems: [
            {
              name: "eslint",
              config: "eslint.config.js",
              rules: [{ id: "no-var", severity: "error" }]
            },
            {
              name: "oxlint",
              config: null,
              note: "sin archivo de configuración: corre sus reglas por defecto y no se enumeran"
            }
          ],
          tree: "tree-1"
        }
      }
    );
    const snap = { treeHash: "tree-1", paths: files };

    for (const scope of [
      { folder: "" },
      { folder: "src" },
      { folder: "src/a.ts", filePath: "src/a.ts" }
    ]) {
      const html = markup(lint, scope, snap);
      expect(html).toContain("Limpio y al día");
      expect(html).not.toContain("0 errores");
    }

    const project = markup(lint, { folder: "" }, snap);
    expect(project).toContain("Herramientas");
    expect(project).toContain("eslint");
    expect(project).toContain("ok");
    expect(project).toContain("1 regla");
    expect(project).toContain("oxlint");
    expect(project).toContain("sin archivo de configuración");

    const file = markup(lint, { folder: "src/a.ts", filePath: "src/a.ts" }, snap);
    expect(file).not.toContain("sin archivo de configuración");
  });

  it("con hallazgos, la herramienta dice medido y no ok", () => {
    const lint = withCoverage(
      {
        eslint: enumerated(["src/a.ts"], ["src/a.ts"]),
        oxlint: enumerated(["src/a.ts"], ["src/a.ts"])
      },
      { "src/a.ts": { errors: 1, warnings: 0, messages: [message()] } },
      {
        meta: {
          checksum: "abc",
          tools: ["eslint", "oxlint"],
          systems: [
            { name: "eslint", config: "eslint.config.js" },
            { name: "oxlint", config: ".oxlintrc.json" }
          ],
          tree: "tree-1"
        }
      }
    );
    const html = markup(lint, { folder: "" }, {
      treeHash: "tree-1",
      paths: ["src/a.ts"]
    });

    expect(html).toContain("Herramientas");
    expect(html).toContain("medido");
    expect(html).not.toContain("lint-tool-ok");
    expect(html).toContain("1 error");
  });

  it("sin artefacto traduce freshness-unverified y no enseña ceros como limpio", () => {
    const health = scopeHealth(null, { kind: "project", path: "" }, current);
    expect(health.coverage.state).toBe("unmeasured");
    expect(health.fresh).toBeNull();
    const html = markup(null);
    expect(html).toContain("Sin medir");
    expect(html).toContain("No se puede comprobar si el análisis es del árbol actual");
    expect(html).not.toContain("0 errores");
    expect(html).not.toContain("Limpio y al día");
  });

  it("tool-missing y tool-failed se leen en español", () => {
    const missing = withCoverage({
      eslint: {
        outcome: "missing",
        eligiblePaths: null,
        reasons: [{ code: "tool-missing", text: "eslint" }]
      }
    });
    const failed = withCoverage({
      eslint: {
        outcome: "failed",
        eligiblePaths: null,
        reasons: [{ code: "tool-failed", text: "stderr" }]
      }
    });
    expect(markup(missing)).toContain("Falta una herramienta declarada");
    expect(markup(missing)).toContain("eslint");
    expect(markup(failed)).toContain("Una herramienta falló");
    expect(markup(failed)).toContain("stderr");
    expect(markup(missing)).not.toContain("Limpio y al día");
  });
});
