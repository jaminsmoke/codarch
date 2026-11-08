import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { LintArtifact } from "@codarch/lint/browser";
import { DocsToolSheet, LintConfigSection } from "../src/panels/LintConfigSection";
import { ProjectPanel } from "../src/panels/ProjectPanel";
import { ToolBar } from "../src/ToolBar";
import {
  docsConfigAccess,
  planDocsTool,
  readLintConfig
} from "../src/lintConfig";
import type { RenderModel } from "@codarch/render/browser";

const artifact: LintArtifact = {
  schemaVersion: "1.2",
  meta: {
    checksum: "abc",
    tools: ["eslint"],
    systems: [
      {
        name: "eslint",
        config: "eslint.config.js",
        rules: [
          { id: "eqeqeq", severity: "error" },
          { id: "no-var", severity: "warn" }
        ],
        note: "resuelto con --print-config"
      }
    ]
  },
  files: {
    "src/a.ts": {
      errors: 9,
      warnings: 9,
      messages: [
        { rule: "no-console", severity: "error", message: "Unexpected console", line: 1 }
      ]
    }
  },
  summary: { files: 1, errors: 9, warnings: 9, messages: 1, measured: 4 }
};

const model = {
  meta: {
    project: "demo",
    title: "demo",
    commit: "",
    checksum: "abc",
    historyChecksum: "",
    apiVersion: "cc.json 2.x",
    rootName: ""
  },
  files: [],
  sections: [],
  metrics: [],
  edges: [],
  cycles: [],
  roots: [],
  areaMetric: "loc",
  areaTitle: "líneas",
  totalArea: 0,
  fileCount: 0,
  folderCount: 0,
  hotspotCount: 0,
  defaultSelection: null,
  initialLens: "risk",
  initialMetric: null,
  duplication: {
    measured: true,
    nodes: {},
    pairsByNode: {},
    list: [],
    pairs: 0,
    duplicatedLines: 0,
    repeatedLines: 0
  },
  lintMax: 0,
  warnings: []
} as RenderModel;

describe("la configuración del lint", () => {
  it("sale de meta.systems y meta.tools, sin los hallazgos", () => {
    expect(readLintConfig(artifact)).toEqual({
      tools: ["eslint"],
      systems: [
        {
          name: "eslint",
          config: "eslint.config.js",
          rules: [
            { id: "eqeqeq", severity: "error" },
            { id: "no-var", severity: "warn" }
          ],
          activeRules: [
            { id: "eqeqeq", severity: "error" },
            { id: "no-var", severity: "warn" }
          ],
          countState: "known-complete",
          note: "resuelto con --print-config"
        }
      ]
    });
    expect(readLintConfig(null)).toBeNull();
  });

  it("una regla con plugin se parte en plugin y regla, con su severidad", () => {
    const scoped: LintArtifact = {
      ...artifact,
      meta: {
        ...artifact.meta,
        systems: [
          {
            name: "eslint",
            config: "eslint.config.js",
            rules: [
              {
                id: "@typescript-eslint/no-unsafe-declaration-merging",
                severity: "error"
              },
              { id: "no-console", severity: "warn" }
            ]
          }
        ]
      }
    };
    const markup = renderToStaticMarkup(
      createElement(LintConfigSection, {
        id: "config",
        domain: "code",
        artifact: scoped
      })
    );

    expect(markup).toContain('data-severity="error"');
    expect(markup).toContain('data-severity="warn"');
    expect(markup).toContain("lint-system-collapsible");
    expect(markup).toContain("lint-config-group");
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain(">no-unsafe-declaration-merging</span>");
    expect(markup).toContain(">@typescript-eslint</span>");
    expect(markup).toContain(">core</span>");
    expect(markup).toContain(">error</span>");
    expect(markup).toContain(">warn</span>");
  });

  it("se pinta aparte y no cuenta el catálogo como hallazgos", () => {
    const config = renderToStaticMarkup(
      createElement(LintConfigSection, {
        id: "rail-lint-config-code",
        domain: "code",
        artifact
      })
    );
    const findings = renderToStaticMarkup(
      createElement(ProjectPanel, {
        model,
        lint: artifact,
        metricTitle: (key: string) => key,
        colorMode: "",
        onColorMode: () => {},
        onSelectPath: () => {},
        onSelectFolder: () => {}
      })
    );

    expect(config).toContain("Lint del código");
    expect(config).toContain("No son hallazgos.");
    expect(config).toContain("eslint.config.js");
    expect(config).toContain("eqeqeq");
    expect(config).toContain("resuelto con --print-config");
    expect(config).toContain("Herramientas que midieron");
    expect(config).toContain("eslint");
    expect(config).not.toContain("lint-count-error");
    expect(config).not.toContain("lint-dot-error");
    expect(config).not.toContain("1 error");
    expect(config).not.toContain("src/a.ts");
    expect(config).not.toContain("Unexpected console");
    expect(config).toContain('collapsible-count">2');
    expect(config).toContain("2 reglas activas");

    expect(findings).toContain("src/a.ts");
    expect(findings).toContain("1 error");
    expect(findings).toContain("eslint.config.js");
    expect(findings).not.toContain("eqeqeq");
    expect(findings).not.toContain("Lint del código");
    expect(findings).not.toContain("eqeqeq");
  });
});

function catalog(name: string, rule: string): LintArtifact {
  return {
    schemaVersion: "1.2",
    meta: {
      checksum: "abc",
      tools: [name],
      systems: [{ name, config: `${name}.config`, rules: [{ id: rule, severity: "warn" }] }]
    },
    files: {},
    summary: { files: 0, errors: 0, warnings: 0, messages: 0, measured: 1 }
  };
}

