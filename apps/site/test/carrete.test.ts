import { describe, expect, it } from "vitest";
import {
  duracionVuelo,
  masCercano,
  proyectar,
  velocidad
} from "../src/lib/carrete";

describe("la velocidad del gesto", () => {
  it("sale de las muestras que caben en la ventana", () => {
    expect(
      velocidad([
        { x: 0, t: 1000 },
        { x: 30, t: 1050 },
        { x: 60, t: 1100 }
      ])
    ).toBeCloseTo(0.6);
  });

  it("no se dispara con un gesto brusco", () => {
    expect(
      velocidad([
        { x: 0, t: 0 },
        { x: 900, t: 100 }
      ])
    ).toBe(3);
    expect(
      velocidad([
        { x: 900, t: 0 },
        { x: 0, t: 100 }
      ])
    ).toBe(-3);
  });

  it("es cero cuando no hay gesto que medir", () => {
    expect(velocidad([])).toBe(0);
    expect(velocidad([{ x: 40, t: 10 }])).toBe(0);
    expect(
      velocidad([
        { x: 0, t: 10 },
        { x: 80, t: 10 }
      ])
    ).toBe(0);
  });
});

describe("la inercia", () => {
  it("deja el gesto donde estaba si se suelta parado", () => {
    expect(proyectar(40, 0)).toBe(40);
  });

  it("añade un tramo a favor del gesto", () => {
    expect(proyectar(40, 1)).toBe(190);
    expect(proyectar(40, -1)).toBe(-110);
  });

  it("tiene tope, por mucho que se empuje", () => {
    expect(proyectar(0, 10)).toBe(280);
    expect(proyectar(0, -10)).toBe(-280);
  });
});

describe("el imán", () => {
  it("elige la pastilla más cercana al punto proyectado", () => {
    expect(masCercano([-110, 0, 110], -80, 1)).toBe(0);
    expect(masCercano([-110, 0, 110], 40, 1)).toBe(1);
    expect(masCercano([-110, 0, 110], 130, 1)).toBe(2);
  });

  it("con dos igual de cerca se queda con la primera", () => {
    expect(masCercano([0, 100], 50, 1)).toBe(0);
  });

  it("sin pastillas que medir se queda donde estaba", () => {
    expect(masCercano([], 300, 2)).toBe(2);
  });
});

describe("la duración del vuelo", () => {
  it("no baja del mínimo aunque no haya que moverse", () => {
    expect(duracionVuelo(0)).toBe(260);
  });

  it("crece con el recorrido hasta el tope", () => {
    expect(duracionVuelo(200)).toBe(310);
    expect(duracionVuelo(-200)).toBe(310);
    expect(duracionVuelo(5000)).toBe(480);
  });
});
