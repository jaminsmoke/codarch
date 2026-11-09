import { describe, expect, it } from "vitest";
import type { PluginDescriptor, PluginView } from "@codarch/plugin-api";
import type { RenderFile, RenderModel } from "@codarch/render/browser";
import {
  activeViewOf,
  buildPluginContext,
  pluginViewsOf,
  type PluginContextInput
} from "../src/app/pluginViews";
import type { PluginRuntime } from "../src/plugins";

function view(id: string): PluginView {
  return { id, label: id, render: () => null };
}

function plugin(name: string, ids: string[]): PluginDescriptor {
  return {
    manifest: { name, title: name, version: "1.0.0" },
    load: async () => ({ views: ids.map(view) })
  } as unknown as PluginDescriptor;
}

/** Un registro con dos plugins y el primero activado. */
function runtime(enabled: string[], modules: Record<string, PluginView[]>) {
  return {
    descriptors: [plugin("uno", ["a", "b"]), plugin("dos", ["c"])],
    enabled,
    toggle: () => {},
    moduleOf: (name: string) => (name in modules ? { views: modules[name] } : null),
    failed: []
  } as unknown as PluginRuntime;
}

describe("las vistas de los plugins", () => {
  it("solo aporta las de los plugins activados", () => {
    const plugins = runtime(["uno"], { uno: [view("a"), view("b")] });

    expect(pluginViewsOf(plugins).map((entry) => entry.id)).toEqual(["a", "b"]);
  });

  it("un plugin activado sin módulo cargado no aporta nada", () => {
    const plugins = runtime(["uno", "dos"], {});

    expect(pluginViewsOf(plugins)).toEqual([]);
  });

  it("la vista abierta se busca por id y se pierde si ya no está", () => {
    const views = [view("a"), view("b")];

    expect(activeViewOf(views, "b")?.id).toBe("b");
    expect(activeViewOf(views, "z")).toBeNull();
    expect(activeViewOf(views, null)).toBeNull();
  });
});

function file(path: string, index: number): RenderFile {
  return {
    index,
    nodeId: `n:${path}`,
    path,
    name: path.split("/").pop() ?? path,
    section: 0,
    area: 10,
    actualArea: 10,
    risk: 0.5,
    riskParts: {
      complexity: { value: 0, p95: 0, norm: 0, weight: 0, share: 0 },
      churn: { value: 0, p95: 0, norm: 0, weight: 0, share: 0 },
      size: { value: 0, p95: 0, norm: 0, weight: 0, share: 0 },
      lint: { value: 0, p95: 0, norm: 0, weight: 0, share: 0 }
    },
    riskBreakdown: null,
    complexity: 1,
    churn: 0,
    lint: 0,
    values: [],
    kind: null
  };
}

const model = {
  files: [file("src/a.ts", 0), file("src/b.ts", 1)],
  sections: [{ name: "code" }],
  metrics: [],
  lintMax: 0,
  meta: {},
  roots: []
} as unknown as RenderModel;

function input(extra: Partial<PluginContextInput> = {}): PluginContextInput {
  return {
    model,
    selection: "src/a.ts",
    areaMetric: "rloc",
    colorMode: "risk",
    focusPath: "src",
    tab: "file",
    migration: null,
    select: () => {},
    selectFolder: () => {},
    setFocusPath: () => {},
    setTab: () => {},
    setAreaMetric: () => {},
    setColorMode: () => {},
    readCode: async () => null,
    storage: null,
    ...extra
  };
}

describe("el contexto de un plugin", () => {
  it("selecciona por ruta con el mismo índice que el mapa", () => {
    const elegidos: number[] = [];
    const context = buildPluginContext(
      input({ select: (index) => elegidos.push(index) })
    );

    context.actions.select("src/b.ts");
    context.actions.select("no-existe.ts");
    expect(elegidos).toEqual([1]);
  });

  it("pinta un fichero con el color del mapa y el ausente en gris", () => {
    const context = buildPluginContext(input());

    expect(context.colorFor(0)).toMatch(/^#[0-9a-f]{6}$/);
    expect(context.colorFor(9)).toBe("#d5d2ca");
  });

  it("sin modelo no hay color ni selección posible", () => {
    const elegidos: number[] = [];
    const context = buildPluginContext(
      input({ model: null, select: (index) => elegidos.push(index) })
    );

    context.actions.select("src/a.ts");
    expect(elegidos).toEqual([]);
    expect(context.colorFor(0)).toBe("#d5d2ca");
  });

  it("lee y escribe el estado de la vista sin tocar lo que no viene", () => {
    const escrituras: string[] = [];
    const context = buildPluginContext(
      input({
        setAreaMetric: (metric) => escrituras.push(`area:${metric}`),
        setColorMode: (mode) => escrituras.push(`color:${mode}`),
        setFocusPath: (path) => escrituras.push(`focus:${path}`)
      })
    );

    expect(context.url.read()).toEqual({
      areaMetric: "rloc",
      colorMode: "risk",
      focusPath: "src",
      filePath: "src/a.ts",
      tab: "file"
    });

    context.url.write({ colorMode: "loc" });
    expect(escrituras).toEqual(["color:loc"]);
  });

  it("lee código con el mismo lector que la ficha", async () => {
    const context = buildPluginContext(
      input({
        readCode: async (request) => ({
          path: request.path,
          start: 1,
          end: 2,
          total: 10,
          lines: ["uno", "dos"]
        })
      })
    );

    await expect(context.readCode("src/a.ts")).resolves.toEqual({
      lines: ["uno", "dos"],
      start: 1,
      end: 2,
      total: 10
    });
  });

  it("pasa el foco y la hoja a la app", () => {
    const pedidos: string[] = [];
    const context = buildPluginContext(
      input({
        setFocusPath: (path) => pedidos.push(`focus:${path}`),
        setTab: (tab) => pedidos.push(`tab:${tab}`)
      })
    );

    context.actions.focus("lib");
    context.actions.setTab("project");
    expect(pedidos).toEqual(["focus:lib", "tab:project"]);
  });
});
