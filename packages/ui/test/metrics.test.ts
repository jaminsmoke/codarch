import { describe, expect, it } from "vitest";
import { orderedMetrics } from "../src/metrics";

describe("orden de las métricas", () => {
  it("pone primero las preferidas y respeta su orden", () => {
    expect(orderedMetrics(["zeta", "loc", "rloc", "alpha"])).toEqual([
      "rloc",
      "loc",
      "alpha",
      "zeta"
    ]);
  });

  it("no inventa métricas que no están en el snapshot", () => {
    expect(orderedMetrics(["alpha"])).toEqual(["alpha"]);
  });
});