function sheet(rest: boolean): string {
  return renderToStaticMarkup(
    createElement(DocsToolSheet, {
      hasRest: rest,
      restModel: null
    })
  );
}

function docsButton(input: {
  rest: boolean;
  codeLint: LintArtifact | null;
  docsLint: LintArtifact | null;
}): string {
  const access = docsConfigAccess(input);
  return renderToStaticMarkup(
    createElement(ToolBar, {
      open: true,
      settingsOpen: false,
      map: "code",
      docsAvailable: access.enabled,
      panelId: "tools",
      onSelectMap: () => {},
      onOpenSettings: () => {}
    })
  );
}

describe("la entrada Docs y config", () => {
  const code = catalog("eslint", "eqeqeq");
  const docs = catalog("rest-rules", "frontmatter");

  it("solo resto: el botón se enciende y la hoja no lleva catálogo de lint", () => {
    expect(docsConfigAccess({ rest: true, codeLint: null, docsLint: docs })).toEqual({
      enabled: true,
      code: false,
      docs: false
    });
    expect(planDocsTool({ rest: true, codeLint: null, docsLint: docs })).toBe("rest-map");
    const markup = sheet(true);
    expect(markup).not.toContain("Reglas del resto");
    expect(markup).not.toContain("frontmatter");
    expect(markup).not.toContain("Lint del código");
    expect(markup).not.toContain("eqeqeq");
    expect(docsButton({ rest: true, codeLint: null, docsLint: docs })).not.toContain(
      "disabled"
    );
  });

  it("solo código: sin mapa del resto el botón no abre un catálogo en la barra", () => {
    expect(docsConfigAccess({ rest: false, codeLint: code, docsLint: null })).toEqual({
      enabled: false,
      code: true,
      docs: false
    });
    expect(planDocsTool({ rest: false, codeLint: code, docsLint: null })).toBe("disabled");
    const markup = sheet(false);
    expect(markup).not.toContain("Lint del código");
    expect(markup).not.toContain("eqeqeq");
    expect(markup).not.toContain("Estratos");
    const button = docsButton({ rest: false, codeLint: code, docsLint: null });
    expect(button).toContain("Docs y config");
    expect(button).toContain("disabled");
  });

  it("la hoja del resto no mezcla catálogos", () => {
    expect(planDocsTool({ rest: true, codeLint: code, docsLint: docs })).toBe("rest-map");
    const markup = sheet(true);
    expect(markup).not.toContain("Lint del código");
    expect(markup).not.toContain("Reglas del resto");
    expect(markup).not.toContain("eqeqeq");
    expect(markup).not.toContain("frontmatter");
  });

  it("sin artefactos ni mapa del resto, la entrada está apagada", () => {
    expect(docsConfigAccess({ rest: false, codeLint: null, docsLint: null })).toEqual({
      enabled: false,
      code: false,
      docs: false
    });
    expect(planDocsTool({ rest: false, codeLint: null, docsLint: null })).toBe("disabled");
    const button = docsButton({ rest: false, codeLint: null, docsLint: null });
    expect(button).toContain("disabled");
    expect(button).toContain("sin mapa del resto ni catálogo de lint");
  });

  it("un árbol viejo o measured 0 no apaga el catálogo ni lo vuelve un hallazgo", () => {
    const stale: LintArtifact = {
      ...code,
      meta: { ...code.meta, tree: "viejo" },
      summary: { files: 0, errors: 0, warnings: 0, messages: 0, measured: 0 }
    };
    expect(docsConfigAccess({ rest: false, codeLint: stale, docsLint: null }).enabled).toBe(
      false
    );
    expect(planDocsTool({ rest: false, codeLint: stale, docsLint: null })).toBe("disabled");
    const markup = renderToStaticMarkup(
      createElement(LintConfigSection, {
        id: "code-cat",
        domain: "code",
        artifact: stale,
        title: "Lint"
      })
    );
    expect(markup).toContain("eqeqeq");
    expect(markup).toContain(">Lint<");
    expect(markup).not.toContain("lint-count-error");
    expect(markup).not.toContain("1 error");
    expect(markup).not.toContain("Medido y limpio");
  });

  it("oxlint sin enumerar no se pinta como cero reglas, y los hallazgos no entran", () => {
    const oxlint: LintArtifact = {
      schemaVersion: "1.3",
      domain: "code",
      meta: {
        checksum: "abc",
        tools: ["oxlint"],
        systems: [
          {
            name: "oxlint",
            config: null,
            note: "corre sus correcciones por defecto; no se enumeran"
          }
        ]
      },
      files: {
        "src/a.ts": {
          errors: 1,
          warnings: 0,
          messages: [
            { rule: "no-var", severity: "error", message: "Unexpected var", line: 4 }
          ]
        }
      },
      summary: { files: 1, errors: 1, warnings: 0, messages: 1 }
    };
    const sidebar = sheet(true);
    expect(sidebar).not.toContain("doc/broken-link");
    expect(sidebar).not.toContain("el enlace no llega");
    expect(sidebar).not.toContain("Unexpected var");
    expect(sidebar).not.toContain("Lint del código");

    const markup = renderToStaticMarkup(
      createElement(LintConfigSection, {
        id: "code-cat",
        domain: "code",
        artifact: oxlint,
        title: "Lint"
      })
    );
    expect(markup).toContain("No se sabe cuántas reglas hay activas.");
    expect(markup).toContain("no se enumeran");
    expect(markup).not.toContain("0 reglas");
    expect(markup).not.toContain("doc/broken-link");
    expect(markup).not.toContain("el enlace no llega");
    expect(markup).not.toContain("Unexpected var");
    expect(markup).not.toContain("src/a.ts");
    expect(markup).toContain('data-count-state="unknown"');
    expect(markup).not.toContain("collapsible-count");
  });
});
