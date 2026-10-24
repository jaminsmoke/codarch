// Solo tipos: este módulo no arrastra three ✓ (así su matemática se prueba en
// Node, sin GPU ✓).
import type { PerspectiveCamera } from "three/webgpu";

/**
 * La cámara del 3D: orbitar y acercarse.
 *
 * Es propia del plugin a propósito ✓: `OrbitControls` importa el build de
 * WebGL de three ✓ (`three`), y este plugin usa el build de WebGPU ✓
 * (`three/webgpu`) ✓. Con los dos, el chunk del plugin lleva three **dos
 * veces** ✓ y engorda sin dibujar una caja más ✓.
 *
 * La matemática va aparte ✓ (`orbitPosition` ✓, `clampOrbit` ✓) para poder
 * probarla sin GPU ✓.
 */

/** Dónde está la cámara: ángulo horizontal, ángulo desde arriba y distancia. */
export interface OrbitState {
  /** El ángulo alrededor del eje Y, en radianes. */
  azimuth: number;
  /** El ángulo desde arriba, en radianes (0 es mirar desde el cenit). */
  polar: number;
  /** La distancia al objetivo. */
  distance: number;
}

/** Los límites de la cámara. */
export interface OrbitLimits {
  minDistance: number;
  maxDistance: number;
  minPolar: number;
  maxPolar: number;
}

/** Los límites por defecto: ni pegarse a una caja ni salirse del mapa ✓. */
export const ORBIT_LIMITS: OrbitLimits = {
  minDistance: 60,
  maxDistance: 1600,
  minPolar: 0.12,
  /** Un poco antes del horizonte ✓: desde abajo, el mapa no se lee ✓. */
  maxPolar: Math.PI / 2.05
};

/** La vista con la que abre la escena ✓ (antes la de `OrbitControls` ✓). */
export const ORBIT_START: OrbitState = {
  azimuth: -0.6018,
  polar: 0.9813,
  distance: 467.3
};

/**
 * La distancia a la que cabe un mapa de este radio, en una pantalla de este
 * campo de visión ✓.
 *
 * Encaja la **esfera** que envuelve el mapa ✓ (la diagonal de su base y su
 * altura ✓), así que vale para cualquier ángulo de cámara ✓: no hay que
 * repetir el cálculo al orbitar ✓. Se cumplen los dos campos de visión ✓ (el
 * vertical y el horizontal ✓) y se deja un aire ✓.
 */
export function fitDistance(
  radius: number,
  fov: number,
  aspect: number,
  margin = 1.08
): number {
  const safeRadius = Math.max(1, radius);
  const safeFov = Math.min(Math.max(fov, 0.2), Math.PI - 0.2);
  const safeAspect = Math.max(0.2, aspect);
  const vertical = safeRadius / Math.sin(safeFov / 2);
  const horizontalFov = 2 * Math.atan(Math.tan(safeFov / 2) * safeAspect);
  const horizontal = safeRadius / Math.sin(Math.min(horizontalFov, Math.PI - 0.2) / 2);
  return Math.max(vertical, horizontal) * margin;
}

/** Un punto de la escena ✓ (vale un `THREE.Vector3` ✓: es la misma forma ✓). */
export interface Point {
  x: number;
  y: number;
  z: number;
}

/** La posición de la cámara para un estado de la órbita. */
export function orbitPosition(state: OrbitState, target: Point): Point {
  const radius = Math.sin(state.polar) * state.distance;
  return {
    x: target.x + radius * Math.sin(state.azimuth),
    y: target.y + Math.cos(state.polar) * state.distance,
    z: target.z + radius * Math.cos(state.azimuth)
  };
}

/** El estado dentro de los límites ✓. */
export function clampOrbit(
  state: OrbitState,
  limits: OrbitLimits = ORBIT_LIMITS
): OrbitState {
  return {
    // El ángulo no se recorta ✓: las vueltas enteras son la misma vista ✓.
    azimuth: state.azimuth,
    polar: Math.min(Math.max(state.polar, limits.minPolar), limits.maxPolar),
    distance: Math.min(
      Math.max(state.distance, limits.minDistance),
      limits.maxDistance
    )
  };
}

/** Un paso de amortiguación hacia el estado deseado ✓ (0 = quieto ✓, 1 = seco ✓). */
export function dampOrbit(
  current: OrbitState,
  desired: OrbitState,
  damping: number
): OrbitState {
  const step = Math.min(Math.max(damping, 0), 1);
  return {
    azimuth: current.azimuth + (desired.azimuth - current.azimuth) * step,
    polar: current.polar + (desired.polar - current.polar) * step,
    distance: current.distance + (desired.distance - current.distance) * step
  };
}

