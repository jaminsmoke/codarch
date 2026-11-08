import type { Point } from "./orbit";
import type { DrawnBox } from "./volumes";

/**
 * La matemática de la cámara y el picking ✓.
 *
 * Todo es puro ✓ (sin WebGL ✓, sin DOM ✓): se puede probar en Node ✓. El
 * renderizador solo sube estas matrices a la GPU ✓ y usa el rayo para saber
 * qué caja se ha pulsado ✓.
 */

/** Una matriz 4×4 en columnas ✓, como la espera WebGL ✓. */
export type Mat4 = Float32Array;

const sub = (a: Point, b: Point): Point => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z
});

const dot = (a: Point, b: Point): number => a.x * b.x + a.y * b.y + a.z * b.z;

const cross = (a: Point, b: Point): Point => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x
});

/** Un vector unitario ✓ (si no hay longitud, devuelve el original ✓). */
export function normalize(vector: Point): Point {
  const length = Math.hypot(vector.x, vector.y, vector.z);
  if (length === 0 || !Number.isFinite(length)) return { ...vector };
  return { x: vector.x / length, y: vector.y / length, z: vector.z / length };
}

/** La proyección en perspectiva ✓ (campo de visión vertical ✓, en radianes ✓). */
export function perspective(
  fovY: number,
  aspect: number,
  near: number,
  far: number
): Mat4 {
  const f = 1 / Math.tan(Math.max(0.01, fovY) / 2);
  const safeAspect = Math.max(0.01, aspect);
  const range = near - far;
  const matrix = new Float32Array(16);
  matrix[0] = f / safeAspect;
  matrix[5] = f;
  matrix[10] = (far + near) / range;
  matrix[11] = -1;
  matrix[14] = (2 * far * near) / range;
  return matrix;
}

/**
 * La vista de una cámara que mira a `target` desde `eye` ✓.
 *
 * `up` es la referencia de arriba ✓ (el eje Y ✓): con la órbita del plugin
 * nunca se llega a mirar en vertical ✓, así que no hay caso degenerado ✓.
 */
export function lookAt(
  eye: Point,
  target: Point,
  up: Point = { x: 0, y: 1, z: 0 }
): Mat4 {
  const back = normalize(sub(eye, target));
  let right = normalize(cross(up, back));
  if (right.x === 0 && right.y === 0 && right.z === 0) {
    // Mirando justo en vertical: se elige cualquier derecha perpendicular.
    right = normalize(cross({ x: 0, y: 0, z: 1 }, back));
  }
  const trueUp = cross(back, right);

  const matrix = new Float32Array(16);
  matrix[0] = right.x;
  matrix[1] = trueUp.x;
  matrix[2] = back.x;
  matrix[3] = 0;
  matrix[4] = right.y;
  matrix[5] = trueUp.y;
  matrix[6] = back.y;
  matrix[7] = 0;
  matrix[8] = right.z;
  matrix[9] = trueUp.z;
  matrix[10] = back.z;
  matrix[11] = 0;
  matrix[12] = -dot(right, eye);
  matrix[13] = -dot(trueUp, eye);
  matrix[14] = -dot(back, eye);
  matrix[15] = 1;
  return matrix;
}

/** Un rayo de la escena ✓. */
export interface Ray {
  origin: Point;
  direction: Point;
}

/**
 * El rayo que pasa por un punto de la pantalla ✓.
 *
 * `ndcX` y `ndcY` van de −1 a 1 ✓ (el origen es el centro ✓, la Y crece hacia
 * arriba ✓). Sale de la cámara ✓, no del plano cercano ✓: así la distancia que
 * devuelve el choque es la real ✓.
 */
export function rayFromNdc(
  eye: Point,
  target: Point,
  ndcX: number,
  ndcY: number,
  fovY: number,
  aspect: number
): Ray {
  const forward = normalize(sub(target, eye));
  const right = normalize(cross(forward, { x: 0, y: 1, z: 0 }));
  const up = cross(right, forward);
  const tan = Math.tan(Math.max(0.01, fovY) / 2);
  const direction = normalize({
    x: forward.x + right.x * ndcX * tan * aspect + up.x * ndcY * tan,
    y: forward.y + right.y * ndcX * tan * aspect + up.y * ndcY * tan,
    z: forward.z + right.z * ndcX * tan * aspect + up.z * ndcY * tan
  });
  return { origin: { ...eye }, direction };
}

/** Lo que ocupa una caja en el mundo ✓. */
function boundsOfBox(box: DrawnBox): { min: Point; max: Point } {
  return {
    min: { x: box.x, y: box.y, z: box.z },
    max: {
      x: box.x + Math.max(box.width, 0.001),
      y: box.y + Math.max(box.height, 0.001),
      z: box.z + Math.max(box.depth, 0.001)
    }
  };
}

/**
 * A qué distancia el rayo entra en la caja ✓, o `null` si no la toca ✓.
 *
 * Es el método de las losas ✓ (slab ✓): se recorta el rayo contra los seis
 * planos de la caja ✓ y, si queda un tramo delante ✓, hay choque ✓.
 */
export function rayBoxDistance(ray: Ray, box: DrawnBox): number | null {
  const { min, max } = boundsOfBox(box);
  let near = -Infinity;
  let far = Infinity;

  const axes: Array<keyof Point> = ["x", "y", "z"];
  for (const axis of axes) {
    const origin = ray.origin[axis];
    const direction = ray.direction[axis];
    if (Math.abs(direction) < 1e-9) {
      // Paralelo al plano: o está dentro de la losa o no la toca nunca ✓.
      if (origin < min[axis] || origin > max[axis]) return null;
      continue;
    }
    let first = (min[axis] - origin) / direction;
    let second = (max[axis] - origin) / direction;
    if (first > second) [first, second] = [second, first];
    near = Math.max(near, first);
    far = Math.min(far, second);
    if (near > far) return null;
  }

  if (far < 0) return null;
  return near >= 0 ? near : far;
}

/** La caja más cercana que toca el rayo ✓ (su índice ✓), o `null` ✓. */
export function pickBox(ray: Ray, boxes: readonly DrawnBox[]): number | null {
  let best: number | null = null;
  let bestDistance = Infinity;
  for (let index = 0; index < boxes.length; index++) {
    const distance = rayBoxDistance(ray, boxes[index] as DrawnBox);
    if (distance !== null && distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  }
  return best;
}
