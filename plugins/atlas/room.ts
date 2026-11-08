import type { TreeNode } from "@codarch/render/browser";

/**
 * La geometría frontal del Atlas.
 *
 * Una carpeta es un **contenedor** en el suelo. Un fichero es una **hoja** en
 * una estantería. La regla no cambia al entrar: las subcarpetas siguen siendo
 * contenedores y los ficheros siguen siendo hojas.
 *
 * Todo es puro: se puede probar sin WebGL ni DOM.
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
  /** La carpeta abierta; `null` es la vista general. */
  focusPath: string | null;
  colorFor: (fileIndex: number) => string;
  fallbackColor: string;
  furnitureColor: string;
  /** El suelo comparte el fondo para que solo se vea la rejilla. */
  floorColor: string;
}

export interface Room {
  boxes: AtlasBox[];
  /** El centro de la escena, a la altura de la mirada. */
  target: { x: number; y: number; z: number };
  width: number;
  depth: number;
  radius: number;
  /** La carpeta que representa, o `null` en la vista general. */
  focusPath: string | null;
  /** Cuántos contenedores y hojas hay en la sala. */
  containers: number;
  sheets: number;
}

const CONTAINER_WIDTH = 5.2;
const CONTAINER_DEPTH = 5.2;
const CONTAINER_GAP = 2.4;
const CONTAINER_START_Z = 4;
const SHEET_ROWS = 4;
const SHEET_ROW_HEIGHT = 2.3;
const SHEET_COLUMN_GAP = 2.6;
const SHEET_START_Z = 2.5;
const SHEET_HEIGHT = 1.6;
const SHEET_DEPTH = 2.2;
const SHEET_THICKNESS = 0.22;
const SHELF_THICKNESS = 0.18;
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

function containerHeight(fileCount: number): number {
  return Math.min(9, Math.max(3, 2.8 + Math.log2(fileCount + 1) * 1.1));
}

/** Construye la sala frontal de la carpeta enfocada (o la vista general). */
export function buildRoom(input: RoomInput): Room {
  const current = input.focusPath
    ? findFolder(input.roots, input.focusPath)
    : null;
  const children = current?.children ?? input.roots;
  const folders = children.filter((child) => child.kind === "folder");
  const fileNodes = children.filter((child) => child.kind === "file");

  const containerColumns = Math.max(
    1,
    Math.min(6, Math.ceil(Math.sqrt(folders.length * 1.4)))
  );
  const containerRows = Math.ceil(folders.length / containerColumns);
  const containerGridWidth =
    containerColumns * CONTAINER_WIDTH +
    Math.max(0, containerColumns - 1) * CONTAINER_GAP;
  const containerGridDepth =
    containerRows * CONTAINER_DEPTH +
    Math.max(0, containerRows - 1) * CONTAINER_GAP;

  const sheetColumns = Math.max(
    1,
    Math.ceil(fileNodes.length / (2 * SHEET_ROWS))
  );
  const sheetRowsUsed = Math.min(
    SHEET_ROWS,
    Math.max(1, Math.ceil(fileNodes.length / (2 * sheetColumns)))
  );
  const sheetDepth =
    SHEET_START_Z +
    Math.max(0, sheetColumns - 1) * SHEET_COLUMN_GAP +
    SHEET_DEPTH +
    2;
  const width = Math.max(22, containerGridWidth + 8, 18);
  const depth = Math.max(
    14,
    containerGridDepth + CONTAINER_START_Z + 6,
    sheetDepth
  );
  const halfWidth = width / 2;

  const boxes: AtlasBox[] = [];
  let containers = 0;
  let sheets = 0;

  // La plataforma bajo los contenedores: una referencia de suelo pequeña,
  // no el plano infinito del primer prototipo.
  if (folders.length > 0) {
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

  // Las carpetas son contenedores en el suelo, también dentro de otra carpeta.
  const containerStartX = -containerGridWidth / 2 + CONTAINER_WIDTH / 2;
  for (let index = 0; index < folders.length; index++) {
    const node = folders[index] as TreeNode;
    const column = index % containerColumns;
    const row = Math.floor(index / containerColumns);
    boxes.push({
      path: node.path,
      role: "folder",
      x: containerStartX + column * (CONTAINER_WIDTH + CONTAINER_GAP),
      y: 0,
      z:
        CONTAINER_START_Z +
        row * (CONTAINER_DEPTH + CONTAINER_GAP),
      width: CONTAINER_WIDTH,
      depth: CONTAINER_DEPTH,
      height: containerHeight(node.fileCount),
      color: colorOfFolder(node, input),
      selectable: true,
      label: node.name
    });
    containers += 1;
  }

  // Las estanterías laterales: una tabla por fila y lado, solo si hay hojas.
  if (fileNodes.length > 0) {
    for (const side of [-1, 1]) {
      for (let row = 0; row < sheetRowsUsed; row++) {
        boxes.push({
          path: null,
          role: "furniture",
          x: side * (halfWidth - 0.35),
          y: 1.5 + row * SHEET_ROW_HEIGHT,
          z: depth / 2,
          width: 0.5,
          depth: depth,
          height: SHELF_THICKNESS,
          color: input.furnitureColor,
          selectable: false
        });
      }
    }
  }

  // Las hojas: ficheros en las estanterías, siempre separados de los contenedores.
  for (let index = 0; index < fileNodes.length; index++) {
    const node = fileNodes[index] as TreeNode;
    const fileIndex = node.fileIndex;
    if (fileIndex === undefined) continue;
    const side = index % 2 === 0 ? -1 : 1;
    const slot = Math.floor(index / 2);
    const row = slot % SHEET_ROWS;
    const column = Math.floor(slot / SHEET_ROWS);
    boxes.push({
      path: node.path,
      role: "file",
      x: side * (halfWidth - 0.9),
      y: 1.85 + row * SHEET_ROW_HEIGHT,
      z: SHEET_START_Z + column * SHEET_COLUMN_GAP,
      width: SHEET_THICKNESS,
      depth: SHEET_DEPTH,
      height: SHEET_HEIGHT,
      color: input.colorFor(fileIndex),
      selectable: true,
      label: node.name
    });
    sheets += 1;
  }

  return {
    boxes,
    target: { x: 0, y: 4.5, z: depth / 2 },
    width,
    depth,
    radius: Math.hypot(width, depth, 14) / 2,
    focusPath: input.focusPath,
    containers,
    sheets
  };
}

/** El número de cajas que se pueden seleccionar. */
export function selectableBoxes(room: Room): AtlasBox[] {
  return room.boxes.filter((box) => box.selectable);
}
