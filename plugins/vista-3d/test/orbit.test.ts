import { describe, expect, it } from "vitest";
import {
  clampOrbit,
  dampOrbit,
  orbitPosition,
  ORBIT_LIMITS,
  ORBIT_START,
  type Point
} from "../orbit";

const distance = (a: Point, b: Point): number =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

describe("la cámara del 3D", () => {
  const origin: Point = { x: 0, y: 0, z: 0 };

  it("abre en la misma vista que abría OrbitControls", () => {
    const position = orbitPosition(ORBIT_START, origin);
    expect(position.x).toBeCloseTo(-220, 0);
    expect(position.y).toBeCloseTo(260, 0);
    expect(position.z).toBeCloseTo(320, 0);
  });

  it("orbita alrededor del objetivo sin cambiar la distancia", () => {
    const target: Point = { x: 30, y: 0, z: -10 };
    const turned = orbitPosition(
      { ...ORBIT_START, azimuth: ORBIT_START.azimuth + Math.PI / 2 },
      target
    );
    expect(distance(orbitPosition(ORBIT_START, target), target)).toBeCloseTo(
      ORBIT_START.distance,
      5
    );
    expect(distance(turned, target)).toBeCloseTo(ORBIT_START.distance, 5);
  });

  it("no deja mirar el mapa desde debajo del suelo", () => {
    expect(clampOrbit({ ...ORBIT_START, polar: 3 }).polar).toBe(
      ORBIT_LIMITS.maxPolar
    );
    expect(clampOrbit({ ...ORBIT_START, polar: -3 }).polar).toBe(
      ORBIT_LIMITS.minPolar
    );
  });

  it("no deja salirse del mapa ni quedarse dentro de una caja", () => {
    expect(clampOrbit({ ...ORBIT_START, distance: 99999 }).distance).toBe(
      ORBIT_LIMITS.maxDistance
    );
    expect(clampOrbit({ ...ORBIT_START, distance: 1 }).distance).toBe(
      ORBIT_LIMITS.minDistance
    );
  });

  it("deja el ángulo sin recortar: dar la vuelta es la misma vista", () => {
    expect(clampOrbit({ ...ORBIT_START, azimuth: 12 }).azimuth).toBe(12);
    expect(clampOrbit({ ...ORBIT_START, azimuth: -12 }).azimuth).toBe(-12);
  });

  it("amortigua hacia el deseado y llega con 1", () => {
    const desired = { ...ORBIT_START, distance: ORBIT_START.distance + 100 };
    const half = dampOrbit(ORBIT_START, desired, 0.5);
    expect(half.distance).toBeCloseTo(ORBIT_START.distance + 50, 5);

    const reached = dampOrbit(ORBIT_START, desired, 1);
    expect(reached.distance).toBe(desired.distance);
    expect(dampOrbit(ORBIT_START, desired, 0.5).azimuth).toBeCloseTo(
      ORBIT_START.azimuth,
      5
    );
  });
});
