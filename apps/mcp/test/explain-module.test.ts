import { aggregateFolder } from "@codarch/metrics";
import { describe, expect, it } from "vitest";
import { explainModule } from "../src/tools";
import { makeStore } from "./fixtures";

describe("explainModule", () => {
  it("explica un fichero con aristas, ciclo y violaciones", () => {
    const result = explainModule(makeStore(), { path: "src/a.ts" });
    expect(result.kind).toBe("file");
    expect(result.metrics.rloc).toBe(100);
    expect(result.dependencies?.total).toBe(1);
    expect(result.dependencies?.edges[0]?.path).toBe("src/b.ts");
    expect(result.dependents?.total).toBe(2);
    expect(result.cycle).toEqual({ inCycle: true, size: 3 });
    expect(result.violations).toHaveLength(1);
    expect(result.diff.available).toBe(true);
    if (result.diff.available) expect(result.diff.state).toBeNull();
  });

  it("explica una carpeta y agrega el diff", () => {
    const result = explainModule(makeStore(), { path: "src" });
    expect(result.kind).toBe("folder");
    expect(result.files).toBe(4);
    expect(result.metrics.maxComplexity).toBe(20);
    expect(result.topFiles?.length).toBe(4);
    expect(result.violations).toHaveLength(2);
    if (result.diff.available) {
      expect(result.diff.counts?.files.changed).toBe(1);
      expect(result.diff.counts?.files.added).toBe(0);
    }
  });

  it("trata la raíz como carpeta y declara la ausencia de reporte", () => {
    const root = explainModule(makeStore(), { path: "." });
    expect(root.kind).toBe("folder");
    expect(root.files).toBe(5);
    if (root.diff.available) {
      expect(root.diff.counts?.files.added).toBe(1);
      expect(root.diff.counts?.files.removed).toBe(1);
    }

    const noReport = explainModule(makeStore(null), { path: "src/a.ts" });
    expect(noReport.diff.available).toBe(false);
  });
});


  it("size, maxComplexity y risk coinciden con aggregateFolder", () => {
    const store = makeStore();
    const folder = store.resolveTarget("src");
    if ("id" in folder) throw new Error("esperaba carpeta");
    const agg = aggregateFolder(
      folder.files.map((file) => ({
        path: file.path,
        size: file.size,
        complexity: file.complexity,
        risk: file.risk
      }))
    );
    expect(folder.size).toBe(agg.size);
    expect(folder.maxComplexity).toBe(agg.maxComplexity);
    expect(folder.risk).toBe(agg.risk);
    // Sin dueños en la salida del MCP: solo las tres cifras.
    const explained = explainModule(store, { path: "src" });
    expect(explained.metrics).toEqual({
      size: agg.size,
      maxComplexity: agg.maxComplexity,
      risk: agg.risk
    });
    expect(explained).not.toHaveProperty("maxComplexityOwner");
    expect(explained).not.toHaveProperty("riskOwner");
  });

  it("lint es null sin artefacto", () => {
    const file = explainModule(makeStore(), { path: "src/a.ts" });
    const folder = explainModule(makeStore(), { path: "src" });
    expect(file.lint).toBeNull();
    expect(folder.lint).toBeNull();
  });
