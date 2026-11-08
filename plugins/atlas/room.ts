import type { TreeNode } from "@codarch/render/browser";

/**
 * La geometría frontal del Atlas.
 *
 * El overview es un mapa plano con los contenedores del primer nivel. Cada
 * carpeta abre una sala recursiva: sus subcarpetas son archivadores en el suelo
 * y sus ficheros son hojas frontales en estanterías de fondo. Las hojas miran a
 * la cámara; no se ven de canto.
 */

export type AtlasRole = "folder" | "file" | "floor" | "furniture";

export interface AtlasBox {
  path: string | null;
  role: AtlasRole;
  /** Centro en X y Z; `y` es la base. */
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  color: string;
  /** Un clic puede seleccionar esta caja. */
  selectable: boolean;
  /** Nombre legible que se pinta encima. */
  label?: string;
}

export interface RoomInput {
  roots: readonly TreeNode[];
  files: readonly { risk: number }[];
  /** La carpeta abierta; `null` es el overview. */
  focusPath: string | null;
  colorFor: (fileIndex: number) => string;
  fallbackColor: string;
  furnitureColor: string;
  floorColor: string;
  wallColor: string;
}

export interface Room {
  boxes: AtlasBox[];
  /** El centro de la escena, a la altura de la mirada. */
  target: { x: number; y: number; z: number };
  width: number;
  depth: number;
  radius: number;
  focusPath: string | null;
  containers: number;
  sheets: number;
}

const CONTAINER_WIDTH = 5.2;
const CONTAINER_DEPTH = 5.2;
const CONTAINER_GAP = 2.4;
const CONTAINER_START_Z = 4;

const SHEET_WIDTH = 1.9;
const SHEET_HEIGHT = 1.3;
const SHEET_THICKNESS = 0.16;
const SHEET_GAP_X = 0.55;
const SHEET_ROW_HEIGHT = 2.2;
const SHEET_BASE_Y = 2.2;
const SHELF_DEPTH = 1.8;
const SHELF_THICKNESS = 0.16;

const FLOOR_HEIGHT = 0.35;

/** La carpeta de una ruta, o `null` si no existe. */
export function findFolder(
  roots: readonly TreeNode[],
  path: string
): TreeNode | null {
  for (const node of roots) {
    if (node.kind === "folder" && node.path === path) return node;
    if (node.kind === "folder") {
      const found = findFolder(node.children ?? [], path);
      if (found) return found;
    }
  }
  return null;
}

/** El primer fichero de un árbol, para dar color a su contenedor. */
function firstFileIndex(node: TreeNode): number | null {
  if (node.kind === "file") return node.fileIndex ?? null;
  for (const child of node.children ?? []) {
    const index = firstFileIndex(child);
    if (index !== null) return index;
  }
  return null;
}

function colorOfFolder(node: TreeNode, input: RoomInput): string {
  const index = firstFileIndex(node);
  return index === null ? input.fallbackColor : input.colorFor(index);
}

function containerHeight(fileCount: number, max = 9): number {
  return Math.min(max, Math.max(3, 2.8 + Math.log2(fileCount + 1) * 1.1));
}

