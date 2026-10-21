import { describe, expect, it } from "vitest";
import { fitLabel } from "../src/labels";

describe("el nombre de un bloque", () => {
  it("se muestra entero, nunca recortado", () => {
    const fitted = fitLabel("check-action.mjs", { width: 120, height: 20 });
    expect(fitted?.text).toBe("check-action.mjs");
    expect(fitted?.rotate).toBe(false);
    expect(fitted?.size).toBeGreaterThan(8);
  });

  it("se gira en un bloque alto y estrecho", () => {
    const fitted = fitLabel("parseDiff", { width: 18, height: 120 });
    expect(fitted?.rotate).toBe(true);
    expect(fitted?.text).toBe("parseDiff");
  });

  it("se gira incluso en una astilla de dos píxeles", () => {
    const fitted = fitLabel("check-action.mjs", { width: 2, height: 122 });
    expect(fitted).not.toBeNull();
    expect(fitted?.text).toBe("check-action.mjs");
    expect(fitted?.rotate).toBe(true);
  });

  it("se encoge para que el nombre entero quepa", () => {
    const fitted = fitLabel("bench-analyze.ts", { width: 44, height: 12 });
    expect(fitted?.text).toBe("bench-analyze.ts");
    expect(fitted?.size).toBeLessThan(9);
  });

  it("si no cabe cómodo, el nombre se encoge hasta entrar", () => {
    const fitted = fitLabel("un-nombre-larguisimo.ts", { width: 20, height: 8 });
    expect(fitted).not.toBeNull();
    // El nombre entero, a un tamaño diminuto ✓ (con el zoom se lee ✓).
    expect(fitted?.text).toBe("un-nombre-larguisimo.ts");
    expect(fitted?.size).toBeLessThan(4);
  });

  it("no se dibuja en un bloque de un píxel", () => {
    expect(fitLabel("App.tsx", { width: 20, height: 1 })).toBeNull();
  });

  it("el texto nunca se sale del bloque", () => {
    const casos = [
      { name: "check-action.mjs", width: 40, height: 18 },
      { name: "check-action.mjs", width: 18, height: 60 },
      { name: "check-action.mjs", width: 2, height: 122 },
      { name: "un-nombre-larguisimo-de-verdad.ts", width: 90, height: 16 },
      { name: "x.ts", width: 25, height: 25 },
      { name: "otra-cosa.ts", width: 30, height: 9 }
    ];
    for (const caso of casos) {
      const fitted = fitLabel(caso.name, {
        width: caso.width,
        height: caso.height
      });
      if (!fitted) continue;
      // El margen es proporcional al bloque (nunca más de su cuarta parte).
      const margen = Math.min(
        2,
        Math.floor(Math.min(caso.width, caso.height) / 4)
      );
      const disponible = fitted.rotate
        ? caso.height - margen * 2
        : caso.width - margen * 2;
      const ancho = fitted.text.length * fitted.size * 0.66;
      const real = fitted.length ?? ancho;
      expect(
        real,
        `${caso.name} en ${caso.width}x${caso.height}`
      ).toBeLessThanOrEqual(Math.max(1, disponible));
    }
  });
});
