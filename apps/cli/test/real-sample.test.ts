import { existsSync, readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { defaultMetric, getStats, parseCcJson } from "@codarch/schema";

const sample = new URL(
  "../../../samples/codecharta_visualization.cc.json.gz",
  import.meta.url
);

describe.skipIf(!existsSync(sample))("muestra real de CodeCharta", () => {
  it("parsea el mapa de su propia visualización", () => {
    const json = JSON.parse(gunzipSync(readFileSync(sample)).toString("utf8")) as unknown;
    const cc = parseCcJson(json);
    const stats = getStats(cc);

    expect(stats.files).toBe(2003);
    expect(stats.folders).toBe(510);
    expect(stats.maxDepth).toBe(9);
    expect(stats.edges).toBe(3727);
    expect(stats.leafEdges).toBe(8677);
    expect(stats.lenses).toEqual(["metrics", "dependency", "domain"]);
    expect(stats.metricNames).toBeGreaterThan(50);
    expect(stats.orphanMetricNodes).toBe(0);
    expect(defaultMetric(stats)).toBe("rloc");
  });
});
