import type { TreeNode } from "@codarch/render/browser";
import type { RoomMetric } from "./metrics";

/**
 * La geometría frontal del Atlas.
 *
 * Todas las escalas son la misma sala: el proyecto es la primera y cada carpeta
 * abre otra. Los archivadores se ordenan en el centro y las estanterías de los
 * ficheros se pegan a las paredes laterales. Las hojas van de pie en la
 * estantería, con su cara mirando al centro de la sala. El frente queda abierto
 * y el nombre de la escala vive en un cartel de la pared de fondo.
 */

export type AtlasRole =
  | "folder"
  | "file"
  | "floor"
  | "furniture"
  | "sign"
  | "metric";

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
  /** Detalle pequeño que se puede retirar cuando la sala tiene muchas cajas. */
  detail?: boolean;
  /** Filas de una pantalla de métricas. */
  metricRows?: readonly RoomMetric[];
}

export interface RoomInput {
  roots: readonly TreeNode[];
  files: readonly { risk: number }[];
  /** La carpeta abierta; `null` es la sala del proyecto. */
  focusPath: string | null;
  /** Nombre del proyecto analizado, para el cartel de la sala raíz. */
  projectName: string;
  /** Cifras del ámbito abierto, para los paneles de la pared de fondo. */
  metrics?: readonly RoomMetric[];
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
  /** Nombre que va en el cartel de la pared de fondo. */
  title: string;
  containers: number;
  sheets: number;
}

const CONTAINER_WIDTH = 5.2;
const CONTAINER_DEPTH = 5.2;
const CONTAINER_GAP = 2.4;
/** Separación entre la espalda del archivador y la pared de fondo. */
const CONTAINER_BACK_MARGIN = 2.8;

