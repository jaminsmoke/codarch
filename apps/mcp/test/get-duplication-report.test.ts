import { describe, expect, it } from "vitest";
import { ArchitectureStore } from "../src/store";
import { getDuplicationReport } from "../src/tools";
import { SNAPSHOT, makeStore } from "./fixtures";

describe("getDuplicationReport", () => {
  it("cuenta el ámbito y lista los pares con sus dos extremos", () => {
    const result = getDuplicationReport(makeStore());

    expect(result.available).toBe(true);
    expect(result.scope).toBe("");
    expect(result.summary).toEqual({
      duplicatedLines: 50,
      repeatedLines: 4,
      ratio: 20,
      files: 5,
      affected: 2
    });
    expect(result.totalPairs).toBe(2);
    // El más parecido primero, con las rutas del mapa.
    expect(result.pairs[0]).toEqual({
      from: "src/a.ts",
      to: "src/b.ts",
      lines: 20,
      similarity: 100,
      status: "copy"
    });
    expect(result.changes.available).toBe(true);
    if (result.changes.available) {
      expect(result.changes.lines).toEqual({ base: 20, head: 50, delta: 30 });
      expect(result.changes.counts).toEqual({
        added: 1,
        removed: 0,
        diverging: 1
      });
    }
  });

  it("un par cuenta solo si sus dos extremos están en el ámbito", () => {
    const folder = getDuplicationReport(makeStore(), { path: "src/domain" });
    expect(folder.totalPairs).toBe(0);
    expect(folder.summary?.files).toBe(1);

    const file = getDuplicationReport(makeStore(), { path: "src/a.ts" });
    expect(file.scope).toBe("src/a.ts");
    expect(file.summary?.duplicatedLines).toBe(20);
    expect(file.totalPairs).toBe(0);
  });

  it("sin lente dice que no se midió, no que esté limpio", () => {
    const snapshot = structuredClone(SNAPSHOT);
    delete snapshot.lenses?.duplication;
    const store = new ArchitectureStore(snapshot, {
      root: "C:/repo",
      report: null
    });

    const result = getDuplicationReport(store);
    expect(result.available).toBe(false);
    expect(result.summary).toBeNull();
    expect(result.reason).toContain("sin medir");
  });
});
