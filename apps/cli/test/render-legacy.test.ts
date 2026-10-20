import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildRenderModel, renderHtml } from "@codarch/render";
import { parseCcJson } from "@codarch/schema";

const legacy = JSON.parse(
  readFileSync(
    new URL("../../../packages/schema/test/fixtures/legacy-1.2.cc.json", import.meta.url),
    "utf8"
  )
) as unknown;

describe("render sobre cc.json 1.x", () => {
  const cc = parseCcJson(legacy);
  const model = buildRenderModel(cc);

  it("usa las métricas y aristas normalizadas", () => {
    expect(model.fileCount).toBe(3);
    expect(model.areaMetric).toBe("rloc");
    expect(model.totalArea).toBe(110);
    expect(model.edges).toHaveLength(1);
  });

  it("produce el mismo HTML único que un 2.x equivalente", () => {
    const html = renderHtml(model);
    expect(html).toContain('<svg id="map"');
    expect(html).toContain('id="codarch-data"');
    expect(html).toBe(renderHtml(buildRenderModel(parseCcJson(legacy))));
  });
});
