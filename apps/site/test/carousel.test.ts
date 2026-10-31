import { describe, expect, it } from "vitest";
import {
  flightDuration,
  nearest,
  project,
  velocity
} from "../src/lib/carousel";

describe("la velocity del gesto", () => {
  it("sale de las muestras que caben en la ventana", () => {
    expect(
      velocity([
        { x: 0, t: 1000 },
        { x: 30, t: 1050 },
        { x: 60, t: 1100 }
      ])
    ).toBeCloseTo(0.6);
  });

  it("no se dispara con un gesto brusco", () => {
    expect(
      velocity([
        { x: 0, t: 0 },
        { x: 900, t: 100 }
      ])
    ).toBe(3);
    expect(
      velocity([
        { x: 900, t: 0 },
        { x: 0, t: 100 }
      ])
    ).toBe(-3);
  });

  it("es cero cuando no hay gesto que medir", () => {
    expect(velocity([])).toBe(0);
    expect(velocity([{ x: 40, t: 10 }])).toBe(0);
    expect(
      velocity([
        { x: 0, t: 10 },
        { x: 80, t: 10 }
      ])
    ).toBe(0);
  });
});

describe("la inercia", () => {
  it("deja el gesto donde estaba si se suelta parado", () => {
    expect(project(40, 0)).toBe(40);
  });

  it("añade un tramo a favor del gesto", () => {
    expect(project(40, 1)).toBe(190);
    expect(project(40, -1)).toBe(-110);
  });

  it("tiene tope, por mucho que se empuje", () => {
    expect(project(0, 10)).toBe(280);
    expect(project(0, -10)).toBe(-280);
  });
});

describe("el imán", () => {
  it("elige la pastilla más cercana al punto proyectado", () => {
    expect(nearest([-110, 0, 110], -80, 1)).toBe(0);
    expect(nearest([-110, 0, 110], 40, 1)).toBe(1);
    expect(nearest([-110, 0, 110], 130, 1)).toBe(2);
  });

  it("con dos igual de cerca se queda con la primera", () => {
    expect(nearest([0, 100], 50, 1)).toBe(0);
  });

  it("sin pastillas que medir se queda donde estaba", () => {
    expect(nearest([], 300, 2)).toBe(2);
  });
});

describe("la duración del vuelo", () => {
  it("no baja del mínimo aunque no haya que moverse", () => {
    expect(flightDuration(0)).toBe(260);
  });

  it("crece con el recorrido hasta el tope", () => {
    expect(flightDuration(200)).toBe(310);
    expect(flightDuration(-200)).toBe(310);
    expect(flightDuration(5000)).toBe(480);
  });
});
