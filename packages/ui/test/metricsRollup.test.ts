import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { LintArtifact } from "@codarch/lint/browser";
import type {
  RenderFile,
  RenderMetric,
  RenderModel,
  TreeNode
} from "@codarch/render/browser";
import { FolderPanel } from "../src/panels/FolderPanel";
import { ProjectPanel } from "../src/panels/ProjectPanel";

function zeroPart() {
  return { value: 0, p95: 0, norm: 0, weight: 0, share: 0 };
}

/** Un fichero con lo que estas fichas miran: ruta, complejidad y líneas. */
function file(path: string, complexity: number, loc: number): RenderFile {
  return {
    index: 0,
    nodeId: path,
    path,
    name: path.split("/").pop() ?? path,
    section: 0,
    area: loc,
    actualArea: loc,
    risk: 0,
    riskParts: {
      complexity: zeroPart(),
      churn: zeroPart(),
      size: zeroPart(),
      lint: zeroPart()
    },
    complexity,
    churn: 0,
    lint: 0,
    // Alineados con `metrics`: loc y rloc.
    values: [loc, loc],
    kind: null
  };
}

function metric(key: string): RenderMetric {
  return {
    key,
    title: key === "loc" ? "Líneas" : "Líneas de código",
    direction: 0,
    min: 0,
    max: 160,
    actualMax: 160,
    p95: 100,
    mode: "linear",
    coverage: 3
  };
}

function folder(path: string, files: number, children: TreeNode[] = []): TreeNode {
  return {
    kind: "folder",
    key: `d:${path}`,
    name: path.split("/").pop() ?? path,
    path,
    value: 1,
    fileCount: files,
    section: 0,
    children
  };
}

const ui = folder("packages/ui", 1);
const ui2 = folder("packages/ui2", 1);
const packages = folder("packages", 2, [ui, ui2]);
const apps = folder("apps", 1);

const model: RenderModel = {
  meta: {
    project: "demo",
    title: "demo",
    commit: "",
    checksum: "",
    apiVersion: "cc.json 2.x",
    rootName: ""
  },
  files: [
    file("apps/web/src/main.ts", 5, 100),
    file("packages/ui/src/panel.ts", 15, 50),
    file("packages/ui2/src/other.ts", 1, 10)
  ],
  sections: [],
  metrics: [metric("loc"), metric("rloc")],
  edges: [],
  cycles: [],
  roots: [apps, packages],
  areaMetric: "loc",
  areaTitle: "líneas",
  totalArea: 160,
  fileCount: 3,
  folderCount: 4,
  hotspotCount: 0,
  defaultSelection: null,
  initialLens: "risk",
  initialMetric: null,
  warnings: []
};

const lint: LintArtifact = {
  schemaVersion: "1.0",
  meta: { checksum: "abc", tools: ["eslint"] },
  files: {
    "apps/web/src/main.ts": { errors: 2, warnings: 1, messages: [] },
    "packages/ui/src/panel.ts": { errors: 0, warnings: 4, messages: [] },
    "packages/ui2/src/other.ts": { errors: 1, warnings: 0, messages: [] }
  },
  summary: { files: 3, errors: 3, warnings: 5, messages: 8 }
};

function projectMarkup(artifact: LintArtifact | null): string {
  return renderToStaticMarkup(
    createElement(ProjectPanel, {
      model,
      lint: artifact,
      onSelectFolder: () => {}
    })
  );
}

describe("la ficha del proyecto", () => {
  it("cuenta el mapa entero: ficheros, carpetas, líneas y complejidad", () => {
    const markup = projectMarkup(lint);

    expect(markup).toContain("Proyecto");
    expect(markup).toContain("3 ficheros");
    expect(markup).toContain("160");
    // El máximo dice en qué fichero está (ADR 0092).
    expect(markup).toContain("15");
    expect(markup).toContain("packages/ui/src/panel.ts");
  });

  it("lleva el lint dentro de Métricas y lo desglosa por carpeta", () => {
    const markup = projectMarkup(lint);

    expect(markup).toContain("Lint");
    expect(markup).toContain("3 errores · 5 avisos");
    expect(markup).toContain("score 4,3");
    expect(markup).toContain("Lint por carpeta");
    expect(markup).toContain("apps/");
    expect(markup).toContain("packages/");
  });

  it("sin artefacto dice «sin medir» y no inventa la tabla", () => {
    const markup = projectMarkup(null);

    expect(markup).toContain("sin medir");
    expect(markup).toContain("El lint no se midió");
    expect(markup).not.toContain("Lint por carpeta");
  });
});

describe("la ficha de carpeta", () => {
  it("suma su subárbol y deja bajar a sus carpetas", () => {
    const markup = renderToStaticMarkup(
      createElement(FolderPanel, {
        folder: packages,
        model,
        lint,
        onSelectPath: () => {},
        onSelectFolder: () => {}
      })
    );

    expect(markup).toContain("Métricas");
    expect(markup).toContain("1 error · 4 avisos");
    expect(markup).toContain("60");
    expect(markup).toContain("Lint por carpeta");
    expect(markup).toContain("ui/");
  });
});
