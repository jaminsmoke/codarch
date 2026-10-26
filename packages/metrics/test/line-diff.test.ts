import { describe, expect, it } from "vitest";
import { countLineChanges, diffLines } from "../src/line-diff";

describe("las líneas que entran y salen", () => {
  it("un texto idéntico no mueve nada", () => {
    const body = ["function f() {", "  return 1;", "}"];
    expect(countLineChanges(body, body)).toEqual({ added: 0, removed: 0 });
  });

  it("cuenta por separado lo que suma y lo que resta", () => {
    const before = ["function f() {", "  return 1;", "}"];
    const after = ["function f() {", "  const uno = 1;", "  return uno;", "}"];

    // La cabecera y la llave siguen: entra una línea y se reescribe la otra.
    expect(countLineChanges(before, after)).toEqual({ added: 2, removed: 1 });
  });

  it("un cuerpo que nace suma todo y uno que se va resta todo", () => {
    expect(countLineChanges([], ["a", "b"])).toEqual({ added: 2, removed: 0 });
    expect(countLineChanges(["a", "b"], [])).toEqual({ added: 0, removed: 2 });
  });

  it("no depende del orden en que se le pase lo mismo", () => {
    const before = ["a", "b", "c"];
    const after = ["a", "c", "d"];
    const first = countLineChanges(before, after);
    const second = countLineChanges(before, after);

    expect(first).toEqual(second);
    expect(first).toEqual({ added: 1, removed: 1 });
  });

  it("un cuerpo enorme se deja sin medir antes que comerse la memoria", () => {
    const huge = Array.from({ length: 1200 }, (_, index) => `línea ${index}`);
    expect(countLineChanges(huge, huge)).toBeNull();
  });
});

/** Un fichero de `count` líneas, con las de `changed` reescritas. */
function body(count: number, changed: number[]): string[] {
  return Array.from({ length: count }, (_, index) =>
    changed.includes(index) ? `línea ${index} cambiada` : `línea ${index}`
  );
}

describe("la vista de diferencias", () => {
  it("pinta el cambio y su contexto, no el fichero entero", () => {
    const diff = diffLines(body(40, []), body(40, [20]));

    // Un `same` a más de tres líneas de un cambio no se pinta.
    const kept = diff.rows.filter((row) => row.type === "same");
    expect(kept.length).toBe(6);
    expect(diff.rows[0]?.type).toBe("gap");
    expect(diff.rows[diff.rows.length - 1]?.type).toBe("gap");
  });

  it("dos zonas lejanas se separan con un hueco", () => {
    const diff = diffLines(body(60, []), body(60, [10, 45]));

    const gaps = diff.rows.filter((row) => row.type === "gap");
    expect(gaps.length).toBe(3);
    // La primera línea pintada tras el hueco de en medio es la del segundo
    // cambio, tres líneas antes (1-based).
    const middle = diff.rows.findIndex(
      (row, index) => row.type === "gap" && index > 0
    );
    expect(diff.rows[middle + 1]?.baseLine).toBe(43);
  });

  it("las cuentas son del fichero entero, se pinten o no", () => {
    const before = body(40, []);
    const after = body(40, [2, 30]);
    const diff = diffLines(before, after);

    expect({ added: diff.added, removed: diff.removed }).toEqual(countLineChanges(before, after));
    expect(diff.rows.filter((row) => row.type === "add").length).toBe(
      diff.added
    );
  });

  it("cada línea lleva el número que le toca en cada lado", () => {
    const diff = diffLines(["a", "b"], ["a", "nueva", "b"]);

    expect(diff.rows).toEqual([
      { type: "same", text: "a", baseLine: 1, headLine: 1 },
      { type: "add", text: "nueva", baseLine: null, headLine: 2 },
      { type: "same", text: "b", baseLine: 2, headLine: 3 }
    ]);
  });

  it("dos textos iguales no dejan filas", () => {
    const diff = diffLines(["a", "b"], ["a", "b"]);

    expect(diff).toEqual({ rows: [], added: 0, removed: 0, truncated: false });
  });

  it("un fichero enorme se recorta y lo dice", () => {
    const huge = body(1200, []);
    const diff = diffLines(huge, body(1200, [600]));

    expect(diff.truncated).toBe(true);
    expect(diff.rows).toEqual([]);
    // Sin alinear no se cuentan líneas: el tamaño del fichero no es el cambio.
    expect(diff.added).toBeNull();
    expect(diff.removed).toBeNull();
  });
});
