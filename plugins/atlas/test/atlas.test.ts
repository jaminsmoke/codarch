import fs from "node:fs";
import { describe, expect, it } from "vitest";
import type { TreeNode } from "@codarch/render/browser";
import { buildRoom, findFolder, type RoomInput } from "../room";
import { projectPoint } from "../camera";
import { clampOrbit } from "../orbit";
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
  projectName: "codarch",
  colorFor,
  fallbackColor: "#cccccc",
  furnitureColor: "#333333",
  floorColor: "#eeeeee",
  wallColor: "#222222",
  lightColor: "#ffffff",
  trimColor: "#555555"
};

describe("la geometría frontal del Atlas", () => {
  it("en la sala del proyecto las carpetas son contenedores y los ficheros hojas", () => {
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

  it("las hojas van de pie en las estanterías laterales", () => {
    const room = buildRoom({ ...input, focusPath: "src/a" });
    const sheet = room.boxes.find((box) => box.path === "src/a/uno.ts");
    expect(sheet?.height).toBeGreaterThan(sheet?.width ?? 0);
    expect(sheet?.depth).toBeGreaterThan(sheet?.width ?? 0);
    expect(Math.abs(sheet?.x ?? 0)).toBeGreaterThan(room.width / 4);
  });

  it("los archivadores quedan centrados y las hojas a los lados", () => {
    const room = buildRoom({ ...input, focusPath: "src/a" });
    const sub = room.boxes.find((box) => box.path === "src/a/sub");
    const sheetsX = room.boxes
      .filter((box) => box.role === "file")
      .map((box) => Math.sign(box.x));

    expect(Math.abs(sub?.x ?? 0)).toBeLessThan(room.width / 3);
    expect(sheetsX).toContain(-1);
    expect(sheetsX).toContain(1);
  });

  it("el pasillo central lleva dos guías de suelo", () => {
    const room = buildRoom(input);
    const guides = room.boxes.filter(
      (box) =>
        box.role === "furniture" &&
        box.height < 0.1 &&
        box.width < 0.2 &&
        box.depth > 4
    );

    expect(guides.length).toBeGreaterThanOrEqual(2);
  });

  it("las estanterías están abiertas y se llenan desde dentro hacia el frente", () => {
    const room = buildRoom({ ...input, focusPath: "src/a" });
    const sheets = room.boxes.filter((box) => box.role === "file");
    const sideCaps = room.boxes.filter(
      (box) =>
        box.role === "furniture" &&
        box.height > 2 &&
        box.width > 1 &&
        box.depth < 0.5 &&
        Math.abs(box.x) > room.width / 4 &&
        Math.abs(box.x) < room.width / 2
    );

    expect(sideCaps).toHaveLength(0);
    expect(Math.max(...sheets.map((box) => box.z))).toBeGreaterThan(
      room.depth / 3
    );
    for (const side of [-1, 1]) {
      const sideZ = sheets
        .filter((box) => Math.sign(box.x) === side)
        .map((box) => box.z);
      expect(sideZ).toEqual([...sideZ].sort((left, right) => right - left));
    }
  });

  it("las hojas van a las estanterías y no al suelo", () => {
    const room = buildRoom({ ...input, focusPath: "src/a" });
    const sheet = room.boxes.find((box) => box.path === "src/a/uno.ts");
    expect(sheet?.y).toBeGreaterThan(1);
    expect(sheet?.height).toBeLessThan(2);
  });

  it("el proyecto también es una sala completa", () => {
    const room = buildRoom(input);

    expect(room.title).toBe("codarch");
    expect(room.boxes.some((box) => box.role === "floor")).toBe(true);
    expect(
      room.boxes.filter((box) => box.role === "furniture").length
    ).toBeGreaterThan(4);
    expect(room.boxes.find((box) => box.role === "sign")?.label).toBe(
      "codarch"
    );
  });

  it("la sala es profunda, sin techo y con los archivadores al fondo", () => {
    const room = buildRoom(input);
    const folder = room.boxes.find((box) => box.path === "src");
    const ceiling = room.boxes.find(
      (box) =>
        box.role === "furniture" &&
        box.y === room.height &&
        box.width > room.width
    );

    expect(room.depth).toBeGreaterThan(room.width * 0.6);
    expect(ceiling).toBeUndefined();
    expect(
      room.depth - ((folder?.z ?? 0) + (folder?.depth ?? 0) / 2)
    ).toBeLessThan(3);
  });

  it("las paredes laterales cierran con la de fondo y el suelo queda dentro", () => {
    const room = buildRoom(input);
    const walls = room.boxes.filter(
      (box) => box.role === "furniture" && box.height === room.height
    );
    const sideWalls = walls.filter(
      (box) => Math.abs(box.x) > room.width / 2 && box.depth > room.depth
    );
    const backWall = walls.find(
      (box) => box.x === 0 && box.width > room.width
    );
    const floor = room.boxes.find((box) => box.role === "floor");
    const sideWallX = Math.abs(sideWalls[0]!.x);
    const cornerPosts = walls.filter(
      (box) =>
        Math.abs(box.x) > room.width / 2 &&
        box.z > room.depth &&
        box.depth < 1
    );

    expect(sideWalls).toHaveLength(2);
    expect(backWall?.width).toBeCloseTo((sideWallX + 0.2) * 2);
    expect(backWall?.z).toBeCloseTo(room.depth + 0.8);
    expect(floor?.width).toBeCloseTo(room.width + 2.4);
    expect(cornerPosts.length).toBeGreaterThanOrEqual(2);
  });

  it("cada sala lleva el nombre en un cartel de la pared de fondo", () => {
    const room = buildRoom({ ...input, focusPath: "src/a" });
    const sign = room.boxes.find((box) => box.role === "sign");

    expect(room.title).toBe("src/a");
    expect(sign?.label).toBe("src/a");
    expect(sign?.selectable).toBe(false);
    expect(sign?.z).toBeGreaterThan(room.depth);
    expect(sign?.width).toBeLessThan(room.width);
  });

  it("los detalles del archivador quedan marcados para el LOD", () => {
    const room = buildRoom(input);
    const details = room.boxes.filter((box) => box.detail);

    expect(details.length).toBeGreaterThan(0);
    expect(details.every((box) => !box.selectable)).toBe(true);
  });

  it("la tabla de métricas se cuelga en la pared de fondo", () => {
    const room = buildRoom({
      ...input,
      metrics: [
        { label: "Ficheros", value: "704" },
        { label: "Carpetas", value: "73" },
        { label: "Riesgo", value: "96 / 100" }
      ]
    });
    const panels = room.boxes.filter((box) => box.role === "metric");

    expect(panels).toHaveLength(1);
    expect(panels[0]?.metricRows?.[0]?.label).toBe("Ficheros");
    expect(panels[0]?.metricRows).toHaveLength(3);
    expect(panels[0]?.selectable).toBe(true);
    expect(panels[0]?.z).toBeGreaterThan(room.depth);
  });

  it("el mobiliario no se puede seleccionar", () => {
    const room = buildRoom(input);
    const furniture = room.boxes.filter((box) => !box.selectable);
    expect(furniture.length).toBeGreaterThan(0);
    expect(
      furniture.every(
        (box) =>
          box.role === "floor" ||
          box.role === "furniture" ||
          box.role === "sign" ||
          box.role === "metric"
      )
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
    expect(kindOf("sign")).toBe(3);
    expect(kindOf("metric")).toBe(3);
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

  it("también resalta la carpeta seleccionada", () => {
    const folderBox = {
      path: "src",
      role: "folder" as const,
      x: 0,
      y: 0,
      z: 0,
      width: 10,
      height: 5,
      depth: 10,
      color: "#000000",
      selectable: true
    };
    expect(colorOf(folderBox, null, "src")).not.toEqual(
      colorOf(folderBox, null)
    );
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

  it("mantiene la cámara dentro del arco frontal de la sala", () => {
    const clamped = clampOrbit(
      { azimuth: 0, polar: 1.3, distance: 20 },
      {
        minDistance: 5,
        maxDistance: 100,
        minPolar: 1,
        maxPolar: 1.6,
        minAzimuth: 2,
        maxAzimuth: 4
      }
    );
    expect(clamped.azimuth).toBe(2);
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
