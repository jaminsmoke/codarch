import { describe, expect, it } from "vitest";
import {
  defaultMetric,
  getStats,
  parseCcJson,
  topByMetric,
  type CcJson
} from "@codarch/schema";
import { inspectReport } from "../src/commands/inspectReport";

const base = {
  meta: {
    apiVersion: "2.1",
    projectName: "demo",
    checksum: "0123456789abcdef0123456789abcdef"
  },
  files: [
    {
      id: "root",
      name: "root",
      type: "Folder",
      children: [
        {
          id: "src",
          name: "src",
          type: "Folder",
          children: [
            { id: "a", name: "a.ts", type: "File" },
            { id: "b", name: "b.ts", type: "File" }
          ]
        },
        { id: "readme", name: "README.md", type: "File" }
      ]
    }
  ],
  lenses: {
    metrics: {
      attributes: {
        a: { rloc: 120 },
        b: { rloc: 40 },
        readme: { rloc: 10 }
      },
      attributeTypes: { rloc: "absolute" }
    },
    dependency: {
      edges: [{ fromId: "a", toId: "b", attributes: { dependencies: 2 } }]
    }
  }
};

/** El informe de un cc.json, como lo llamaría `runInspect`. */
function informe(input: unknown, metric?: string, top = 5): string {
  const cc: CcJson = parseCcJson(input);
  const stats = getStats(cc);
  const chosen = metric ?? defaultMetric(stats) ?? null;
  return inspectReport({
    file: "mapa.cc.json",
    bytes: 2048,
    cc,
    stats,
    metric: chosen,
    top: chosen ? topByMetric(cc, chosen, top) : []
  });
}

/** El valor de un campo del bloque, sin la alineación de la etiqueta. */
function campo(texto: string, etiqueta: string): string | undefined {
  for (const linea of texto.split("\n")) {
    const recortada = linea.trimStart();
    if (recortada.startsWith(`${etiqueta} `)) {
      return recortada.slice(etiqueta.length).trim();
    }
  }
  return undefined;
}

describe("informe de inspect", () => {
  it("cuenta el fichero, el proyecto y la estructura", () => {
    const texto = informe(base);
    expect(campo(texto, "fichero")).toBe("mapa.cc.json (2 KB)");
    expect(campo(texto, "formato")).toBe("cc.json 2.1");
    expect(campo(texto, "proyecto")).toBe("demo");
    expect(campo(texto, "checksum")).toBe("01234567…");
    expect(campo(texto, "commit")).toBe("—");
    expect(campo(texto, "estructura")).toBe(
      "3 ficheros · 2 carpetas · profundidad 2"
    );
    expect(campo(texto, "lentes")).toBe("metrics · dependency");
    expect(campo(texto, "métricas")).toBe("1 distintas · rloc en 3 ficheros");
    expect(campo(texto, "aristas")).toBe("1 · leafEdges 0");
  });

  it("enseña la ruta sin la raíz y alinea las cifras", () => {
    const texto = informe({
      ...base,
      lenses: {
        metrics: {
          attributes: {
            a: { rloc: 1_234_567 },
            b: { rloc: 7 },
            readme: { rloc: 3 }
          }
        }
      }
    });
    expect(texto).toContain("Top 3 por rloc");
    expect(texto).toContain("    1.234.567  src/a.ts");
    expect(texto).toContain("            7  src/b.ts");
  });

  it("recorta por la izquierda las rutas que no caben", () => {
    const nombre = "una-carpeta-con-un-nombre-larguisimo-que-nos-obliga-a-recortar";
    const texto = informe({
      meta: base.meta,
      files: [
        {
          id: "root",
          name: "root",
          type: "Folder",
          children: [{ id: "largo", name: `${nombre}.ts`, type: "File" }]
        }
      ],
      lenses: { metrics: { attributes: { largo: { rloc: 5 } } } }
    });
    const fila = texto.split("\n").find((linea) => linea.includes("…"));
    expect(fila).toBeDefined();
    expect(fila?.length).toBeLessThanOrEqual(4 + 1 + 2 + 78);
  });

  it("no inventa un ranking si no hay métricas", () => {
    const texto = informe({ meta: base.meta, files: base.files });
    expect(campo(texto, "métricas")).toBe("0 distintas");
    expect(texto).not.toContain("Top");
  });

  it("cuenta la migración y los nodos de métricas huérfanos", () => {
    const texto = informe({
      ...base,
      lenses: {
        ...base.lenses,
        metrics: {
          attributes: {
            a: { rloc: 120 },
            b: { rloc: 40 },
            readme: { rloc: 10 },
            fantasma: { rloc: 7 }
          }
        },
        migration: {
          nodes: {},
          edges: [],
          summary: {
            files: 3,
            languages: { ts: { rloc: 120 }, rust: { rloc: 40 } },
            status: { done: 1 },
            bridgeFiles: 2,
            ffiEdges: 3,
            ffiCrossings: 1,
            migrationDebt: 5
          }
        }
      }
    });
    expect(campo(texto, "migración")).toBe(
      "ts 120 · rust 40 · 2 puentes · 3 FFI · deuda 5"
    );
    expect(campo(texto, "huérfanos")).toBe("1 nodos de métricas sin fichero");
  });
});
