import { describe, expect, it } from "vitest";
import { dedentLines } from "../src/panels";

describe("dedentLines", () => {
  it("quita la sangría común y conserva la relativa", () => {
    expect(
      dedentLines([
        "    export async function checkSource(",
        "      current: string",
        "    ): Promise<boolean> {"
      ])
    ).toEqual([
      "export async function checkSource(",
      "  current: string",
      "): Promise<boolean> {"
    ]);
  });

  it("deja en blanco las líneas que ya lo estaban", () => {
    expect(dedentLines(["  const a = 1;", "", "  return a;"])).toEqual([
      "const a = 1;",
      "",
      "return a;"
    ]);
  });

  it("no toca una muestra que ya empieza en la columna 0", () => {
    const lines = ["const a = 1;", "  return a;"];
    expect(dedentLines(lines)).toEqual(lines);
  });

  it("devuelve una copia, no la lista que recibe", () => {
    const lines = ["const a = 1;"];
    expect(dedentLines(lines)).not.toBe(lines);
  });
});
