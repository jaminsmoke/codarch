import { describe, expect, it } from "vitest";
import { aggregateFolder } from "../src/folder-aggregate";

/** La copia que tenía el MCP antes de C5: suma size y Math.max de complexity/risk. */
function legacyMcpTotals(
  files: readonly { size: number; complexity: number; risk: number }[]
): { size: number; maxComplexity: number; risk: number } {
  let size = 0;
  let maxComplexity = 0;
  let risk = 0;
  for (const file of files) {
    size += file.size;
    maxComplexity = Math.max(maxComplexity, file.complexity);
    risk = Math.max(risk, file.risk);
  }
  return { size, maxComplexity, risk };
}

describe("aggregateFolder (ADR 0092)", () => {
  it("suma el tamaño y toma el máximo de complejidad y riesgo", () => {
    const agg = aggregateFolder([
      { path: "a.ts", size: 100, complexity: 10, risk: 0.4 },
      { path: "b.ts", size: 40, complexity: 2, risk: 0.1 },
      { path: "c.ts", size: 80, complexity: 20, risk: 1 }
    ]);

    expect(agg).toEqual({
      size: 220,
      maxComplexity: 20,
      maxComplexityOwner: "c.ts",
      risk: 1,
      riskOwner: "c.ts",
      files: 3
    });
  });

  it("un máximo 0 no nombra fichero", () => {
    const agg = aggregateFolder([
      { path: "a.ts", size: 1, complexity: 0, risk: 0 },
      { path: "b.ts", size: 2, complexity: 0, risk: 0 }
    ]);

    expect(agg.size).toBe(3);
    expect(agg.maxComplexity).toBe(0);
    expect(agg.maxComplexityOwner).toBeNull();
    expect(agg.risk).toBe(0);
    expect(agg.riskOwner).toBeNull();
  });

  it("sin ficheros todo es cero y sin dueño", () => {
    expect(aggregateFolder([])).toEqual({
      size: 0,
      maxComplexity: 0,
      maxComplexityOwner: null,
      risk: 0,
      riskOwner: null,
      files: 0
    });
  });

  it("en un empate se queda el primero: mismo criterio que la ficha", () => {
    const agg = aggregateFolder([
      { path: "primero.ts", size: 1, complexity: 9, risk: 0.5 },
      { path: "segundo.ts", size: 1, complexity: 9, risk: 0.5 }
    ]);

    expect(agg.maxComplexityOwner).toBe("primero.ts");
    expect(agg.riskOwner).toBe("primero.ts");
  });

  it("size, maxComplexity y risk coinciden con la agregación legada del MCP", () => {
    const files = [
      { path: "src/a.ts", size: 100, complexity: 10, risk: 0.42 },
      { path: "src/b.ts", size: 40, complexity: 2, risk: 0.11 },
      { path: "src/domain/c.ts", size: 80, complexity: 20, risk: 1 },
      { path: "src/infra/d.ts", size: 20, complexity: 1, risk: 0.05 },
      { path: "index.ts", size: 10, complexity: 1, risk: 0.02 }
    ];
    const agg = aggregateFolder(files);
    const legacy = legacyMcpTotals(files);

    expect(agg.size).toBe(legacy.size);
    expect(agg.maxComplexity).toBe(legacy.maxComplexity);
    expect(agg.risk).toBe(legacy.risk);
  });
});