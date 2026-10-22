import { existsSync, readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { parseCcJson } from "@codarch/schema";
import { buildRenderModel, renderHtml } from "@codarch/render";

const sample = new URL(
  "../../../samples/codecharta_visualization.cc.json.gz",
  import.meta.url
);

describe.skipIf(!existsSync(sample))("render sobre la muestra real", () => {
  // La muestra se lee dentro del test, no al definir la suite: si no está
  // (las muestras no están en el repo), la suite se salta sin reventar.
  const leer = (): {
    json: unknown;
    model: ReturnType<typeof buildRenderModel>;
    html: string;
  } => {
    const json = JSON.parse(gunzipSync(readFileSync(sample)).toString("utf8")) as unknown;
    const model = buildRenderModel(parseCcJson(json));
    return { json, model, html: renderHtml(model) };
  };

  it("produce un mapa completo y determinista", () => {
    const { json, model, html } = leer();
    expect(model.fileCount).toBe(2003);
    expect(model.folderCount).toBe(498);
    expect(model.metrics).toHaveLength(10);
    expect(model.edges).toHaveLength(3727);
    expect(model.cycles).toHaveLength(2);
    expect(html).toBe(renderHtml(buildRenderModel(parseCcJson(json))));
  });

  it("cabe en el presupuesto de un HTML único", () => {
    const { html } = leer();
    expect(Buffer.byteLength(html, "utf8")).toBeLessThan(500_000);
  });

  it("incluye el payload comprimido y todas las métricas curadas", () => {
    const { html, model } = leer();
    expect(html).toContain('<svg id="map"');
    expect(html).toContain('id="codarch-data"');
    expect(html).toContain('data-nm="app"');
    const match = html.match(
      /<script id="codarch-data" type="application\/json">([\s\S]*?)<\/script>/
    );
    const payload = JSON.parse(match?.[1] ?? "") as {
      files: unknown[];
      metrics: unknown[];
      dirs: string[];
    };
    expect(payload.files).toHaveLength(2003);
    expect(payload.metrics).toHaveLength(10);
    expect(payload.dirs.length).toBeLessThan(2003);
    expect(model.metrics.map((metric) => metric.key)).toEqual([
      "rloc",
      "max_complexity_per_function",
      "complexity",
      "functions",
      "number_of_functions",
      "loc",
      "number_of_commits",
      "number_of_authors",
      "incoming_dependencies",
      "outgoing_dependencies"
    ]);
  });
});
