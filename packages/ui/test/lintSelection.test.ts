import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { scopeHealthMerged, type LintArtifact } from "@codarch/lint/browser";
import { LintSection } from "../src/LintSection";
import { freshStateCopy } from "../src/lintHealth";

const ROADMAP = "apps/site/docs/en/desarrollo/roadmap.md";
const ANALYZE = "apps/cli/src/args/analyze.ts";
const MESSAGE =
  "el enlace «adr/0001-0010/0003-typescript-first.md» no llega a ningún fichero del árbol";

function messages(count: number) {
  return Array.from({ length: count }, () => ({
    rule: "doc/broken-link",
    severity: "error" as const,
    message: MESSAGE
  }));
}

function docs(): LintArtifact {
  return {
    schemaVersion: "1.3",
    domain: "docs",
    meta: {
      checksum: "docs",
      tools: ["codarch"],
      systems: [{ name: "codarch", config: null }],
      tree: "docs-tree"
    },
    files: {
      [ROADMAP]: { errors: 69, warnings: 0, messages: messages(69) },
      "apps/site/docs/en/desarrollo/adr/index.md": {
        errors: 238,
        warnings: 0,
        messages: messages(238)
      }
    },
    coverage: {
      tools: {
        codarch: {
          outcome: "enumerated",
          measuredPaths: [ROADMAP, "apps/site/docs/en/desarrollo/adr/index.md"],
          eligiblePaths: [ROADMAP, "apps/site/docs/en/desarrollo/adr/index.md"]
        }
      }
    },
    summary: { files: 2, errors: 307, warnings: 0, messages: 307, measured: 2 }
  };
}

function code(): LintArtifact {
  return {
    schemaVersion: "1.3",
    domain: "code",
    meta: {
      checksum: "code",
      tools: ["eslint", "oxlint"],
      systems: [
        {
          name: "eslint",
          config: "eslint.config.js",
          rules: [{ id: "eqeqeq", severity: "error" }]
        },
        {
          name: "oxlint",
          config: null,
          note: "corre sus correcciones por defecto; no se enumeran"
        }
      ],
      tree: "code-tree"
    },
    files: {},
    coverage: {
      tools: {
        eslint: {
          outcome: "enumerated",
          measuredPaths: [ANALYZE],
          eligiblePaths: null
        },
        oxlint: {
          outcome: "unknown",
          eligiblePaths: null,
          reasons: [{ code: "unknown-eligibility" }]
        }
      }
    },
    summary: { files: 0, errors: 0, warnings: 0, messages: 0, measured: 1 }
  };
}

const codeSnap = { treeHash: "code-tree", paths: [ANALYZE] };
const docsSnap = {
  treeHash: "docs-tree",
  paths: [ROADMAP, "apps/site/docs/en/desarrollo/adr/index.md"]
};

describe("los dos árboles no se tapan", () => {
  it("la raíz conserva los 307 aunque el snapshot sea el del código", () => {
    const health = scopeHealthMerged([code(), docs()], { kind: "project", path: "" }, codeSnap);
    expect(health.counts.findings).toBe(307);
    expect(health.affectedFiles.some((file) => file.path === ROADMAP)).toBe(true);
    expect(health.affectedFiles.every((file) => file.anchor.map === "rest")).toBe(true);
    const codeDomain = health.domains.find((domain) => domain.domain === "code");
    const docsDomain = health.domains.find((domain) => domain.domain === "docs");
    expect(codeDomain?.fresh).toBe(true);
    expect(docsDomain?.fresh).toBeNull();
    expect(health.fresh).toBeNull();
    expect(health.clean).toBe(false);
  });

  it("analyze.ts puede ser 0 y roadmap.md conserva 69, con el ancla del resto", () => {
    const file = scopeHealthMerged(
      [code(), docs()],
      { kind: "file", path: ANALYZE },
      codeSnap
    );
    expect(file.counts.findings).toBe(0);

    const roadmap = scopeHealthMerged(
      [code(), docs()],
      { kind: "file", path: ROADMAP },
      codeSnap
    );
    expect(roadmap.counts.findings).toBe(69);
    expect(roadmap.findings[0]?.anchor).toEqual({ map: "rest", path: ROADMAP });
    expect(roadmap.findings[0]?.tool).toBe("codarch");
    expect(roadmap.findings[0]?.inferred).toBe(false);
  });

  it("la ficha distingue fresh null de false y de true, y no esconde el documento", () => {
    const onCode = renderToStaticMarkup(
      createElement(LintSection, {
        id: "lint",
        artifact: code(),
        artifacts: [code(), docs()],
        folder: "",
        snapshot: codeSnap
      })
    );
    expect(onCode).toContain('data-domain="code" data-fresh="true"');
    expect(onCode).toContain('data-domain="docs" data-fresh="null"');
    expect(onCode).toContain("Árbol al día.");
    expect(onCode).toContain("Actualidad no verificada.");
    expect(onCode).not.toContain("Árbol de otra pasada.");
    expect(onCode).toContain(ROADMAP);
    expect(onCode).toContain("307 errores");
    expect(onCode).toContain('data-lint-map="rest"');

    const stale = renderToStaticMarkup(
      createElement(LintSection, {
        id: "lint",
        artifact: code(),
        artifacts: [code(), docs()],
        folder: "",
        snapshot: { treeHash: "otro", paths: [ANALYZE] }
      })
    );
    expect(stale).toContain('data-fresh="false"');
    expect(stale).toContain("Árbol de otra pasada.");
    expect(stale).toContain(ROADMAP);

    const onDocs = renderToStaticMarkup(
      createElement(LintSection, {
        id: "lint",
        artifact: code(),
        artifacts: [code(), docs()],
        folder: "",
        snapshot: docsSnap
      })
    );
    expect(onDocs).toContain('data-domain="docs" data-fresh="true"');
    expect(onDocs).toContain('data-domain="code" data-fresh="null"');
    expect(onDocs).toContain("307 errores");
  });
});

describe("las tres frescuras no comparten frase", () => {
  it("true, false y null se leen distinto", () => {
    expect(freshStateCopy(true)).toBe("Árbol al día.");
    expect(freshStateCopy(false)).toBe("Árbol de otra pasada.");
    expect(freshStateCopy(null)).toBe("Actualidad no verificada.");
    expect(new Set([freshStateCopy(true), freshStateCopy(false), freshStateCopy(null)]).size).toBe(
      3
    );
  });
});
