import fs from "node:fs";
import { describe, expect, it } from "vitest";
import type { TreeNode } from "@codarch/render/browser";
import { buildRoom, findFolder, type RoomInput } from "../room";
import { projectPoint } from "../camera";
import {
  canvasPixelScale,
  colorOf,
  instanceLayout,
  kindOf,
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
    folder("src/a", [
      file("src/a/uno.ts", 0),
      file("src/a/dos.ts", 1),
      folder("src/a/sub", [file("src/a/sub/tres.ts", 2)])
    ]),
    file("src/index.ts", 3),
    folder("src/b", [file("src/b/cuatro.ts", 4)])
  ])
];

const input: RoomInput = {
  roots: tree,
  files: [
    { risk: 0.1 },
    { risk: 0.5 },
    { risk: 0.3 },
    { risk: 0 },
    { risk: 1 }
  ],
  focusPath: null,
  colorFor,
  fallbackColor: "#cccccc",
  furnitureColor: "#333333",
  floorColor: "#eeeeee"
};

describe("la geometría frontal del Atlas", () => {
  it("en la vista general las carpetas son contenedores y los ficheros hojas", () => {
    const room = buildRoom(input);
    const src = room.boxes.find((box) => box.path === "src");

    expect(src?.role).toBe("folder");
    expect(src?.selectable).toBe(true);
    expect(room.containers).toBe(1);
    expect(room.sheets).toBe(0);
  });

  it("los ficheros de la raíz también van a la estantería", () => {
    const room = buildRoom({
      ...input,
      roots: [...tree, file("README.md", 5)],
      files: [...input.files, { risk: 0.2 }]
    });
    const readme = room.boxes.find((box) => box.path === "README.md");
    expect(readme?.role).toBe("file");
    expect(readme?.y).toBeGreaterThan(1);
    expect(room.sheets).toBe(1);
  });

  it("dentro de una carpeta las subcarpetas siguen siendo contenedores", () => {
    const room = buildRoom({ ...input, focusPath: "src/a" });
    const sub = room.boxes.find((box) => box.path === "src/a/sub");
    const sheet = room.boxes.find((box) => box.path === "src/a/uno.ts");

    expect(sub?.role).toBe("folder");
    expect(sheet?.role).toBe("file");
    expect(room.containers).toBe(1);
    expect(room.sheets).toBe(2);
  });

  it("una subcarpeta abre su propia sala recursiva", () => {
    const room = buildRoom({ ...input, focusPath: "src/a/sub" });
    const sheet = room.boxes.find((box) => box.path === "src/a/sub/tres.ts");

    expect(sheet?.role).toBe("file");
    expect(room.containers).toBe(0);
    expect(room.sheets).toBe(1);
  });

  it("las hojas miran a la cámara, no se ven de canto", () => {
    const room = buildRoom({ ...input, focusPath: "src/a" });
    const sheet = room.boxes.find((box) => box.path === "src/a/uno.ts");
    expect(sheet?.width).toBeGreaterThan(sheet?.depth ?? 0);
    expect(sheet?.height).toBeGreaterThan(sheet?.depth ?? 0);
  });

  it("las hojas van a las estanterías y no al suelo", () => {
    const room = buildRoom({ ...input, focusPath: "src/a" });
    const sheet = room.boxes.find((box) => box.path === "src/a/uno.ts");
    expect(sheet?.y).toBeGreaterThan(1);
    expect(sheet?.height).toBeLessThan(2);
  });

  it("el mobiliario no se puede seleccionar", () => {
    const room = buildRoom(input);
    const furniture = room.boxes.filter((box) => !box.selectable);
    expect(furniture.length).toBeGreaterThan(0);
    expect(
      furniture.every((box) => box.role === "floor" || box.role === "furniture")
    ).toBe(true);
  });

  it("encuentra una carpeta para entrar", () => {
    expect(findFolder(tree, "src/a")?.kind).toBe("folder");
    expect(findFolder(tree, "no/existe")).toBeNull();
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

  it("distingue contenedores, hojas, suelo y mobiliario", () => {
    expect(kindOf("folder")).toBe(1);
    expect(kindOf("file")).toBe(0);
    expect(kindOf("floor")).toBe(2);
    expect(kindOf("furniture")).toBe(3);
  });

  it("marca las carpetas para dibujar sus aristas", () => {
    const layout = instanceLayout(
      {
        path: "src",
        role: "folder",
        x: 0,
        y: 0,
        z: 0,
        width: 10,
        height: 5,
        depth: 10,
        color: "#ffffff",
        selectable: true
      },
      null
    );
    expect(layout.kind).toBe(1);
  });

  it("mezcla el color de selección", () => {
    const color = colorOf(
      {
        path: "src/a.ts",
        role: "file",
        x: 0,
        y: 0,
        z: 0,
        width: 10,
        height: 5,
        depth: 10,
        color: "#000000",
        selectable: true
      },
      "src/a.ts"
    );
    expect(color[2]).toBeGreaterThan(color[0] ?? 0);
  });

  it("proyecta el centro del objetivo en el centro de la pantalla", () => {
    const projected = projectPoint(
      { x: 0, y: 0, z: 10 },
      { x: 0, y: 0, z: 0 },
      Math.PI / 2,
      1,
      200,
      100,
      { x: 0, y: 0, z: 0 }
    );
    expect(projected?.x).toBeCloseTo(100, 6);
    expect(projected?.y).toBeCloseTo(50, 6);
    expect(projected?.depth).toBeCloseTo(10, 6);
  });

  it("descarta un punto detrás de la cámara", () => {
    expect(
      projectPoint(
        { x: 0, y: 0, z: 10 },
        { x: 0, y: 0, z: 0 },
        Math.PI / 2,
        1,
        200,
        100,
        { x: 0, y: 0, z: 20 }
      )
    ).toBeNull();
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
