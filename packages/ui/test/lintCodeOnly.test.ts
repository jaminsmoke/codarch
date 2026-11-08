/**
 * @vitest-environment jsdom
 *
 * El lint de la ficha es solo de código. El artefacto de documentos no se cuenta.
 */
import { readFileSync, existsSync } from "node:fs";
import { createElement } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readLintArtifact, scopeHealth, type LintArtifact } from "@codarch/lint/browser";
import type { RenderModel } from "@codarch/render/browser";
import type { CodarchApp } from "../src/app/types";
import { DocsToolSheet } from "../src/panels/LintConfigSection";
import { ProjectPanel } from "../src/panels/ProjectPanel";
import { InspectorDock } from "../src/shell/InspectorDock";

const CODE_FILE = "packages/ui/src/a.ts";
const DOC_FILE = "apps/site/docs/en/desarrollo/roadmap.md";

function messages(rule: string, text: string, count: number) {
  return Array.from({ length: count }, () => ({
    rule,
    severity: "error" as const,
    message: text
  }));
}

function codeArtifact(withFinding: boolean): LintArtifact {
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
          rules: [{ id: "no-console", severity: "error" }]
        },
        {
          name: "oxlint",
          config: null,
          note: "corre sus correcciones por defecto; no se enumeran"
        }
      ],
      tree: "code-tree"
    },
    files: withFinding
      ? {
          [CODE_FILE]: {
            errors: 1,
            warnings: 0,
            messages: messages("no-console", "Unexpected console", 1)
          }
        }
      : {},
    coverage: {
      tools: {
        eslint: {
          outcome: "enumerated",
          measuredPaths: [CODE_FILE],
          eligiblePaths: null
        },
        oxlint: {
          outcome: "unknown",
          eligiblePaths: null,
          reasons: [{ code: "unknown-eligibility" }]
        }
      }
    },
    summary: {
      files: withFinding ? 1 : 0,
      errors: withFinding ? 1 : 0,
      warnings: 0,
      messages: withFinding ? 1 : 0,
      measured: 1
    }
  };
}

function docsArtifact(count: number): LintArtifact {
  return {
    schemaVersion: "1.3",
    domain: "docs",
    meta: {
      checksum: "docs",
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
      [DOC_FILE]: {
        errors: count,
        warnings: 0,
        messages: messages("doc/broken-link", "el enlace no llega", count)
      }
    },
    summary: { files: 1, errors: count, warnings: 0, messages: count, measured: count }
  };
}

const model = {
  meta: {
    project: "codarch",
    title: "codarch",
    commit: "",
    checksum: "code-tree",
    historyChecksum: "",
    apiVersion: "2.0",
    rootName: "codarch"
  },
  files: [],
  sections: [],
  metrics: [],
  edges: [],
  cycles: [],
  roots: [],
  areaMetric: "rloc",
  areaTitle: "Líneas",
  totalArea: 0,
  fileCount: 686,
  folderCount: 73,
  hotspotCount: 0,
  defaultSelection: null,
  initialLens: "risk",
  initialMetric: null,
  duplication: {
    measured: false,
    nodes: {},
    pairsByNode: {},
    list: [],
    pairs: 0,
    duplicatedLines: 0,
    repeatedLines: 0
  },
  lintMax: 0,
  warnings: []
} as unknown as RenderModel;

