import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CcJsonError,
  defaultMetric,
  getStats,
  parseCcJson,
  pathById,
  topByMetric,
  walkFiles
} from "../src/index";

const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/minimal.cc.json", import.meta.url), "utf8")
) as unknown;

describe("parseCcJson", () => {
  it("normaliza a un array de raíces", () => {
    const single = { ...(fixture as object), files: (fixture as { files: unknown[] }).files[0] };
    const cc = parseCcJson(single);
    expect(cc.files).toHaveLength(1);
    expect(cc.files[0]?.name).toBe("root");
  });

  it("acepta un documento válido", () => {
    const cc = parseCcJson(fixture);
    expect(cc.meta.apiVersion).toBe("2.1");
    expect(cc.lenses?.metrics?.attributes.a?.rloc).toBe(120);
  });

  it("rechaza ids duplicados", () => {
    const broken = {
      meta: { apiVersion: "2.1" },
      files: [
        { id: "x", name: "a", type: "File" },
        { id: "x", name: "b", type: "File" }
      ]
    };
    expect(() => parseCcJson(broken)).toThrow(CcJsonError);
    expect(() => parseCcJson(broken)).toThrow(/id duplicado/);
  });

  it("rechaza cc.json 1.x con un mensaje accionable", () => {
    expect(() => parseCcJson({ checksum: "x", data: [] })).toThrow(/1\.x/);
  });

  it("rechaza métricas no numéricas", () => {
    const broken = {
      meta: { apiVersion: "2.1" },
      files: [{ id: "a", name: "a.ts", type: "File" }],
      lenses: { metrics: { attributes: { a: { rloc: "muchas" } } } }
    };
    expect(() => parseCcJson(broken)).toThrow(/número finito/);
  });
});

describe("walk", () => {
  it("devuelve rutas completas y preserva el orden", () => {
    const cc = parseCcJson(fixture);
    const paths: string[] = [];
    walkFiles(cc.files, (entry) => paths.push(entry.path));
    expect(paths).toEqual(["root/src/a.ts", "root/src/b.ts", "root/README.md"]);
  });

  it("mapea id a ruta", () => {
    const cc = parseCcJson(fixture);
    expect(pathById(cc.files).get("b")).toBe("root/src/b.ts");
  });
});

describe("stats", () => {
  it("cuenta ficheros, carpetas y profundidad", () => {
    const cc = parseCcJson(fixture);
    const stats = getStats(cc);
    expect(stats.files).toBe(3);
    expect(stats.folders).toBe(2);
    expect(stats.maxDepth).toBe(2);
    expect(stats.edges).toBe(1);
    expect(stats.metricNames).toBe(2);
    expect(stats.orphanMetricNodes).toBe(0);
  });

  it("ordena por la métrica elegida", () => {
    const cc = parseCcJson(fixture);
    const top = topByMetric(cc, "rloc", 2);
    expect(top.map((entry) => entry.value)).toEqual([120, 40]);
    expect(top[0]?.path).toBe("root/src/a.ts");
  });

  it("elige rloc como métrica por defecto", () => {
    const cc = parseCcJson(fixture);
    expect(defaultMetric(getStats(cc))).toBe("rloc");
  });
});
