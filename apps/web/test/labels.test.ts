import { describe, expect, it } from "vitest";
import { cut, fitLabel } from "../src/labels";

describe("el nombre de un bloque", () => {
  it("cabe en horizontal cuando el bloque es ancho", () => {
    const fitted = fitLabel("App.tsx", { width: 120, height: 20 });
    expect(fitted?.rotate).toBe(false);
    expect(fitted?.text).toBe("App.tsx");
    expect(fitted?.size).toBeGreaterThan(8);
  });

  it("se gira en un bloque alto y estrecho", () => {
    const fitted = fitLabel("parseDiff", { width: 18, height: 120 });
    expect(fitted?.rotate).toBe(true);
    expect(fitted?.text.length).toBeGreaterThan(3);
  });

  it("se achica en un bloque pequeño, pero se dibuja", () => {
    const fitted = fitLabel("App.tsx", { width: 30, height: 12 });
    expect(fitted).not.toBeNull();
    expect(fitted?.size).toBeLessThan(10);
  });

  it("no se dibuja en un bloque que no da para nada", () => {
    expect(fitLabel("App.tsx", { width: 8, height: 6 })).toBeNull();
  });

  it("el texto nunca se sale del bloque", () => {
    const casos = [
      { name: "check-action.mjs", width: 40, height: 18 },
      { name: "check-action.mjs", width: 18, height: 60 },
      { name: "un-nombre-larguisimo-de-verdad.ts", width: 90, height: 16 },
      { name: "x.ts", width: 25, height: 25 }
    ];
    for (const caso of casos) {
      const fitted = fitLabel(caso.name, { width: caso.width, height: caso.height });
      if (!fitted) continue;
      const ancho = fitted.text.length * fitted.size * 0.6;
      const disponible = fitted.rotate
        ? caso.height - 6
        : caso.width - 6;
      expect(ancho, `${caso.name} en ${caso.width}x${caso.height}`).toBeLessThanOrEqual(
        disponible
      );
    }
  });

  it("si no cabe el nombre entero, se quita la extensión", () => {
    expect(cut("App.tsx", 3)).toBe("App");
    expect(cut("App.tsx", 10)).toBe("App.tsx");
    expect(cut("check-action.mjs", 8)).toBe("check-a…");
  });
});
