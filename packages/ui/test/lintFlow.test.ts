/**
 * @vitest-environment jsdom
 *
 * Raíz → un documento, por el ancla del resto → otra vez la raíz.
 */
import { createElement, useState } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { FindingAnchor, LintArtifact } from "@codarch/lint/browser";
import type { RenderModel } from "@codarch/render/browser";
import { LintSection } from "../src/LintSection";
import { LintConfigSection } from "../src/panels/LintConfigSection";
import { ProjectPanel } from "../src/panels/ProjectPanel";

const ROADMAP = "apps/site/docs/en/desarrollo/roadmap.md";
const INDEX = "apps/site/docs/en/desarrollo/adr/index.md";
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
      [INDEX]: { errors: 238, warnings: 0, messages: messages(238) }
    },
    coverage: {
      tools: {
        codarch: {
          outcome: "enumerated",
          measuredPaths: [ROADMAP, INDEX],
          eligiblePaths: [ROADMAP, INDEX]
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
        eslint: { outcome: "enumerated", measuredPaths: [ANALYZE], eligiblePaths: null },
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

const model = {
  meta: {
    project: "codarch",
    title: "codarch",
    commit: "",
    checksum: "code-tree",
    historyChecksum: "",
    apiVersion: "cc.json 2.x",
    rootName: "codarch"
  },
  files: [{ path: ANALYZE }],
  sections: [],
  metrics: [],
  edges: [],
  cycles: [],
  roots: [],
  areaMetric: "rloc",
  areaTitle: "Líneas de código",
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

const restModel = {
  ...model,
  meta: { ...model.meta, checksum: "docs-tree" },
  files: [{ path: ROADMAP }, { path: INDEX }],
  fileCount: 733
} as unknown as RenderModel;

function Flow() {
  const [map, setMap] = useState<"code" | "rest">("code");
  const [path, setPath] = useState<string | null>(null);
  const codeLint = code();
  const docsLint = docs();
  const open = (anchor: FindingAnchor) => {
    setMap(anchor.map);
    setPath(anchor.path);
  };
  const snapshot =
    map === "code"
      ? { treeHash: "code-tree", paths: [ANALYZE] }
      : { treeHash: "docs-tree", paths: [ROADMAP, INDEX] };
  return createElement(
    "div",
    null,
    createElement(
      "div",
      { "data-testid": "catalog" },
      createElement(LintConfigSection, {
        id: "cat-code",
        domain: "code",
        artifact: codeLint
      }),
      createElement(LintConfigSection, {
        id: "cat-docs",
        domain: "docs",
        artifact: docsLint
      })
    ),
    createElement(
      "button",
      {
        type: "button",
        onClick: () => {
          setMap("code");
          setPath(null);
        }
      },
      "Volver al proyecto"
    ),
    createElement(
      "div",
      { "data-testid": "card" },
      path === null
        ? createElement(ProjectPanel, {
            model: map === "code" ? model : restModel,
            lint: codeLint,
            docsLint,
            metricTitle: (key: string) => key,
            colorMode: "",
            onColorMode: () => {},
            onSelectPath: () => {},
            onSelectFolder: () => {},
            onOpenFinding: open
          })
        : createElement(LintSection, {
            id: "file-lint",
            artifact: codeLint,
            artifacts: [codeLint, docsLint],
            folder: "",
            filePath: path,
            snapshot
          })
    )
  );
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("el flujo de la ficha", () => {
  it("la raíz enseña 307, el .md abre el resto con 69, y el catálogo no enseña 307", () => {
    render(createElement(Flow));
    const card = () => within(screen.getByTestId("card"));
    const catalog = within(screen.getByTestId("catalog"));

    expect(card().getByRole("button", { name: /Lint/ })).toBeTruthy();
    expect(card().queryByRole("button", { name: /Reglas/ })).toBeNull();
    expect(card().getAllByText("307 errores").length).toBeGreaterThan(0);
    expect(card().getByText(/Actualidad no verificada/)).toBeTruthy();
    expect(card().getByText(/Árbol al día/)).toBeTruthy();

    expect(catalog.getByText("eqeqeq")).toBeTruthy();
    expect(catalog.getByText("No se sabe cuántas reglas hay activas.")).toBeTruthy();
    expect(catalog.getByText("doc/broken-link")).toBeTruthy();
    expect(catalog.getByText("4 reglas activas")).toBeTruthy();
    expect(catalog.queryByText("307")).toBeNull();
    expect(catalog.queryByText(MESSAGE)).toBeNull();
    expect(catalog.queryByText("0 reglas")).toBeNull();

    fireEvent.click(card().getByRole("button", { name: new RegExp(ROADMAP.replaceAll(".", "\\.")) }));

    const open = card();
    expect(open.getAllByText("69 errores").length).toBeGreaterThan(0);
    expect(open.getAllByText("doc/broken-link").length).toBeGreaterThan(0);
    expect(open.getAllByText(MESSAGE).length).toBeGreaterThan(0);
    expect(open.queryByText("307 errores")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Volver al proyecto" }));
    expect(card().getAllByText("307 errores").length).toBeGreaterThan(0);
    expect(catalog.queryByText("307")).toBeNull();
  });
});
