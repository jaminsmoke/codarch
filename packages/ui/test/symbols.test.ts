import { describe, expect, it } from "vitest";
import { groupSymbols, symbolSummary } from "../src/symbols";

describe("el resumen de los símbolos", () => {
  it("no resume una lista vacía", () => {
    expect(symbolSummary([])).toBeUndefined();
  });

  it("cuenta por tipo y enseña la complejidad más alta", () => {
    expect(
      symbolSummary([
        { kind: "function", complexity: 3 },
        { kind: "function", complexity: 15 },
        { kind: "variable" }
      ])
    ).toBe("2 fn · 1 var · máx. 15");
  });

  it("trata la complejidad ausente como cero", () => {
    expect(
      symbolSummary([
        { kind: "function", complexity: undefined },
        { kind: "variable", complexity: 4 }
      ])
    ).toBe("1 fn · 1 var · máx. 4");
  });

  it("lo dice cuando ningún símbolo trae complejidad", () => {
    expect(
      symbolSummary([{ kind: "variable" }, { kind: "interface" }])
    ).toBe("1 int · 1 var");
  });
});

describe("los grupos de símbolos", () => {
  const symbols = [
    { name: "compleja", kind: "function" as const, line: 9, complexity: 15 },
    { name: "LIMITE", kind: "variable" as const, line: 2 },
    { name: "quieta", kind: "function" as const, line: 1, complexity: 2 },
    { name: "Forma", kind: "interface" as const, line: 4 }
  ];

  it("pone primero las funciones y respeta el orden del modelo dentro del grupo", () => {
    const groups = groupSymbols(symbols);

    expect(groups.map((group) => group.kind)).toEqual([
      "function",
      "interface",
      "variable"
    ]);
    expect(groups[0]?.symbols.map((symbol) => symbol.name)).toEqual([
      "compleja",
      "quieta"
    ]);
  });

  it("no inventa grupos vacíos", () => {
    expect(groupSymbols([])).toEqual([]);
  });
});
