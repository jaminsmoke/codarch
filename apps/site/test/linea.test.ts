import { describe, expect, it } from "vitest";
import { bandaDeLectura, pasoEnBanda } from "../src/lib/linea";

describe("la banda de la línea de tiempo", () => {
  it("usa el borde de la cabecera, no un porcentaje del viewport", () => {
    expect(bandaDeLectura(112, 900)).toBe(128);
  });

  it("sin cabecera medida, cae al porcentaje de siempre", () => {
    expect(bandaDeLectura(null, 900)).toBe(288);
  });

  it("elige el último paso que cruzó la banda", () => {
    const pasos = [
      { clave: "21", top: -400 },
      { clave: "22", top: 120 },
      { clave: "23", top: 500 }
    ];

    expect(pasoEnBanda(pasos, 128, "21")).toBe("22");
  });

  it("si ninguno cruzó la banda, deja el primero", () => {
    expect(
      pasoEnBanda(
        [
          { clave: "21", top: 300 },
          { clave: "22", top: 900 }
        ],
        128,
        "21"
      )
    ).toBe("21");
  });

  it("un paso que no se pudo medir no gana", () => {
    expect(
      pasoEnBanda(
        [
          { clave: "21", top: -10 },
          { clave: "22", top: Number.POSITIVE_INFINITY }
        ],
        128,
        "21"
      )
    ).toBe("21");
  });
});
