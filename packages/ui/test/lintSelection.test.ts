import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { LintArtifact, LintCoverage, ToolCoverage } from "@codarch/lint/browser";
import { LintConfigSection } from "../src/panels/LintConfigSection";
import { LintSection } from "../src/LintSection";
import {
  catalogBadge,
  planFindingOpen,
  readActiveRules,
  readSelection
} from "../src/lintAdapter";

const ROADMAP = "apps/site/docs/en/desarrollo/roadmap.md";
const ANALYZE = "apps/cli/src/args/analyze.ts";
const MESSAGE =
  "el enlace «adr/0001-0010/0003-typescript-first.md» no llega a ningún fichero del árbol";

function enumerated(measured: string[], eligible: string[] | null): ToolCoverage {
  return { outcome: "enumerated", measuredPaths: measured, eligiblePaths: eligible };
}

function messages(count: number) {
  return Array.from({ length: count }, () => ({
    rule: "doc/broken-link",
    severity: "error" as const,
    message: MESSAGE
  }));
}

function docsArtifact(): LintArtifact {
  const paths = [ROADMAP, "apps/site/docs/en/desarrollo/adr/index.md"];
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
      [paths[1] as string]: { errors: 238, warnings: 0, messages: messages(238) }
    },
    coverage: {
      tools: { codarch: enumerated(paths, paths) }
    },
    summary: { files: 2, errors: 307, warnings: 0, messages: 307, measured: 2 }
  };
}

function codeArtifact(): LintArtifact {
  const coverage: LintCoverage = {
    tools: {
      eslint: enumerated([ANALYZE], null),
      oxlint: {
        outcome: "unknown",
        eligiblePaths: null,
        reasons: [{ code: "unknown-eligibility" }]
      }
    }
  };
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
    coverage,
    summary: { files: 0, errors: 0, warnings: 0, messages: 0, measured: 1 }
  };
}

const codeSnapshot = { treeHash: "code-tree", paths: [ANALYZE] };
const docsSnapshot = {
  treeHash: "docs-tree",
  paths: [ROADMAP, "apps/site/docs/en/desarrollo/adr/index.md"]
};

describe("la selección junta mensajes y no coberturas", () => {
  const code = codeArtifact();
  const docs = docsArtifact();

  it("la raíz incluye los 307 aunque el mapa de código no tenga esos .md", () => {
    const health = readSelection({
      code,
      docs,
      scope: { kind: "project", path: "" },
      codeSnapshot,
      docsSnapshot
    });

    expect(health.counts.findings).toBe(307);
    expect(health.counts.errors).toBe(307);
    expect(health.affectedFiles.map((file) => file.path)).toContain(ROADMAP);
    expect(health.affectedFiles.every((file) => file.domain === "docs")).toBe(true);
    expect(health.affectedFiles.every((file) => file.tool === "codarch")).toBe(true);
    expect(health.clean).toBe(false);
    expect(health.origins.map((origin) => origin.health?.coverage.measured)).toEqual([
      1,
      2
    ]);
  });

  it("analyze.ts puede quedar en 0 y roadmap.md conserva sus 69", () => {
    const file = readSelection({
      code,
      docs,
      scope: { kind: "file", path: ANALYZE },
      codeSnapshot,
      docsSnapshot
    });
    expect(file.counts.findings).toBe(0);
    expect(file.origins.find((origin) => origin.domain === "docs")?.applicable).toBe(
      false
    );
    expect(file.clean).toBe(false);

    const roadmap = readSelection({
      code,
      docs,
      scope: { kind: "file", path: ROADMAP },
      codeSnapshot,
      docsSnapshot
    });
    expect(roadmap.counts.findings).toBe(69);
    expect(roadmap.findings[0]?.rule).toBe("doc/broken-link");
    expect(roadmap.findings[0]?.tool).toBe("codarch");
    expect(roadmap.findings[0]?.domain).toBe("docs");
    expect(roadmap.findings[0]?.message).toBe(MESSAGE);
  });

  it("una carpeta filtra por ruta canónica", () => {
    const site = readSelection({
      code,
      docs,
      scope: { kind: "folder", path: "apps/site" },
      codeSnapshot,
      docsSnapshot
    });
    const cli = readSelection({
      code,
      docs,
      scope: { kind: "folder", path: "apps/cli" },
      codeSnapshot,
      docsSnapshot
    });
    expect(site.counts.findings).toBe(307);
    expect(cli.counts.findings).toBe(0);
  });

  it("un origen heredado impide decir limpio aunque el otro esté cerrado y a cero", () => {
    const legacy: LintArtifact = {
      schemaVersion: "1.2",
      meta: {
        checksum: "old",
        tools: ["eslint"],
        systems: [{ name: "eslint", config: null }]
      },
      files: {},
      summary: { files: 0, errors: 0, warnings: 0, messages: 0, measured: 677 }
    };
    const cleanDocs: LintArtifact = {
      schemaVersion: "1.3",
      domain: "docs",
      meta: {
        checksum: "docs",
        tools: ["codarch"],
        systems: [{ name: "codarch", config: null }],
        tree: "docs-tree"
      },
      files: {},
      coverage: { tools: { codarch: enumerated(["a.md"], ["a.md"]) } },
      summary: { files: 0, errors: 0, warnings: 0, messages: 0, measured: 1 }
    };
    const health = readSelection({
      code: legacy,
      docs: cleanDocs,
      scope: { kind: "project", path: "" },
      docsSnapshot: { treeHash: "docs-tree", paths: ["a.md"] }
    });
    expect(health.origins.find((origin) => origin.domain === "code")?.legacy).toBe(true);
    expect(health.clean).toBe(false);

    const markup = renderToStaticMarkup(
      createElement(LintSection, {
        id: "lint",
        code: legacy,
        docs: cleanDocs,
        folder: "",
        docsSnapshot: { treeHash: "docs-tree", paths: ["a.md"] }
      })
    );
    expect(markup).not.toContain("Limpio");
    expect(markup).toContain("anterior a la cobertura");
    expect(markup).toContain("docs · codarch");
  });
});

