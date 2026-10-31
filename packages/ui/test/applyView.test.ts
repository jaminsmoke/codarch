import { describe, expect, it } from "vitest";
import type { CcMigrationLens } from "@codarch/schema/browser";
import type { RenderFile, RenderModel } from "@codarch/render/browser";
import { planViewState } from "../src/app/applyView";
import { EMPTY_VIEW_STATE, type ViewState } from "../src/viewState";

/** Un modelo con las rutas que se digan, bajo las carpetas dadas. */
function model(paths: readonly string[], folders: readonly string[]): RenderModel {
  const files = paths.map((path, index) => ({ path, index })) as RenderFile[];
  return {
    files,
    roots: folders.map((path) => ({ kind: "folder", path, name: path }))
  } as unknown as RenderModel;
}

const map = model(
  ["src/a.ts", "src/b.ts", "lib/c.ts"],
  ["src", "lib"]
);

const coverage = new Set(["rloc", "loc", "fanIn"]);

function plan(wanted: Partial<ViewState>, migration: CcMigrationLens | null = null) {
  return planViewState(
    { ...EMPTY_VIEW_STATE, ...wanted },
    { model: map, coverage, migration }
  );
}

const migration = { nodes: {}, edges: [] } as unknown as CcMigrationLens;

describe("el plan de una vista pedida", () => {
  it("aplica lo que el mapa tiene", () => {
    const result = plan({
      areaMetric: "fanIn",
      colorMode: "loc",
      focusPath: "src",
      folderPath: "lib",
      filePath: "src/b.ts",
      openFilePath: "lib/c.ts",
      tab: "changes",
      showLabels: false
    });

    expect(result).toEqual({
      areaMetric: "fanIn",
      colorMode: "loc",
      focusPath: "src",
      folderPath: "lib",
      fileIndex: 1,
      openFilePath: "lib/c.ts",
      tab: "changes",
      showLabels: false,
      symbol: null
    });
  });

  it("ignora la métrica que este snapshot no trae", () => {
    expect(plan({ areaMetric: "ffiCrossings" }).areaMetric).toBeNull();
    expect(plan({ colorMode: "ffiCrossings" }).colorMode).toBeNull();
  });

  it("deja pasar riesgo, estructura y lint, que no dependen del snapshot", () => {
    expect(plan({ colorMode: "risk" }).colorMode).toBe("risk");
    expect(plan({ colorMode: "structure" }).colorMode).toBe("structure");
    expect(plan({ colorMode: "lint" }).colorMode).toBe("lint");
  });

  it("el estado de migración pide su lente", () => {
    expect(plan({ colorMode: "status" }).colorMode).toBeNull();
    expect(plan({ colorMode: "status" }, migration).colorMode).toBe("status");
  });

  it("ignora la carpeta y el fichero que ya no están en el árbol", () => {
    const result = plan({
      focusPath: "fuera",
      folderPath: "fuera",
      filePath: "fuera/x.ts",
      openFilePath: "fuera/x.ts"
    });

    expect(result).toEqual({
      areaMetric: null,
      colorMode: null,
      focusPath: null,
      folderPath: null,
      fileIndex: null,
      openFilePath: null,
      tab: null,
      showLabels: null,
      symbol: null
    });
  });

  it("pide el símbolo con su ruta, sin abrirlo todavía", () => {
    const result = plan({ symbolName: "analizar", filePath: "src/a.ts" });

    // El plan solo dice qué pedir: la cadena se pide al aplicar.
    expect(result.symbol).toEqual({ name: "analizar", path: "src/a.ts" });
    expect(result.fileIndex).toBe(0);
  });

  it("una vista vacía no toca nada", () => {
    expect(plan({})).toEqual({
      areaMetric: null,
      colorMode: null,
      focusPath: null,
      folderPath: null,
      fileIndex: null,
      openFilePath: null,
      tab: null,
      showLabels: null,
      symbol: null
    });
  });
});
