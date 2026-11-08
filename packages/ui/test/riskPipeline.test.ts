import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createLintArtifact } from "@codarch/lint/browser";
import { buildRenderModel } from "@codarch/render/browser";
import { parseCcJson } from "@codarch/schema/browser";
import { Inspector } from "../src/panels/Inspector";

const TREE = "tree-ui";

function snapshot() {
  return parseCcJson({
    meta: { projectName: "ficha", apiVersion: "2.1", checksum: TREE },
    files: [
      {
        id: "root",
        name: "root",
        type: "Folder",
        children: [
          { id: "a", name: "a.ts", type: "File" },
          { id: "b", name: "b.ts", type: "File" }
        ]
      }
    ],
    lenses: {
      metrics: {
        attributes: {
          a: { rloc: 80, complexity: 12, number_of_commits: 4 },
          b: { rloc: 20, complexity: 3, number_of_commits: 1 }
        }
      }
    }
  });
}

function card(lint?: ReturnType<typeof createLintArtifact>) {
  const model = buildRenderModel(snapshot(), lint ? { lint } : {});
  const file = model.files.find((entry) => entry.name === "b.ts");
  if (!file?.riskBreakdown) throw new Error("el modelo no trajo desglose");
  const html = renderToStaticMarkup(
    createElement(Inspector, {
      model,
      file,
      migrationNode: null,
      areaMetric: model.areaMetric,
      colorMode: "risk",
      metricTitle: (key: string) => key,
      symbols: [],
      structure: null,
      chain: null,
      lint: lint ?? null,
      migration: null,
      onSelectSymbol: () => undefined,
      onLoadCode: async () => null,
      onOpenEditor: async () => false,
      onSelectPath: () => undefined,
      onColorMode: () => undefined
    })
  );
  return { file, html };
}

describe("la ficha pinta el desglose que trae el modelo", () => {
  it("sin artefacto no recibe null y no recalcula", () => {
    const { file, html } = card();
    expect(html).not.toContain("no trae el desglose");
    expect(html).toContain("puntos del índice");
    expect(html).toContain("Frescura: no verificada");
    expect(file.riskBreakdown?.lint.normalized).toBeNull();
    expect(file.risk).toBe(file.riskBreakdown?.risk);
  });

  it("fresh true, false y null llegan tal cual", () => {
    const messages = [{ rule: "no-any", severity: "error" as const, message: "any" }];
    const fresh = card(
      createLintArtifact({
        tools: ["eslint"],
        tree: TREE,
        files: [{ path: "b.ts", messages }]
      })
    );
    const stale = card(
      createLintArtifact({
        tools: ["eslint"],
        tree: "otro",
        files: [{ path: "b.ts", messages }]
      })
    );
    const unverified = card(
      createLintArtifact({ tools: ["eslint"], files: [{ path: "b.ts", messages }] })
    );

    expect(fresh.file.riskBreakdown?.lint.fresh).toBe(true);
    expect(fresh.html).toContain("Frescura: al día");
    expect(fresh.html).not.toContain("no trae el desglose");
    expect(stale.file.riskBreakdown?.lint.fresh).toBe(false);
    expect(stale.html).toContain("de otro árbol");
    expect(unverified.file.riskBreakdown?.lint.fresh).toBeNull();
    expect(unverified.html).toContain("Frescura: no verificada");
  });
});
