import { describe, expect, it } from "vitest";
import {
  advance,
  clipText,
  fitChars,
  GLYPH_GAP,
  GLYPH_HEIGHT,
  GLYPH_WIDTH,
  glyphRows,
  hasGlyph,
  textWidth
} from "../src/font";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const LOWER = "abcdefghijklmnopqrstuvwxyz".split("");
const DIGITS = "0123456789".split("");

/** Las filas de un glifo, como texto, para poder mirarlas en un fallo. */
function rowsOf(char: string): string[] {
  return glyphRows(char).map((row) => row.toString(2).padStart(GLYPH_WIDTH, "0"));
}

describe("la fuente de la captura", () => {
  it("dibuja mayúsculas, minúsculas y dígitos", () => {
    for (const char of [...LETTERS, ...LOWER, ...DIGITS]) {
      expect(hasGlyph(char), `falta el glifo de ${char}`).toBe(true);
      expect(rowsOf(char), `el glifo de ${char} no es de ${GLYPH_HEIGHT} filas`).toHaveLength(
        GLYPH_HEIGHT
      );
      // Un glifo con dibujo tiene tinta; el hueco es cosa de lo que no existe.
      expect(rowsOf(char).join(""), `el glifo de ${char} está vacío`).toMatch(/1/);
    }
  });

  it("distingue la mayúscula de la minúscula", () => {
    expect(rowsOf("a")).not.toEqual(rowsOf("A"));
    expect(rowsOf("g")).not.toEqual(rowsOf("G"));
  });

  it("deja el hueco de un carácter que no conoce, sin acortar la línea", () => {
    expect(hasGlyph("🐙")).toBe(false);
    expect(rowsOf("🐙").join("")).not.toMatch(/1/);
    expect(textWidth("a🐙a")).toBe(textWidth("aaa"));
  });

  it("mide una línea con su aire y sin el último hueco", () => {
    expect(advance()).toBe(GLYPH_WIDTH + GLYPH_GAP);
    expect(textWidth("")).toBe(0);
    expect(textWidth("a")).toBe(GLYPH_WIDTH);
    expect(textWidth("abc")).toBe(GLYPH_WIDTH * 3 + GLYPH_GAP * 2);
    expect(textWidth("abc", 2)).toBe((GLYPH_WIDTH * 3 + GLYPH_GAP * 2) * 2);
  });

  it("dice cuántos caracteres caben en un ancho", () => {
    expect(fitChars(GLYPH_WIDTH - 1)).toBe(0);
    expect(fitChars(GLYPH_WIDTH)).toBe(1);
    expect(fitChars(GLYPH_WIDTH * 3 + GLYPH_GAP * 2)).toBe(3);
  });

  it("corta con puntos suspensivos solo cuando no cabe", () => {
    expect(clipText("map.ts", 1000)).toBe("map.ts");

    const clipped = clipText("changesPanel.tsx", textWidth("abcd"));
    expect(clipped.endsWith("…")).toBe(true);
    expect(textWidth(clipped)).toBeLessThanOrEqual(textWidth("abcd"));

    // Sin sitio ni para el corte, no hay etiqueta: mejor nada que tres puntos.
    expect(clipText("map.ts", GLYPH_WIDTH)).toBe("");
  });

  it("da lo mismo dos veces", () => {
    expect(rowsOf("captura")).toEqual(rowsOf("captura"));
  });
});