/** Construye el overview o la sala recursiva de la carpeta enfocada. */
export function buildRoom(input: RoomInput): Room {
  const current = input.focusPath
    ? findFolder(input.roots, input.focusPath)
    : null;
  const children = current?.children ?? input.roots;
  const folders = children.filter((child) => child.kind === "folder");
  const fileNodes = children.filter((child) => child.kind === "file");
  const overview = input.focusPath === null;

  const fileColumns = Math.max(
    1,
    Math.ceil(Math.sqrt(Math.max(1, fileNodes.length) * 1.5))
  );
  const fileRows = Math.max(
    1,
    Math.ceil(fileNodes.length / fileColumns)
  );
  const maxFolderHeight = folders.reduce(
    (max, folder) =>
      Math.max(max, containerHeight(folder.fileCount, overview ? 9 : 6)),
    0
  );
  const sheetBaseY = overview
    ? SHEET_BASE_Y
    : Math.max(SHEET_BASE_Y, maxFolderHeight + 1.5);
  const fileWallWidth =
    fileColumns * SHEET_WIDTH +
    Math.max(0, fileColumns - 1) * SHEET_GAP_X;
  const fileWallHeight =
    sheetBaseY + fileRows * SHEET_ROW_HEIGHT + 1;

  const containerColumns = Math.max(
    1,
    Math.min(
      overview ? 6 : 4,
      Math.ceil(Math.sqrt(folders.length * 1.4))
    )
  );
  const containerRows = Math.ceil(folders.length / containerColumns);
  const containerGridWidth =
    containerColumns * CONTAINER_WIDTH +
    Math.max(0, containerColumns - 1) * CONTAINER_GAP;
  const containerGridDepth =
    containerRows * CONTAINER_DEPTH +
    Math.max(0, containerRows - 1) * CONTAINER_GAP;

  const width = Math.max(
    24,
    containerGridWidth + (overview ? 8 : 14),
    fileWallWidth + 8
  );
  const depth = Math.max(
    16,
    CONTAINER_START_Z + containerGridDepth + 5,
    fileWallHeight > 0 ? 14 : 0
  );
  const wallZ = depth - 1.6;

  const boxes: AtlasBox[] = [];
  let containers = 0;
  let sheets = 0;

  // Plataforma bajo los contenedores en el overview.
  if (folders.length > 0 && overview) {
    boxes.push({
      path: null,
      role: "floor",
      x: 0,
      y: -FLOOR_HEIGHT,
      z: CONTAINER_START_Z + containerGridDepth / 2,
      width: Math.max(12, containerGridWidth + 5),
      depth: Math.max(10, containerGridDepth + 5),
      height: FLOOR_HEIGHT,
      color: input.floorColor,
      selectable: false
    });
  }

  // Sala: suelo, paredes y estanterías forman un espacio cerrado.
  if (!overview) {
    const roomHeight = Math.max(14, fileWallHeight + 3);
    boxes.push({
      path: null,
      role: "floor",
      x: 0,
      y: -FLOOR_HEIGHT,
      z: depth / 2,
      width: width + 4,
      depth: depth + 4,
      height: FLOOR_HEIGHT,
      color: input.floorColor,
      selectable: false
    });
    for (const side of [-1, 1]) {
      boxes.push({
        path: null,
        role: "furniture",
        x: side * (width / 2 + 0.6),
        y: 0,
        z: depth / 2,
        width: 0.4,
        depth: depth + 2,
        height: roomHeight,
        color: input.wallColor,
        selectable: false
      });
    }
    boxes.push({
      path: null,
      role: "furniture",
      x: 0,
      y: 0,
      z: depth + 0.8,
      width: width + 4,
      depth: 0.4,
      height: roomHeight,
      color: input.wallColor,
      selectable: false
    });
  }

  // Contenedores: en el overview forman el mapa plano; en una sala son
  // archivadores en el suelo, delante de las estanterías.
  const containerStartX = -containerGridWidth / 2 + CONTAINER_WIDTH / 2;
  for (let index = 0; index < folders.length; index++) {
    const node = folders[index] as TreeNode;
    const column = index % containerColumns;
    const row = Math.floor(index / containerColumns);
    const x = containerStartX + column * (CONTAINER_WIDTH + CONTAINER_GAP);
    boxes.push({
      path: node.path,
      role: "folder",
      x,
      y: 0,
      z:
        CONTAINER_START_Z +
        row * (CONTAINER_DEPTH + CONTAINER_GAP),
      width: CONTAINER_WIDTH,
      depth: CONTAINER_DEPTH,
      height: containerHeight(node.fileCount, overview ? 9 : 6),
      color: colorOfFolder(node, input),
      selectable: true,
      label: node.name
    });
    containers += 1;
  }

  // Estanterías de fondo: tablas horizontales que miran a la cámara.
  if (fileNodes.length > 0) {
    if (!overview) {
      for (const side of [-1, 1]) {
        boxes.push({
          path: null,
          role: "furniture",
          x: side * (fileWallWidth / 2 + 0.45),
          y: 0,
          z: wallZ,
          width: 0.35,
          depth: SHELF_DEPTH,
          height: fileWallHeight,
          color: input.furnitureColor,
          selectable: false
        });
      }
    }
    for (let row = 0; row < fileRows; row++) {
      boxes.push({
        path: null,
        role: "furniture",
        x: 0,
        y: sheetBaseY + row * SHEET_ROW_HEIGHT - 0.35,
        z: wallZ,
        width: fileWallWidth + 1,
        depth: SHELF_DEPTH,
        height: SHELF_THICKNESS,
        color: input.furnitureColor,
        selectable: false
      });
    }

    const fileStartX = -fileWallWidth / 2 + SHEET_WIDTH / 2;
    for (let index = 0; index < fileNodes.length; index++) {
      const node = fileNodes[index] as TreeNode;
      const fileIndex = node.fileIndex;
      if (fileIndex === undefined) continue;
      const column = index % fileColumns;
      const row = Math.floor(index / fileColumns);
      boxes.push({
        path: node.path,
        role: "file",
        x: fileStartX + column * (SHEET_WIDTH + SHEET_GAP_X),
        y: sheetBaseY + row * SHEET_ROW_HEIGHT,
        z: wallZ + SHELF_DEPTH / 2 - 0.1,
        // La hoja mira a la cámara: ancho y alto grandes, profundidad mínima.
        width: SHEET_WIDTH,
        depth: SHEET_THICKNESS,
        height: SHEET_HEIGHT,
        color: input.colorFor(fileIndex),
        selectable: true,
        label: node.name
      });
      sheets += 1;
    }
  }

  return {
    boxes,
    target: {
      x: 0,
      y: Math.max(4.5, fileWallHeight * 0.38),
      z: depth / 2
    },
    width,
    depth,
    radius: Math.hypot(width, depth, Math.max(14, fileWallHeight)) / 2,
    focusPath: input.focusPath,
    containers,
    sheets
  };
}

/** El número de cajas que se pueden seleccionar. */
export function selectableBoxes(room: Room): AtlasBox[] {
  return room.boxes.filter((box) => box.selectable);
}
