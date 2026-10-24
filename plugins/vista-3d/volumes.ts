import { layoutMap, type TreeNode } from "@codarch/render/browser";

/**
 * Los volúmenes de la escena y su nivel de detalle.
 *
 * Un repo de 20.000 ficheros no puede ser 20.000 cajas ✓: son 20.000
 * primitivas ✓ y el mapa se arrastra ✓. Así que la escena es un **árbol** ✓:
 * una caja por carpeta cuando está plegada ✓, y sus hijos dentro cuando se
 * abre ✓. Como el mapa es 2D (x, z) con la altura encima ✓, esto es un
 * **quadtree** ✓, no un octree ✓ (la hoja de ruta lo llamaba octree ✓).
 *
 * Quién se abre lo decide la **pantalla** ✓: una carpeta que mide menos de
 * unos píxeles no se abre ✓ (no se vería nada dentro ✓), y hay un presupuesto
 * de primitivas ✓. Al acercarte, la carpeta ocupa más y se abre sola ✓; al
 * alejarte, se cierra ✓. Eso es el **LOD** ✓.
 *
 * Todo es puro ✓ (sin three ✓, sin DOM ✓): se puede probar en Node ✓.
 */

/** Un nodo del árbol: una carpeta (con hijos) o un fichero (hoja). */
export interface Volume {
  path: string;
  kind: "file" | "folder";
  /** La base, en coordenadas del mapa. */
  x: number;
  z: number;
  width: number;
  depth: number;
  /** La altura de su caja cuando está **plegado** ✓. */
  height: number;
  color: string;
  /** El área de su rectángulo, para ordenar y para medir en pantalla. */
  area: number;
  children: Volume[];
}

/** Lo que hace falta para construir el árbol (el `RenderModel`, recortado ✓). */
export interface VolumeInput {
  roots: readonly TreeNode[];
  files: readonly { risk: number }[];
  /** El color de un fichero, el del mapa ✓. */
  colorFor: (fileIndex: number) => string;
  /** El color de una carpeta que no se pudo abrir al distribuir el mapa ✓. */
  fallbackColor: string;
  width?: number;
  height?: number;
}

/** La base de un fichero ✓ y lo que sube con el riesgo ✓ (como en 2D ✓). */
const FILE_BASE = 2;
const FILE_RISK = 90;
/** Lo que se levanta el suelo de una carpeta abierta ✓. */
export const SLAB_HEIGHT = 1.4;

/** El árbol de volúmenes del mapa ✓. */
export function buildVolumes(input: VolumeInput): Volume[] {
  const placed = layoutMap(input.roots, input.width, input.height);
  return placed.map((node) => volumeOf(node, input));
}

type Placed = ReturnType<typeof layoutMap>[number];

function volumeOf(placed: Placed, input: VolumeInput): Volume {
  const { node, rect } = placed;
  const area = Math.max(1, rect.w * rect.h);
  // Ordenar por área hace el recorte del presupuesto **determinista** ✓: si no
  // cabe todo, se abre primero lo grande ✓.
  const children = (placed.children ?? [])
    .map((child) => volumeOf(child, input))
    .sort((a, b) => b.area - a.area || a.path.localeCompare(b.path));

  if (node.kind === "file" && node.fileIndex !== undefined) {
    const file = input.files[node.fileIndex];
    return {
      path: node.path,
      kind: "file",
      x: rect.x,
      z: rect.y,
      width: rect.w,
      depth: rect.h,
      height: FILE_BASE + (file?.risk ?? 0) * FILE_RISK,
      color: input.colorFor(node.fileIndex),
      area,
      children: []
    };
  }

  // Una carpeta plegada enseña lo que tiene dentro: la altura de su caja es la
  // del hijo más alto ✓ y su color, el del hijo más grande ✓.
  const tallest = children.reduce((max, child) => Math.max(max, child.height), 0);
  return {
    path: node.path,
    kind: "folder",
    x: rect.x,
    z: rect.y,
    width: rect.w,
    depth: rect.h,
    height:
      tallest > 0
        ? Math.max(SLAB_HEIGHT * 2, tallest)
        : Math.max(6, Math.log2(node.fileCount + 1) * 4),
    color: children[0]?.color ?? input.fallbackColor,
    area,
    children
  };
}

