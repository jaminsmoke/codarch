import type { TreeNode } from "@codarch/render/browser";

/**
 * La geometría frontal del Atlas.
 *
 * Todas las escalas son la misma sala: el proyecto es la primera y cada carpeta
 * abre otra. Los archivadores se ordenan en el centro y las estanterías de los
 * ficheros se pegan a las paredes laterales. Las hojas van de pie en la
 * estantería, con su cara mirando al centro de la sala. El frente queda abierto
 * y solo lo cruza una viga con el nombre de la escala.
 */

export type AtlasRole = "folder" | "file" | "floor" | "furniture" | "beam";

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
  /** La carpeta abierta; `null` es la sala del proyecto. */
  focusPath: string | null;
  colorFor: (fileIndex: number) => string;
  fallbackColor: string;
  furnitureColor: string;
  floorColor: string;
  wallColor: string;
  lightColor: string;
  trimColor: string;
}

export interface Room {
  boxes: AtlasBox[];
  /** El centro de la escena, a la altura de la mirada. */
  target: { x: number; y: number; z: number };
  width: number;
  depth: number;
  height: number;
  radius: number;
  focusPath: string | null;
  /** Nombre que va en el letrero de la viga. */
  title: string;
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

/** Tapa, zócalo y tirador: el archivador deja de ser un cubo liso. */
function addCabinetDetails(
  boxes: AtlasBox[],
  input: RoomInput,
  x: number,
  z: number,
  width: number,
  depth: number,
  height: number
): void {
  const front = z - depth / 2 - 0.05;
  boxes.push({
    path: null,
    role: "furniture",
    x,
    y: height,
    z,
    width: width + 0.24,
    depth: depth + 0.24,
    height: 0.16,
    color: input.trimColor,
    selectable: false
  });
  boxes.push({
    path: null,
    role: "furniture",
    x,
    y: 0,
    z,
    width: width + 0.24,
    depth: depth + 0.24,
    height: 0.14,
    color: input.trimColor,
    selectable: false
  });
  boxes.push({
    path: null,
    role: "furniture",
    x,
    y: height * 0.56,
    z: front,
    width: width * 0.42,
    depth: 0.08,
    height: 0.16,
    color: input.trimColor,
    selectable: false
  });
  for (const edge of [-1, 1]) {
    boxes.push({
      path: null,
      role: "furniture",
      x: x + edge * (width / 2 - 0.1),
      y: height * 0.12,
      z: front,
      width: 0.1,
      depth: 0.06,
      height: height * 0.76,
      color: input.trimColor,
      selectable: false
    });
  }
}

/** Construye la sala recursiva del proyecto o de la carpeta enfocada. */
export function buildRoom(input: RoomInput): Room {
  const current = input.focusPath
    ? findFolder(input.roots, input.focusPath)
    : null;
  const children = current?.children ?? input.roots;
  const folders = children.filter((child) => child.kind === "folder");
  const fileNodes = children.filter((child) => child.kind === "file");
  const title = current?.name ?? "Proyecto";

  const filesPerSide = Math.ceil(fileNodes.length / 2);
  const sideFileColumns = fileNodes.length
    ? Math.max(
        1,
        Math.min(4, Math.ceil(Math.sqrt(Math.max(1, filesPerSide) * 1.3)))
      )
    : 0;
  const sideFileRows = fileNodes.length
    ? Math.max(1, Math.ceil(filesPerSide / sideFileColumns))
    : 0;
  const sideShelfWidth = fileNodes.length
    ? sideFileColumns * SHEET_WIDTH +
      Math.max(0, sideFileColumns - 1) * SHEET_GAP_X
    : 0;
  const fileWallHeight = fileNodes.length
    ? SHEET_BASE_Y + sideFileRows * SHEET_ROW_HEIGHT + 1
    : 0;

  const maxFolderHeight = folders.reduce(
    (max, folder) => Math.max(max, containerHeight(folder.fileCount, 6)),
    0
  );

  const containerColumns = folders.length
    ? folders.length <= 5
      ? folders.length
      : Math.min(3, Math.ceil(Math.sqrt(folders.length)))
    : 1;
  const containerRows = Math.ceil(folders.length / containerColumns);
  const containerGridWidth = gridSpan(containerColumns, folders.length);
  const containerGridDepth = gridSpan(containerRows, folders.length);

  const width = Math.max(
    24,
    containerGridWidth + 2 * SHELF_DEPTH + 12,
    fileNodes.length ? 24 : 0
  );
  const depth = Math.max(
    16,
    CONTAINER_START_Z + containerGridDepth + 5
  );
  const shelfZ = Math.max(
    CONTAINER_START_Z + CONTAINER_DEPTH + 2.5,
    depth * 0.55
  );

  const boxes: AtlasBox[] = [];
  let containers = 0;
  let sheets = 0;

  // Suelo, paredes y techo: todas las escalas comparten la misma sala.
  const roomHeight = Math.max(
    14,
    fileWallHeight + 3,
    maxFolderHeight + 7
  );
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
  for (const side of [-1, 1]) {
    boxes.push({
      path: null,
      role: "furniture",
      x: side * (width / 2 + 0.35),
      y: 0.1,
      z: depth / 2,
      width: 0.2,
      depth: depth + 2.2,
      height: 0.5,
      color: input.trimColor,
      selectable: false
    });
  }
  boxes.push({
    path: null,
    role: "furniture",
    x: 0,
    y: 0.1,
    z: depth + 0.55,
    width: width + 4,
    depth: 0.2,
    height: 0.5,
    color: input.trimColor,
    selectable: false
  });
  for (const panelX of [-width / 3, width / 3]) {
    boxes.push({
      path: null,
      role: "furniture",
      x: panelX,
      y: 0.5,
      z: depth + 0.55,
      width: 0.12,
      depth: 0.1,
      height: roomHeight,
      color: input.trimColor,
      selectable: false
    });
  }
  boxes.push({
    path: null,
    role: "furniture",
    x: 0,
    y: roomHeight,
    z: depth / 2,
    width: width + 4,
    depth: depth + 4,
    height: 0.4,
    color: input.wallColor,
    selectable: false
  });
  boxes.push({
    path: null,
    role: "furniture",
    x: 0,
    y: roomHeight - 0.55,
    z: depth / 2,
    width: width * 0.7,
    depth: 0.5,
    height: 0.12,
    color: input.lightColor,
    selectable: false
  });
  // La viga es la única pieza que cruza el frente: cierra la sala sin tapar
  // la vista y sostiene el letrero con el nombre de la escala.
  boxes.push({
    path: null,
    role: "beam",
    x: 0,
    y: roomHeight - 2.2,
    z: -1.2,
    width: width + 4,
    depth: 0.5,
    height: 0.8,
    color: input.trimColor,
    selectable: false,
    label: title
  });

  // Los archivadores se ordenan en una retícula centrada en la sala.
  const containerStartX = -containerGridWidth / 2 + CONTAINER_WIDTH / 2;
  for (let index = 0; index < folders.length; index++) {
    const node = folders[index] as TreeNode;
    const column = index % containerColumns;
    const row = Math.floor(index / containerColumns);
    const x = containerStartX + column * (CONTAINER_WIDTH + CONTAINER_GAP);
    const z =
      CONTAINER_START_Z + row * (CONTAINER_DEPTH + CONTAINER_GAP);
    const height = containerHeight(node.fileCount, 6);
    boxes.push({
      path: node.path,
      role: "folder",
      x,
      y: 0,
      z,
      width: CONTAINER_WIDTH,
      depth: CONTAINER_DEPTH,
      height,
      color: colorOfFolder(node, input),
      selectable: true,
      label: node.name
    });
    addCabinetDetails(
      boxes,
      input,
      x,
      z,
      CONTAINER_WIDTH,
      CONTAINER_DEPTH,
      height
    );
    containers += 1;
  }

  // Estanterías laterales: la tabla entra desde la pared hacia el centro y las
  // hojas quedan de pie, con la cara hacia el pasillo central.
  if (fileNodes.length > 0) {
    const fileSides = [
      fileNodes.slice(0, filesPerSide),
      fileNodes.slice(filesPerSide)
    ];
    for (let sideIndex = 0; sideIndex < 2; sideIndex++) {
      const nodes = fileSides[sideIndex] as TreeNode[];
      if (nodes.length === 0) continue;
      const side = sideIndex === 0 ? -1 : 1;
      const shelfX = side * (width / 2 - SHELF_DEPTH / 2 - 0.4);
      const shelfWidth = sideShelfWidth + 1;
      const sheetX = side * (width / 2 - 0.65);

      // Listón que ata la estantería a la pared lateral.
      boxes.push({
        path: null,
        role: "furniture",
        x: side * (width / 2 + 0.1),
        y: 0,
        z: shelfZ,
        width: 0.1,
        depth: shelfWidth,
        height: fileWallHeight,
        color: input.trimColor,
        selectable: false
      });
      for (const edge of [-1, 1]) {
        boxes.push({
          path: null,
          role: "furniture",
          x: shelfX,
          y: 0,
          z: shelfZ + edge * (sideShelfWidth / 2 + 0.35),
          width: SHELF_DEPTH,
          depth: 0.3,
          height: fileWallHeight,
          color: input.furnitureColor,
          selectable: false
        });
      }
      for (let row = 0; row < sideFileRows; row++) {
        boxes.push({
          path: null,
          role: "furniture",
          x: shelfX,
          y: SHEET_BASE_Y + row * SHEET_ROW_HEIGHT - 0.35,
          z: shelfZ,
          width: SHELF_DEPTH,
          depth: shelfWidth,
          height: SHELF_THICKNESS,
          color: input.furnitureColor,
          selectable: false
        });
      }

      const startZ = shelfZ - sideShelfWidth / 2 + SHEET_WIDTH / 2;
      for (let index = 0; index < nodes.length; index++) {
        const node = nodes[index] as TreeNode;
        const fileIndex = node.fileIndex;
        if (fileIndex === undefined) continue;
        const column = index % sideFileColumns;
        const row = Math.floor(index / sideFileColumns);
        boxes.push({
          path: node.path,
          role: "file",
          x: sheetX,
          y: SHEET_BASE_Y + row * SHEET_ROW_HEIGHT,
          z: startZ + column * (SHEET_WIDTH + SHEET_GAP_X),
          // La hoja está de pie: el ancho va sobre la tabla y la cara mira al
          // pasillo central, no a la cámara.
          width: SHEET_THICKNESS,
          depth: SHEET_WIDTH,
          height: SHEET_HEIGHT,
          color: input.colorFor(fileIndex),
          selectable: true,
          label: node.name
        });
        sheets += 1;
      }
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
    height: roomHeight,
    radius: Math.hypot(width, depth, Math.max(14, fileWallHeight)) / 2,
    focusPath: input.focusPath,
    title,
    containers,
    sheets
  };
}

/** Longitud de una fila o columna de archivadores, o 0 si no hay ninguno. */
function gridSpan(count: number, total: number): number {
  if (total === 0 || count === 0) return 0;
  return (
    count * CONTAINER_WIDTH + Math.max(0, count - 1) * CONTAINER_GAP
  );
}

/** El número de cajas que se pueden seleccionar. */
export function selectableBoxes(room: Room): AtlasBox[] {
  return room.boxes.filter((box) => box.selectable);
}