function panel(view: "findings" | "catalog", lint: LintArtifact | null) {
  return createElement(ProjectPanel, {
    model,
    lint,
    lintView: view,
    metricTitle: (key: string) => key,
    colorMode: "",
    onColorMode: () => {},
    onSelectPath: () => {},
    onSelectFolder: () => {}
  });
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("los dos mapas comparten el hueco y la barra no lleva catálogo", () => {
  it("el mapa de código lista el hallazgo y el de documentos el catálogo", () => {
    const lint = codeArtifact(true);
    const { unmount } = render(panel("findings", lint));
    const codeCard = screen.getByRole("button", { name: /Lint/ });
    expect(codeCard).toBeTruthy();
    expect(screen.getByText(CODE_FILE)).toBeTruthy();
    expect(screen.getByText("no-console")).toBeTruthy();
    expect(screen.getByText("Unexpected console")).toBeTruthy();
    expect(screen.queryByText("doc/broken-link")).toBeNull();
    expect(screen.queryByText("reglas activas")).toBeNull();
    unmount();

    render(panel("catalog", lint));
    expect(screen.getByRole("button", { name: /Lint/ })).toBeTruthy();
    expect(screen.getByText("eslint.config.js")).toBeTruthy();
    expect(screen.getByText("1 regla activa")).toBeTruthy();
    expect(screen.getByText("No se sabe cuántas reglas hay activas.")).toBeTruthy();
    expect(screen.queryByText("Unexpected console")).toBeNull();
    expect(screen.queryByText(CODE_FILE)).toBeNull();
    expect(screen.queryByText("doc/broken-link")).toBeNull();
  });

  it("la barra de Docs y config no lista reglas ni hallazgos", () => {
    render(createElement(DocsToolSheet, { hasRest: true, restModel: model }));
    expect(screen.queryByText("Lint del código")).toBeNull();
    expect(screen.queryByText("doc/broken-link")).toBeNull();
    expect(screen.queryByText("eslint.config.js")).toBeNull();
    expect(screen.queryByText("No se sabe cuántas reglas hay activas.")).toBeNull();
  });

  it("un cero de código no absorbe los mensajes de documentos", () => {
    const code = codeArtifact(false);
    const docs = docsArtifact(309);
    const health = scopeHealth(code, { kind: "project", path: "" });
    expect(health.counts.findings).toBe(0);
    expect(scopeHealth(docs, { kind: "project", path: "" }).counts.findings).toBe(309);

    render(panel("findings", code));
    expect(screen.getAllByText(/0 errores/).length).toBeGreaterThan(0);
    expect(screen.queryByText("309")).toBeNull();
    expect(screen.queryByText("doc/broken-link")).toBeNull();
    expect(screen.queryByText("el enlace no llega")).toBeNull();
  });
});

function dock(map: "code" | "rest"): CodarchApp {
  return {
    state: {
      map,
      tab: "project",
      lint: codeArtifact(true),
      restLint: docsArtifact(309),
      rest: { meta: { checksum: "docs-tree" } },
      report: null,
      areaMetric: "rloc",
      colorMode: "risk",
      source: "test",
      settingsOpen: false,
      query: ""
    },
    actions: {
      setTab: vi.fn(),
      setColorMode: vi.fn(),
      selectIndex: vi.fn(),
      selectFolder: vi.fn(),
      scopeChanges: vi.fn(),
      selectPath: vi.fn(),
      readCode: async () => null,
      openInEditor: async () => false,
      openSymbolChain: vi.fn(),
      clearChangesScope: vi.fn()
    },
    view: { model, error: null },
    selectedFile: null,
    selectedFolderNode: null,
    selectedMigration: null,
    selectedSymbols: [],
    selectedStructure: null,
    metricTitle: (key: string) => key,
    closeFile: vi.fn(),
    migration: null
  } as unknown as CodarchApp;
}

function lintSection() {
  const section = screen.getByRole("button", { name: /^Lint/ }).closest("section");
  if (!section) throw new Error("falta la sección Lint");
  return within(section);
}

describe("hallazgo de código, catálogo y artefacto de documentos cargado", () => {
  it("en el mapa de código el hallazgo muestra severidad, mensaje, fichero y regla", () => {
    render(
      createElement(InspectorDock, {
        app: dock("code"),
        onOpenHistory: () => {},
        onLoadReport: () => {}
      })
    );
    const lint = lintSection();
    expect(lint.getByText(CODE_FILE)).toBeTruthy();
    expect(lint.getByText("no-console")).toBeTruthy();
    expect(lint.getByText("Unexpected console")).toBeTruthy();
    expect(lint.getAllByText("1 error").length).toBeGreaterThan(0);
    expect(lint.queryByText("doc/broken-link")).toBeNull();
    expect(lint.queryByText("309 errores")).toBeNull();
    expect(screen.getByRole("button", { name: /1 error de lint/ })).toBeTruthy();
  });

  it("en Docs y config la misma sección es solo el catálogo y no está el hallazgo", () => {
    render(
      createElement(InspectorDock, {
        app: dock("rest"),
        onOpenHistory: () => {},
        onLoadReport: () => {}
      })
    );
    const lint = lintSection();
    expect(lint.getByText("eslint.config.js")).toBeTruthy();
    expect(lint.getByText("1 regla activa")).toBeTruthy();
    expect(lint.getByText("no-console")).toBeTruthy();
    expect(lint.getByText("No se sabe cuántas reglas hay activas.")).toBeTruthy();
    expect(lint.queryByText(CODE_FILE)).toBeNull();
    expect(lint.queryByText("Unexpected console")).toBeNull();
    expect(lint.queryByText("1 error")).toBeNull();
    expect(lint.queryByText("doc/broken-link")).toBeNull();
    expect(screen.queryByRole("button", { name: /de lint/ })).toBeNull();
  });

  it("doc/broken-link cargado en el estado no entra en la salud, la cuenta ni el catálogo", () => {
    const loaded = dock("code");
    expect(loaded.state.restLint).not.toBeNull();
    expect(
      scopeHealth(loaded.state.restLint, { kind: "project", path: "" }).counts.findings
    ).toBe(309);
    expect(scopeHealth(loaded.state.lint, { kind: "project", path: "" }).counts.findings).toBe(
      1
    );

    const { unmount } = render(
      createElement(InspectorDock, {
        app: loaded,
        onOpenHistory: () => {},
        onLoadReport: () => {}
      })
    );
    const findings = lintSection();
    expect(findings.getAllByText("1 error").length).toBeGreaterThan(0);
    expect(findings.queryByText("doc/broken-link")).toBeNull();
    expect(findings.queryByText("el enlace no llega")).toBeNull();
    expect(findings.queryByText("309 errores")).toBeNull();
    expect(document.body.textContent).not.toContain("309");
    unmount();

    render(
      createElement(InspectorDock, {
        app: dock("rest"),
        onOpenHistory: () => {},
        onLoadReport: () => {}
      })
    );
    const catalog = lintSection();
    expect(catalog.queryByText("doc/broken-link")).toBeNull();
    expect(catalog.queryByText("el enlace no llega")).toBeNull();
    expect(catalog.queryByText("309")).toBeNull();
    expect(catalog.getByText("No se sabe cuántas reglas hay activas.")).toBeTruthy();
  });
});

describe("el dataset medido de este repo", () => {
  const codePath = ".codarch/lint.repmod.json";
  const docsPath = ".codarch/lint-rest.repmod.json";

  it("el código en cero no enseña los mensajes del otro artefacto", () => {
    if (!existsSync(codePath) || !existsSync(docsPath)) return;
    const code = readLintArtifact(JSON.parse(readFileSync(codePath, "utf8")));
    const docs = readLintArtifact(JSON.parse(readFileSync(docsPath, "utf8")));
    expect(code).not.toBeNull();
    expect(docs).not.toBeNull();
    if (!code || !docs) return;
    const codeFindings = scopeHealth(code, { kind: "project", path: "" }).counts.findings;
    const docsFindings = scopeHealth(docs, { kind: "project", path: "" }).counts.findings;
    expect(docsFindings).toBeGreaterThan(0);
    expect(docsFindings).not.toBe(codeFindings);

    const { unmount } = render(panel("findings", code));
    expect(screen.queryByText("doc/broken-link")).toBeNull();
    expect(screen.queryByText(String(docsFindings))).toBeNull();
    if (codeFindings === 0) {
      expect(screen.getAllByText(/0 errores/).length).toBeGreaterThan(0);
    }
    unmount();

    render(panel("catalog", code));
    expect(screen.getByText("24 reglas activas")).toBeTruthy();
    const oxlintRules =
      code.meta.systems.find((system) => system.name === "oxlint")?.rules?.length ?? 0;
    if (oxlintRules > 0) {
      expect(
        screen.getAllByText(`${oxlintRules} reglas activas`).length
      ).toBeGreaterThan(0);
    } else {
      expect(screen.getByText("No se sabe cuántas reglas hay activas.")).toBeTruthy();
    }
    expect(screen.queryByText("doc/broken-link")).toBeNull();
  });
});