describe("el catálogo cuenta reglas activas, no hallazgos", () => {
  it("sin activeRules el recuento es desconocido y no es 0", () => {
    const system = readActiveRules({
      name: "eslint",
      config: "eslint.config.js",
      rules: [{ id: "eqeqeq", severity: "error" }]
    });
    expect(system.countState).toBe("unknown");
    expect(system.count).toBeNull();
    expect(system.rules.map((rule) => rule.id)).toEqual(["eqeqeq"]);
    expect(catalogBadge([{ activeRules: system }])).toEqual({
      count: undefined,
      state: "unknown"
    });

    const markup = renderToStaticMarkup(
      createElement(LintConfigSection, {
        id: "cat",
        domain: "code",
        artifact: codeArtifact()
      })
    );
    expect(markup).toContain("Recuento desconocido.");
    expect(markup).toContain("eqeqeq");
    expect(markup).not.toContain("collapsible-count");
    expect(markup).not.toContain("doc/broken-link");
    expect(markup).not.toContain(MESSAGE);
  });

  it("parcial y desconocido se dicen, y el cerrado enseña su número", () => {
    const partial = readActiveRules({
      name: "oxlint",
      config: null,
      activeRules: { countState: "partial", rules: [] }
    } as Parameters<typeof readActiveRules>[0]);
    const unknown = readActiveRules({
      name: "codarch",
      config: null,
      activeRules: { countState: "known-complete", rules: [] }
    } as Parameters<typeof readActiveRules>[0]);
    const known = readActiveRules({
      name: "codarch",
      config: null,
      activeRules: {
        countState: "known-complete",
        count: 1,
        rules: [{ id: "doc/broken-link", severity: "error" }]
      }
    } as Parameters<typeof readActiveRules>[0]);

    expect(partial.countState).toBe("partial");
    expect(partial.count).toBeNull();
    expect(unknown.countState).toBe("unknown");
    expect(known).toMatchObject({ countState: "known-complete", count: 1 });
    expect(catalogBadge([{ activeRules: partial }, { activeRules: known }])).toEqual({
      count: undefined,
      state: "partial"
    });
    expect(catalogBadge([{ activeRules: known }])).toEqual({
      count: 1,
      state: "known-complete"
    });

    const markup = renderToStaticMarkup(
      createElement(LintConfigSection, {
        id: "docs-cat",
        domain: "docs",
        artifact: {
          ...docsArtifact(),
          files: {
            [ROADMAP]: { errors: 307, warnings: 0, messages: messages(307) }
          },
          meta: {
            ...docsArtifact().meta,
            systems: [
              {
                name: "codarch",
                config: null,
                activeRules: {
                  countState: "known-complete",
                  count: 1,
                  rules: [{ id: "doc/broken-link", severity: "error" }]
                }
              }
            ]
          }
        } as unknown as LintArtifact
      })
    );
    expect(markup).toContain('collapsible-count">1');
    expect(markup).toContain("doc/broken-link");
    expect(markup).toContain("1 regla activa");
    expect(markup).not.toContain("307");
    expect(markup).not.toContain(MESSAGE);
    expect(markup).not.toContain(ROADMAP);
  });
});

describe("pulsar un .md abre el mapa que lo contiene", () => {
  it("desde el código cambia al resto, y analyze.ts se queda en el código", () => {
    expect(
      planFindingOpen({
        path: ROADMAP,
        map: "code",
        inCode: false,
        inRest: true
      })
    ).toEqual({ map: "rest" });
    expect(
      planFindingOpen({
        path: ANALYZE,
        map: "rest",
        inCode: true,
        inRest: false
      })
    ).toEqual({ map: "code" });
    expect(
      planFindingOpen({
        path: ANALYZE,
        map: "code",
        inCode: true,
        inRest: false
      })
    ).toEqual({ map: "code" });
    expect(
      planFindingOpen({
        path: "no/esta.ts",
        map: "code",
        inCode: false,
        inRest: false
      })
    ).toBeNull();
  });
});
