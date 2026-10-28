import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CcJsonError,
  defaultMetric,
  getStats,
  isLegacyCcJson,
  parseCcJson,
  pathById,
  topByMetric,
  walkFiles
} from "../src/index";

function loadFixture(name: string): unknown {
  return JSON.parse(
    readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8")
  ) as unknown;
}

const fixture = loadFixture("minimal.cc.json");
const legacy12 = loadFixture("legacy-1.2.cc.json");
const legacy13 = loadFixture("legacy-1.3-wrapped.cc.json");
const legacyMulti = loadFixture("legacy-multi-root.cc.json");

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

  it("rechaza métricas no numéricas", () => {
    const broken = {
      meta: { apiVersion: "2.1" },
      files: [{ id: "a", name: "a.ts", type: "File" }],
      lenses: { metrics: { attributes: { a: { rloc: "muchas" } } } }
    };
    expect(() => parseCcJson(broken)).toThrow(/número finito/);
  });
});

describe("parseCcJson 1.x", () => {
  it("convierte un 1.2 desnudo y separa nodos, métricas y aristas", () => {
    const cc = parseCcJson(legacy12);
    const paths = pathById(cc.files);

    expect(cc.meta.apiVersion).toBe("2.0");
    expect(cc.meta.projectName).toBe("legacy demo");
    expect(cc.files).toHaveLength(1);
    expect(cc.files[0]?.name).toBe("root");
    expect(cc.files[0]?.id).toBe("164ddff4bb1345e1");

    expect(paths.get("2041e04dbc53eb30")).toBe("root/src/a.ts");
    expect(paths.get("bb13344dca1512de")).toBe("root/src/b.ts");
    expect(cc.lenses?.metrics?.attributes["2041e04dbc53eb30"]).toEqual({
      rloc: 60,
      complexity: 4
    });
    expect(cc.files[0]?.children?.[1]?.name).toBe("README.md");
    expect(cc.files[0]?.children?.[0]?.children?.[0]?.link).toBe("https://example.com/a");

    const edge = cc.lenses?.dependency?.edges?.[0];
    expect(edge?.fromId).toBe("2041e04dbc53eb30");
    expect(edge?.toId).toBe("bb13344dca1512de");
    expect(edge?.attributes).toEqual({ pairingRate: 42, avgCommits: 3 });

    expect(cc.lenses?.metrics?.attributeTypes).toEqual({
      rloc: "absolute",
      complexity: "absolute"
    });
    expect(cc.lenses?.dependency?.attributeTypes).toEqual({
      pairingRate: "relative",
      avgCommits: "absolute"
    });
    expect(cc.lenses?.metrics?.attributeDescriptors).toEqual({
      rloc: { title: "Real Lines of Code", direction: 1 }
    });
    expect(cc.lenses?.dependency?.attributeDescriptors).toEqual({
      pairingRate: { title: "Pairing rate", direction: -1 }
    });

    expect(JSON.stringify(cc)).not.toContain("blacklist");
    expect(JSON.stringify(cc)).not.toContain("markedPackages");
    expect(JSON.stringify(cc)).not.toContain("fixedPosition");
  });

  it("acepta el envoltorio { checksum, data } de 1.3", () => {
    const cc = parseCcJson(legacy13);
    const file = cc.files[0]?.children?.[0];

    expect(cc.meta.apiVersion).toBe("2.0");
    expect(cc.meta.projectName).toBe("wrapped demo");
    expect(cc.meta.checksum).toBeUndefined();
    expect(cc.files[0]?.name).toBe("app");
    expect(file?.name).toBe("main.ts");
    expect(file?.contentHash).toBe("deadbeef");
    expect(cc.lenses?.metrics?.attributes["824ee36002a4d3e2"]?.rloc).toBe(25);
    expect(cc.lenses?.dependency).toBeUndefined();
  });

  it("envuelve varias raíces en una raíz sintética", () => {
    const cc = parseCcJson(legacyMulti);
    const paths = pathById(cc.files);
    const edge = cc.lenses?.dependency?.edges?.[0];

    expect(cc.files).toHaveLength(1);
    expect(cc.files[0]?.name).toBe("root");
    expect(cc.files[0]?.children?.map((child) => child.name)).toEqual([
      "frontend",
      "backend"
    ]);
    expect(paths.get("26cd69867a89868c")).toBe("root/frontend");
    expect(paths.get("0eb5497bd8cf45a7")).toBe("root/frontend/app.ts");
    expect(paths.get("21ec01a52a5ee054")).toBe("root/backend");
    expect(paths.get("e25323cf5a0f8ab4")).toBe("root/backend/server.ts");
    expect(edge?.fromId).toBe("0eb5497bd8cf45a7");
    expect(edge?.toId).toBe("e25323cf5a0f8ab4");
    expect(edge?.attributes).toEqual({ dependencies: 1 });
  });

  it("detecta 1.x sin confundirlo con 2.x", () => {
    expect(isLegacyCcJson(legacy12)).toBe(true);
    expect(isLegacyCcJson(legacy13)).toBe(true);
    expect(isLegacyCcJson(fixture)).toBe(false);
    expect(isLegacyCcJson({ checksum: "x", data: [] })).toBe(false);
  });

  it("falla si una arista apunta a un nodo inexistente", () => {
    const broken = {
      apiVersion: "1.2",
      nodes: [
        {
          name: "root",
          type: "Folder",
          attributes: {},
          children: [{ name: "a.ts", type: "File", attributes: { rloc: 1 } }]
        }
      ],
      edges: [
        {
          fromNodeName: "/root/missing.ts",
          toNodeName: "/root/a.ts",
          attributes: { dependencies: 1 }
        }
      ]
    };
    expect(() => parseCcJson(broken)).toThrow(/no se pudo resolver/);
  });

  it("falla si faltan los nodos y si una métrica no es numérica", () => {
    expect(() => parseCcJson({ apiVersion: "1.3" })).toThrow(/"nodes"/);
    expect(() =>
      parseCcJson({
        apiVersion: "1.2",
        nodes: [{ name: "root", type: "Folder", attributes: { rloc: "x" } }]
      })
    ).toThrow(/número finito/);
  });

  it("la conversión es determinista: dos pasadas dan el mismo documento", () => {
    const first = JSON.stringify(parseCcJson(legacy12));
    const second = JSON.stringify(parseCcJson(legacy12));
    expect(second).toBe(first);

    // El orden de las claves de entrada tampoco cambia el resultado.
    const reordered = JSON.parse(JSON.stringify(legacy12)) as Record<string, unknown>;
    const shuffled = Object.fromEntries(Object.entries(reordered).reverse());
    expect(JSON.stringify(parseCcJson(shuffled))).toBe(first);
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
