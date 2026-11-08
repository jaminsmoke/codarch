import fs from "node:fs";
import { describe, expect, it } from "vitest";
import type { TreeNode } from "@codarch/render/browser";
import {
  boundsOf,
  buildVolumes,
  findVolume,
  lodBoxes,
  SLAB_HEIGHT
} from "../volumes";
import {
  canvasPixelScale,
  colorOf,
  instanceLayout,
  parseColor
} from "../scene";

const colors = ["#111111", "#222222", "#333333", "#444444"];
const colorFor = (index: number): string =>
  colors[index % colors.length] ?? "#000000";

function file(nodePath: string, index: number, value = 10): TreeNode {
  return {
    kind: "file",
    key: nodePath,
    name: nodePath.slice(nodePath.lastIndexOf("/") + 1),
    path: nodePath,
    value,
    fileCount: 1,
    section: 0,
    fileIndex: index
  };
}

function folder(
  nodePath: string,
  children: TreeNode[],
  value = 10
): TreeNode {
  return {
    kind: "folder",
    key: nodePath,
    name: nodePath,
    path: nodePath,
    value,
    fileCount: children.reduce((total, child) => total + child.fileCount, 0),
    section: 0,
    children
  };
}

const tree = [
  folder("src", [
    folder("src/a", [file("src/a/uno.ts", 0), file("src/a/dos.ts", 1)]),
    file("src/index.ts", 2),
    folder("src/b", [file("src/b/tres.ts", 3)])
  ])
];

const input = {
  roots: tree,
  files: [{ risk: 0.1 }, { risk: 0.5 }, { risk: 0 }, { risk: 1 }],
  colorFor,
  fallbackColor: "#cccccc",
  width: 1000,
  height: 700
};

const far = {
  camera: { x: 0, y: 20_000, z: 20_000 },
  viewportHeight: 600,
  fov: 0.9
};
const near = {
  camera: { x: 500, y: 120, z: 640 },
  viewportHeight: 600,
  fov: 0.9
};

describe("la geometría del Atlas", () => {
  it("usa la misma jerarquía para cualquier mapa", () => {
    const docs = buildVolumes({
      ...input,
      roots: [
        folder("docs", [
          file("docs/guia.md", 0),
          folder("docs/en", [file("docs/en/guide.md", 1)])
        ])
      ]
    });

    expect(docs[0]?.kind).toBe("folder");
    expect(
      docs[0]?.children.find((child) => child.path === "docs/guia.md")?.kind
    ).toBe("file");
    expect(
      docs[0]?.children.find((child) => child.path === "docs/en")?.kind
    ).toBe("folder");
  });

  it("de lejos, una carpeta es un contenedor", () => {
    const boxes = lodBoxes(buildVolumes(input), far);
    expect(boxes).toHaveLength(1);
    expect(boxes[0]?.kind).toBe("folder");
    expect(boxes[0]?.collapsed).toBe(true);
  });

  it("de cerca, la carpeta se abre y enseña sus ficheros", () => {
    const boxes = lodBoxes(buildVolumes(input), near);
    const floor = boxes.find((box) => box.path === "src");
    expect(floor?.kind).toBe("folder");
    expect(floor?.collapsed).toBe(false);
    expect(floor?.height).toBe(SLAB_HEIGHT);
    expect(boxes.some((box) => box.path === "src/index.ts")).toBe(true);
  });

  it("mide el mapa para encuadrarlo", () => {
    const bounds = boundsOf(buildVolumes(input));
    expect(bounds.radius).toBeGreaterThan(0);
    expect(bounds.cx).toBeGreaterThan(0);
  });

  it("encuentra una carpeta para entrar en ella", () => {
    const roots = buildVolumes(input);
    expect(findVolume(roots, "src/a")?.kind).toBe("folder");
    expect(findVolume(roots, "src/index.ts")?.kind).toBe("file");
    expect(findVolume(roots, "no/existe")).toBeNull();
  });
});

describe("la escena del Atlas", () => {
  it("parsea colores hex y rgb", () => {
    expect(parseColor("#abc")).toEqual([0xaa / 255, 0xbb / 255, 0xcc / 255]);
    expect(parseColor("rgb(0, 255, 0)")).toEqual([0, 1, 0]);
    expect(parseColor("no-color", [0.2, 0.3, 0.4])).toEqual([
      0.2, 0.3, 0.4
    ]);
  });

  it("marca las carpetas para dibujar sus aristas", () => {
    const folderBox = instanceLayout(
      {
        path: "src",
        kind: "folder",
        x: 0,
        y: 0,
        z: 0,
        width: 10,
        height: 5,
        depth: 10,
        color: "#ffffff",
        collapsed: true
      },
      null
    );
    const fileBox = instanceLayout(
      {
        path: "src/a.ts",
        kind: "file",
        x: 0,
        y: 0,
        z: 0,
        width: 10,
        height: 5,
        depth: 10,
        color: "#ffffff",
        collapsed: false
      },
      null
    );

    expect(folderBox.kind).toBe(1);
    expect(fileBox.kind).toBe(0);
  });

  it("mezcla el color de selección", () => {
    const color = colorOf(
      {
        path: "src/a.ts",
        kind: "file",
        x: 0,
        y: 0,
        z: 0,
        width: 10,
        height: 5,
        depth: 10,
        color: "#000000",
        collapsed: false
      },
      "src/a.ts"
    );
    expect(color[2]).toBeGreaterThan(color[0] ?? 0);
  });

  it("limita la resolución del lienzo", () => {
    expect(canvasPixelScale(100, 100, 3)).toBe(2);
    expect(canvasPixelScale(4000, 2000, 2, 8_000_000)).toBeCloseTo(
      2 * Math.sqrt(8_000_000 / (4000 * 2000 * 4)),
      6
    );
  });
});

describe("el manifiesto del Atlas", () => {
  const manifest = JSON.parse(
    fs.readFileSync(new URL("../plugin.json", import.meta.url), "utf8")
  ) as {
    name: string;
    contributes?: { views?: string[] };
    requires?: { webgl2?: boolean };
  };

  it("aporta una vista y pide WebGL2", () => {
    expect(manifest.name).toBe("atlas");
    expect(manifest.contributes?.views).toEqual(["atlas"]);
    expect(manifest.requires?.webgl2).toBe(true);
  });
});