/** Dónde está la cámara ✓ (vale un `THREE.Vector3` ✓). */
export interface CameraPoint {
  x: number;
  y: number;
  z: number;
}

export interface LodOptions {
  camera: CameraPoint;
  /** El alto del lienzo, en píxeles ✓. */
  viewportHeight: number;
  /** El campo de visión vertical, en radianes ✓. */
  fov: number;
  /** Cuántos píxeles tiene que medir una carpeta para abrirse ✓. */
  minPixels?: number;
  /**
   * Cuántas primitivas como mucho ✓.
   *
   * Es un presupuesto **blando** ✓: una carpeta solo se abre si caben su
   * suelo y todos sus hijos ✓; si no, se queda plegada ✓ (una caja ✓). Lo que
   * se pasa del presupuesto son los suelos de las carpetas ya abiertas ✓.
   */
  budget?: number;
}

/** Una caja que se dibuja ✓. */
export interface DrawnBox {
  path: string;
  kind: "file" | "folder";
  /** La base de la caja ✓. */
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  color: string;
  /** Una carpeta plegada ✓: dentro hay más ✓. */
  collapsed: boolean;
}

const DEFAULT_BUDGET = 1200;
const DEFAULT_MIN_PIXELS = 22;

/** Las cajas que se dibujan con la cámara de ahora ✓. */
export function lodBoxes(
  roots: readonly Volume[],
  options: LodOptions
): DrawnBox[] {
  const drawn: DrawnBox[] = [];
  const budget = Math.max(1, options.budget ?? DEFAULT_BUDGET);
  const minPixels = Math.max(0, options.minPixels ?? DEFAULT_MIN_PIXELS);
  const tan = Math.tan(Math.max(0.01, options.fov) / 2);
  const viewport = Math.max(1, options.viewportHeight);

  const visit = (volume: Volume): void => {
    const isBranch = volume.kind === "folder" && volume.children.length > 0;

    if (!isBranch) {
      drawn.push(boxOf(volume, false, volume.height));
      return;
    }

    // ¿Cabe el detalle en pantalla? Se mide la carpeta por el lado de su área:
    // así una tira larga y fina no se abre por ser larga ✓.
    const distance = Math.max(
      1,
      Math.hypot(
        volume.x + volume.width / 2 - options.camera.x,
        volume.height / 2 - options.camera.y,
        volume.z + volume.depth / 2 - options.camera.z
      )
    );
    const pixels = (Math.sqrt(volume.area) * viewport) / (2 * distance * tan);
    // Solo se abre si caben su suelo y **todos** sus hijos ✓: así una carpeta
    // con 5.000 ficheros no se abre a medias ✓ ni deja agujeros ✓.
    const room = budget - drawn.length;
    if (pixels < minPixels || room < volume.children.length + 1) {
      drawn.push(boxOf(volume, true, 0));
      return;
    }

    // La carpeta abierta deja su suelo y sus hijos encima ✓.
    drawn.push(boxOf(volume, false, SLAB_HEIGHT));
    for (const child of volume.children) visit(child);
  };

  for (const root of roots) visit(root);
  return drawn;
}

function boxOf(volume: Volume, collapsed: boolean, height: number): DrawnBox {
  return {
    path: volume.path,
    kind: volume.kind,
    x: volume.x,
    y: 0,
    z: volume.z,
    width: volume.width,
    depth: volume.depth,
    height: collapsed ? volume.height : height,
    color: volume.color,
    collapsed
  };
}

/** Cuántas primitivas salen con estos ajustes ✓ (para las pruebas y el aviso ✓). */
export function countVolumes(roots: readonly Volume[]): number {
  let total = 0;
  for (const root of roots) total += 1 + countVolumes(root.children);
  return total;
}
