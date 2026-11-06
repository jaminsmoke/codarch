import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { LintArtifact } from "@codarch/lint/browser";
import { LintConfigSection } from "../src/panels/LintConfigSection";
import { ProjectPanel } from "../src/panels/ProjectPanel";
import { readLintConfig } from "../src/lintConfig";
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
          note: "resuelto con --print-config"
        }
      ]
    });
    expect(readLintConfig(null)).toBeNull();
  });

  it("se pinta aparte y no cuenta el catálogo como hallazgos", () => {
    const config = renderToStaticMarkup(
      createElement(LintConfigSection, { artifact })
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

    expect(config).toContain("Configuración del lint");
    expect(config).toContain("No son hallazgos.");
    expect(config).toContain("eslint.config.js");
    expect(config).toContain("eqeqeq");
    expect(config).toContain("resuelto con --print-config");
    expect(config).toContain("Herramientas que midieron: eslint");
    expect(config).not.toContain("lint-count-error");
    expect(config).not.toContain("lint-dot-error");
    expect(config).not.toContain("1 error");
    expect(config).not.toContain("src/a.ts");
    expect(config).not.toContain("Unexpected console");

    expect(findings).toContain("src/a.ts");
    expect(findings).toContain("1 error");
    expect(findings).not.toContain("eslint.config.js");
    expect(findings).not.toContain("eqeqeq");
    expect(findings).not.toContain("Configuración del lint");
  });
});
