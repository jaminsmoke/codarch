import { describe, expect, it } from "vitest";
import {
  fileId,
  folderId,
  type CcJson,
  type CcNode
} from "@codarch/schema";
import { REPORT_SCHEMA_VERSION, diffSnapshots } from "../src/index";

/** Un snapshot plano: un fichero por ruta, con sus métricas. */
function snapshot(files: Record<string, Record<string, number>>): CcJson {
  const attributes: Record<string, Record<string, number>> = {};
  const children: CcNode[] = [];
  for (const path of Object.keys(files).sort()) {
    const id = fileId(path);
    const metrics = files[path];
    if (!metrics) continue;
    attributes[id] = metrics;
    children.push({ id, name: path, type: "File" });
  }

  return {
    meta: { projectName: "acme", checksum: "x" },
    files: [{ id: folderId(""), name: "acme", type: "Folder", children }],
    lenses: { metrics: { attributes } }
  } as unknown as CcJson;
}

describe("los totales del reporte (ADR 0071)", () => {
  const base = snapshot({
    "a.ts": { rloc: 10, maxComplexity: 4 },
    "b.ts": { rloc: 5, maxComplexity: 7, functions: 3 }
  });
  const head = snapshot({
    "a.ts": { rloc: 12, maxComplexity: 5 },
    "c.ts": { rloc: 4, maxComplexity: 9 }
  });

  it("suma las métricas aditivas y toma el máximo de las que ya son máximo", () => {
    const report = diffSnapshots(base, head);

    expect(report.totals?.metrics.rloc).toEqual({
      base: 15,
      head: 16,
      delta: 1
    });
    expect(report.totals?.metrics.maxComplexity).toEqual({
      base: 7,
      head: 9,
      delta: 2
    });
  });

  it("una métrica que solo existe en un lado no inventa delta", () => {
    const report = diffSnapshots(base, head);

    expect(report.totals?.metrics.functions).toEqual({
      base: 3,
      head: null,
      delta: null
    });
  });

  it("no incluye lo que ningún lado declara", () => {
    const report = diffSnapshots(base, head);

    expect(report.totals?.metrics.loc).toBeUndefined();
    expect(Object.keys(report.totals?.metrics ?? {})).toEqual([
      "functions",
      "maxComplexity",
      "rloc"
    ]);
  });

  it("es determinista y el esquema dice su versión", () => {
    const first = JSON.stringify(diffSnapshots(base, head));
    const second = JSON.stringify(diffSnapshots(base, head));

    expect(first).toBe(second);
    expect(diffSnapshots(base, head).schemaVersion).toBe(REPORT_SCHEMA_VERSION);
  });
});
