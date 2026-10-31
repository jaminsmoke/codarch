import { describe, expect, it } from "vitest";
import { McpDataError } from "../src/store";
import { findHotspots } from "../src/tools";
import { makeStore } from "./fixtures";

describe("findHotspots", () => {
  it("ordena por riesgo y por una métrica del snapshot", () => {
    const store = makeStore();
    const risk = findHotspots(store, { limit: 10 });
    expect(risk.scope).toBe("snapshot");
    expect(risk.metric).toBe("risk");
    expect(risk.total).toBe(5);
    expect(risk.hotspots[0]?.risk).toBe(1);
    expect(risk.hotspots.every((entry, index) => {
      const previous = risk.hotspots[index - 1];
      return !previous || previous.value >= entry.value;
    })).toBe(true);

    const complexity = findHotspots(store, { metric: "maxComplexity" });
    expect(complexity.hotspots[0]?.path).toBe("src/domain/c.ts");
    expect(complexity.hotspots[0]?.value).toBe(20);
  });

  it("filtra por carpeta y lee los hotspots del diff", () => {
    const store = makeStore();
    const folder = findHotspots(store, {
      metric: "maxComplexity",
      folder: "src/domain"
    });
    expect(folder.total).toBe(1);

    const diff = findHotspots(store, { scope: "diff" });
    expect(diff.metric).toBe("maxComplexity");
    expect(diff.hotspots[0]?.path).toBe("src/domain/c.ts");
    expect(diff.hotspots[0]?.delta).toBe(8);
  });

  it("declara cuando falta el reporte y valida la métrica", () => {
    const withoutReport = makeStore(null);
    const diff = findHotspots(withoutReport, { scope: "diff" });
    expect(diff.available).toBe(false);
    expect(diff.reason).toContain("report.json");

    expect(() => findHotspots(makeStore(), { metric: "nope" })).toThrow(
      McpDataError
    );
  });
});