export interface OrbitControlsOptions {
  /** Se llama al pulsar sin arrastrar ✓: ahí se selecciona ✓. */
  onTap?: (clientX: number, clientY: number) => void;
  /** Se llama cuando la cámara tiene algo nuevo que dibujar ✓. */
  onChange?: () => void;
  /** El amortiguado por fotograma ✓ (0,18 por defecto ✓). */
  damping?: number;
  /** Con qué vista abre ✓ (por defecto, `ORBIT_START` ✓). */
  start?: OrbitState;
  /** Alrededor de qué punto orbita ✓ (por defecto, el origen ✓). */
  target?: Point;
  /** Hasta dónde se puede acercar y alejar ✓. */
  limits?: OrbitLimits;
}

export interface OrbitControls {
  /** Mueve la cámara un paso ✓: dice si ha cambiado algo ✓. */
  update(): boolean;
  /** Suelta los eventos ✓. */
  dispose(): void;
}

/** Cuánto se gira por píxel, y cuánto se puede mover el ratón y seguir siendo un clic. */
const ROTATE_SPEED = 0.005;
const TAP_SLOP = 5;
const ZOOM_SPEED = 0.0015;

/**
 * Monta la cámara orbital en un canvas ✓.
 *
 * Un puntero arrastra ✓ (orbita ✓) y la rueda acerca ✓; dos dedos hacen pinza ✓
 * (zoom en pantalla táctil ✓). El objetivo es el centro del mapa ✓.
 */
export function createOrbitControls(
  camera: PerspectiveCamera,
  canvas: HTMLElement,
  options: OrbitControlsOptions = {}
): OrbitControls {
  const target: Point = options.target ?? { x: 0, y: 0, z: 0 };
  const limits = options.limits ?? ORBIT_LIMITS;
  const desired: OrbitState = { ...(options.start ?? ORBIT_START) };
  let current: OrbitState = { ...desired };
  const damping = options.damping ?? 0.18;

  const pointers = new Map<number, { x: number; y: number }>();
  let pinchSpan = 0;
  let tap: { x: number; y: number } | null = null;
  let travel = 0;

  const span = (): number => {
    const [first, second] = [...pointers.values()];
    if (!first || !second) return 0;
    return Math.hypot(first.x - second.x, first.y - second.y);
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // Un puntero que ya no existe (o un canvas que se va): no pasa nada.
    }
    if (pointers.size === 1) {
      tap = { x: event.clientX, y: event.clientY };
      travel = 0;
    } else {
      // Con dos dedos ya no hay clic ✓: hay pinza ✓.
      tap = null;
      pinchSpan = span();
    }
  };

  const onPointerMove = (event: PointerEvent): void => {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size === 1) {
      desired.azimuth -= dx * ROTATE_SPEED;
      desired.polar = clampOrbit(
        { ...desired, polar: desired.polar - dy * ROTATE_SPEED },
        limits
      ).polar;
      travel += Math.abs(dx) + Math.abs(dy);
      options.onChange?.();
      return;
    }

    if (pointers.size === 2) {
      const next = span();
      if (pinchSpan > 0 && next > 0) {
        desired.distance = clampOrbit(
          { ...desired, distance: desired.distance * (pinchSpan / next) },
          limits
        ).distance;
      }
      pinchSpan = next;
      options.onChange?.();
    }
  };

  const onPointerUp = (event: PointerEvent): void => {
    pointers.delete(event.pointerId);
    if (pointers.size === 0) {
      if (tap && travel <= TAP_SLOP) options.onTap?.(event.clientX, event.clientY);
      tap = null;
      pinchSpan = 0;
      return;
    }
    pinchSpan = pointers.size === 2 ? span() : 0;
  };

  const onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    // La rueda no siempre habla en píxeles ✓: hay navegadores y ruedas que
    // mandan líneas o páginas ✓ (deltaMode 1 y 2 ✓) ✓.
    const delta =
      event.deltaMode === 1
        ? event.deltaY * 16
        : event.deltaMode === 2
          ? event.deltaY * 400
          : event.deltaY;
    desired.distance = clampOrbit(
      { ...desired, distance: desired.distance * Math.exp(delta * ZOOM_SPEED) },
      limits
    ).distance;
    options.onChange?.();
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  return {
    update(): boolean {
      const previous = current;
      current = dampOrbit(current, desired, damping);
      const position = orbitPosition(current, target);
      camera.position.set(position.x, position.y, position.z);
      camera.lookAt(target.x, target.y, target.z);
      // Quieto no hay fotograma: solo se sigue dibujando mientras la cámara se mueve.
      return (
        Math.abs(current.azimuth - previous.azimuth) > 1e-5 ||
        Math.abs(current.polar - previous.polar) > 1e-5 ||
        Math.abs(current.distance - previous.distance) > 1e-4
      );
    },
    dispose(): void {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
    }
  };
}