const SHEET_WIDTH = 1.9;
const SHEET_HEIGHT = 1.3;
const SHEET_THICKNESS = 0.16;
const SHEET_GAP_X = 0.55;
const SHEET_ROW_HEIGHT = 2.2;
const SHEET_BASE_Y = 2.2;
const SHELF_DEPTH = 1.25;
const SHELF_THICKNESS = 0.08;
/** Referencia de la boca de la sala. */
const SHELF_FRONT_Z = 1.4;

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
    selectable: false,
    detail: true
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
    selectable: false,
    detail: true
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
    selectable: false,
    detail: true
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
      selectable: false,
      detail: true
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
  const title =
    current?.name || input.projectName || "Proyecto";

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
    containerGridWidth + 2 * SHELF_DEPTH + 16,
    fileNodes.length ? 24 : 0
  );
  // La profundidad sigue al ancho: una sala cuadrada se recorre mejor y deja
  // pasillo entre la estantería delantera y los archivadores del fondo.
  const depth = Math.max(
    20,
    width * 0.65,
    containerGridDepth + 8,
    fileNodes.length ? SHELF_FRONT_Z + sideShelfWidth + 4 : 0
  );
  const shelfCenterZ = Math.max(
    SHELF_FRONT_Z + sideShelfWidth / 2,
    depth * 0.55
  );
  const containerStartZ =
    depth -
    CONTAINER_BACK_MARGIN -
    Math.max(0, containerRows - 1) *
      (CONTAINER_DEPTH + CONTAINER_GAP);

  const boxes: AtlasBox[] = [];
  let containers = 0;
  let sheets = 0;

  // Suelo, paredes y techo: todas las escalas comparten la misma sala.
  const roomHeight = Math.max(
    17,
    fileWallHeight + 4,
    maxFolderHeight + 9
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
  // Sin techo: la sala se abre por arriba y la profundidad se lee mejor.
  for (const side of [-1, 1]) {
    boxes.push({
      path: null,
      role: "furniture",
      x: side * (width / 2 + 0.2),
      y: roomHeight - 2.8,
      z: fileNodes.length ? shelfCenterZ : depth / 2,
      width: 0.12,
      depth: Math.max(2.5, sideShelfWidth),
      height: 0.12,
      color: input.lightColor,
      selectable: false
    });
  }
  // El nombre de la escala vive en un cartel centrado en la pared de fondo.
  const signWidth = Math.min(16, Math.max(8, width * 0.38));
  const signHeight = 1.8;
  const signY = Math.max(6.5, roomHeight * 0.55);
  boxes.push({
    path: null,
    role: "furniture",
    x: 0,
    y: signY - 0.15,
    z: depth + 0.52,
    width: signWidth + 0.5,
    depth: 0.08,
    height: signHeight + 0.3,
    color: input.trimColor,
    selectable: false
  });
  boxes.push({
    path: null,
    role: "sign",
    x: 0,
    y: signY,
    z: depth + 0.42,
    width: signWidth,
    depth: 0.12,
    height: signHeight,
    color: input.furnitureColor,
    selectable: false,
    label: title
  });

  // Pantalla de métricas: una tabla alargada sobre el cartel, en la pared de
  // fondo. Son cifras del ámbito abierto, no del HUD.
  const metricRows = input.metrics ?? [];
  if (metricRows.length > 0) {
    const tableWidth = Math.min(24, width * 0.62);
    const tableHeight = 1.1 + metricRows.length * 0.8;
    const tableY = Math.min(
      roomHeight - tableHeight - 0.6,
      signY + signHeight + 1.5
    );
    boxes.push({
      path: null,
      role: "furniture",
      x: 0,
      y: tableY - 0.08,
      z: depth + 0.49,
      width: tableWidth + 0.16,
      depth: 0.07,
      height: tableHeight + 0.16,
      color: input.trimColor,
      selectable: false
    });
    boxes.push({
      path: null,
      role: "metric",
      x: 0,
      y: tableY,
      z: depth + 0.41,
      width: tableWidth,
      depth: 0.1,
      height: tableHeight,
      color: input.furnitureColor,
      selectable: true,
      label: "Métricas",
      metricRows
    });
  }

  // Pasillo central: una guía de suelo entre la estantería delantera y los
  // archivadores del fondo.
  const aisleFront = SHELF_FRONT_Z + 1.5;
  const aisleBack = containerStartZ - CONTAINER_DEPTH / 2 - 1.5;
  const aisleDepth = Math.max(4, aisleBack - aisleFront);
  const aisleWidth = Math.min(8, Math.max(4, width * 0.12));
  const aisleZ = (aisleFront + aisleBack) / 2;
  // Dos filetes de suelo, no una losa: guían el pasillo sin tapar la baldosa.
  for (const side of [-1, 1]) {
    boxes.push({
      path: null,
      role: "furniture",
      x: side * (aisleWidth / 2),
      y: 0.015,
      z: aisleZ,
      width: 0.14,
      depth: aisleDepth,
      height: 0.06,
      color: input.trimColor,
      selectable: false
    });
  }

  // Los archivadores se ordenan en una retícula centrada en la sala.
  const containerStartX = -containerGridWidth / 2 + CONTAINER_WIDTH / 2;
  for (let index = 0; index < folders.length; index++) {
    const node = folders[index] as TreeNode;
    const column = index % containerColumns;
    const row = Math.floor(index / containerColumns);
    const x = containerStartX + column * (CONTAINER_WIDTH + CONTAINER_GAP);
    const z =
      containerStartZ + row * (CONTAINER_DEPTH + CONTAINER_GAP);
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

      // Listón de pared: la estantería se apoya en él y queda abierta por los
      // dos lados, sin tapas que oculten las hojas.
      boxes.push({
        path: null,
        role: "furniture",
        x: side * (width / 2 + 0.1),
        y: 0,
        z: shelfCenterZ,
        width: 0.1,
        depth: shelfWidth,
        height: fileWallHeight,
        color: input.trimColor,
        selectable: false
      });
      for (let row = 0; row < sideFileRows; row++) {
        boxes.push({
          path: null,
          role: "furniture",
          x: shelfX,
          y: SHEET_BASE_Y + row * SHEET_ROW_HEIGHT - 0.35,
          z: shelfCenterZ,
          width: SHELF_DEPTH,
          depth: shelfWidth,
          height: SHELF_THICKNESS,
          color: input.furnitureColor,
          selectable: false
        });
      }
      // Tira de luz sobre la estantería: ayuda a leer los cantos y separa la
      // estantería de la pared.
      boxes.push({
        path: null,
        role: "furniture",
        x: shelfX,
        y: fileWallHeight - 0.5,
        z: shelfCenterZ,
        width: SHELF_DEPTH,
        depth: shelfWidth,
        height: 0.08,
        color: input.lightColor,
        selectable: false
      });

      // La estantería se llena desde la boca de la sala hacia dentro.
      // La estantería se llena desde el fondo de la tabla hacia el frente.
      const startZ =
        shelfCenterZ + sideShelfWidth / 2 - SHEET_WIDTH / 2;
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
          z: startZ - column * (SHEET_WIDTH + SHEET_GAP_X),
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
