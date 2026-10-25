import { describe, expect, it } from "vitest";
import { symbolSummary } from "../src/symbols";

describe("el resumen de los símbolos", () => {
  it("no resume una lista vacía", () => {
    expect(symbolSummary([])).toBeUndefined();
  });

  it("enseña la complejidad más alta, no la media ni la última", () => {
    expect(
      symbolSummary([{ complexity: 3 }, { complexity: 15 }, { complexity: 7 }])
    ).toBe("complejidad máx. 15");
  });

  it("trata la complejidad ausente como cero", () => {
    expect(symbolSummary([{ complexity: undefined }, { complexity: 4 }])).toBe(
      "complejidad máx. 4"
    );
  });

  it("lo dice cuando ningún símbolo trae complejidad", () => {
    expect(
      symbolSummary([{ complexity: undefined }, { complexity: undefined }])
    ).toBe("sin complejidad");
  });
});
