import { describe, expect, it } from "vitest";
import {
  buildSearch,
  isColorModeAvailable,
  parseSourceRequest,
  parseViewState,
  viewStateFromSaved,
  type SourceRequest,
  type ViewState
} from "../src/viewState";

const view: ViewState = {
  areaMetric: "rloc",
  colorMode: "risk",
  focusPath: "src/app",
  filePath: "src/app/main.ts",
  tab: "changes",
  symbolName: null,
  showLabels: null
};

const source: SourceRequest = {
  snapshotUrl: "https://example.test/snapshot.cc.json",
  reportUrl: null
};

describe("estado de vista en la URL", () => {
  it("lee el estado de vista de la query string", () => {
    expect(
      parseViewState("?area=rloc&color=structure&focus=src/app&file=src/app/main.ts&tab=changes")
    ).toEqual({ ...view, colorMode: "structure" });
  });

  it("ignora la pestaña desconocida", () => {
    expect(parseViewState("?tab=inventario").tab).toBeNull();
  });

  it("reconoce la pestaña de reglas", () => {
    expect(parseViewState("?tab=rules").tab).toBe("rules");
  });

  it("reconoce la pestaña de cambios", () => {
    expect(parseViewState("?tab=changes").tab).toBe("changes");
  });

  it("traduce los nombres viejos de las pestañas", () => {
    expect(parseViewState("?tab=lenses").tab).toBe("rules");
    expect(parseViewState("?tab=pr").tab).toBe("changes");
  });

  it("ignora valores vacíos", () => {
    expect(parseViewState("?area=&color=%20%20")).toEqual({
      areaMetric: null,
      colorMode: null,
      focusPath: null,
      filePath: null,
      tab: null,
      symbolName: null,
      showLabels: null
    });
  });

  it("lee las fuentes por URL", () => {
    expect(
      parseSourceRequest("?src=https://example.test/snapshot.cc.json&report=report.json")
    ).toEqual({
      snapshotUrl: "https://example.test/snapshot.cc.json",
      reportUrl: "report.json"
    });
  });

  it("construye una query string con el estado de vista", () => {
    expect(buildSearch(view, source)).toBe(
      "?area=rloc&color=risk&focus=src/app&file=src/app/main.ts&tab=changes" +
        "&src=https://example.test/snapshot.cc.json"
    );
  });

  it("deja las barras de las rutas legibles", () => {
    const search = buildSearch(view, source);
    expect(search).toContain("file=src/app/main.ts");
    expect(search).toContain("focus=src/app");
  });

  it("conserva los parámetros ajenos a la app", () => {
    const search = buildSearch(view, source, "?campana=verano");
    expect(search).toContain("campana=verano");
    expect(search).toContain("area=rloc");
  });

  it("elimina el estado anterior cuando ya no aplica", () => {
    const search = buildSearch(
      {
        areaMetric: null,
        colorMode: null,
        focusPath: null,
        filePath: null,
        tab: null,
        symbolName: null,
        showLabels: null
      },
      { snapshotUrl: null, reportUrl: null },
      "?area=rloc&color=risk&file=src/app/main.ts"
    );
    expect(search).toBe("");
  });

  it("lleva el símbolo abierto en la URL", () => {
    const search = buildSearch(
      { ...view, symbolName: "parseDiff" },
      source
    );
    expect(search).toContain("symbol=parseDiff");
    expect(parseViewState(search).symbolName).toBe("parseDiff");
  });

  it("hace ida y vuelta con el estado de vista", () => {
    const search = buildSearch(view, source);
    expect(parseViewState(search)).toEqual(view);
    expect(parseSourceRequest(search)).toEqual(source);
  });

  it("una vista guardada se traduce al mismo estado que la URL", () => {
    expect(
      viewStateFromSaved({ area: "rloc", color: "layer", focus: "src/app", labels: true })
    ).toEqual({
      areaMetric: "rloc",
      colorMode: "layer",
      focusPath: "src/app",
      filePath: null,
      tab: null,
      symbolName: null,
      showLabels: true
    });
  });
});

describe("el modo de color que se puede pintar", () => {
  const coverage = new Set(["rloc", "maxComplexity"]);

  it("risk y structure siempre valen", () => {
    expect(isColorModeAvailable("risk", coverage, null)).toBe(true);
    expect(isColorModeAvailable("structure", coverage, null)).toBe(true);
  });

  it("status pide la lente de migración", () => {
    expect(isColorModeAvailable("status", coverage, null)).toBe(false);
    expect(isColorModeAvailable("status", coverage, { summary: {} })).toBe(true);
  });

  it("una métrica vale si está en el snapshot", () => {
    expect(isColorModeAvailable("rloc", coverage, null)).toBe(true);
    expect(isColorModeAvailable("lineas", coverage, null)).toBe(false);
  });
});
