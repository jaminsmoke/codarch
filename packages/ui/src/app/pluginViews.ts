import type { PluginContext, PluginView } from "@codarch/plugin-api";
import type { RenderFile, RenderModel } from "@codarch/render/browser";
import type { CcMigrationLens } from "@codarch/schema/browser";
import type { CodeRequest, CodeSnippet } from "../platform";
import { mapColorFor, metricIndexOf } from "../map";
import type { PluginRuntime } from "../plugins";
import type { InspectorTab } from "../viewState";

/**
 * Lo que la app le enseña a un plugin (ADR 0028).
 *
 * Las vistas llegan del registro, se filtran por lo activado y se abren por
 * id; el contexto es el mismo que ve la app —el modelo, la selección, el color
 * de cada fichero— para que un plugin dibuje lo mismo que el mapa y no una
 * segunda lectura de los datos.
 */

/** Las vistas de los plugins activados, en el orden del registro. */
export function pluginViewsOf(plugins: PluginRuntime): PluginView[] {
  const views: PluginView[] = [];
  for (const descriptor of plugins.descriptors) {
    if (!plugins.enabled.includes(descriptor.manifest.name)) continue;
    const module = plugins.moduleOf(descriptor.manifest.name);
    for (const view of module?.views ?? []) views.push(view);
  }
  return views;
}

/** La vista abierta, si sigue existiendo. */
export function activeViewOf(
  views: readonly PluginView[],
  id: string | null
): PluginView | null {
  if (id === null) return null;
  return views.find((view) => view.id === id) ?? null;
}

/** Lo que necesita el contexto de un plugin. */
export interface PluginContextInput {
  model: RenderModel | null;
  /** La ruta del fichero elegido, si hay uno. */
  selection: string | null;
  /** La ruta de la carpeta elegida, si la hay. */
  selectedFolder: string | null;
  areaMetric: string | null;
  colorMode: string;
  focusPath: string | null;
  tab: InspectorTab;
  migration: CcMigrationLens | null;
  /** Elige un fichero por su índice, como el mapa. */
  select: (index: number) => void;
  /** Elige una carpeta por su ruta, sin salir de la vista. */
  selectFolder: (path: string | null) => void;
  setFocusPath: (path: string | null) => void;
  setTab: (tab: InspectorTab) => void;
  setAreaMetric: (metric: string | null) => void;
  setColorMode: (mode: string) => void;
  readCode: (request: CodeRequest) => Promise<CodeSnippet | null>;
  storage: PluginContext["storage"];
}

/** El gris del mapa: un fichero que no está no tiene color que enseñar. */
const NO_COLOR = "#d5d2ca";

/** Lo que recibe la vista de un plugin: el modelo, lo que puede pedir y el color. */
export function buildPluginContext(input: PluginContextInput): PluginContext {
  const { model } = input;
  return {
    model,
    selection: input.selection,
    selectedFolder: input.selectedFolder,
    actions: {
      select: (path: string) => {
        const index = model
          ? model.files.findIndex((file: RenderFile) => file.path === path)
          : -1;
        if (index >= 0) input.select(index);
      },
      selectFolder: (path: string) => input.selectFolder(path),
      focus: (path: string) => input.setFocusPath(path),
      setTab: (tab: InspectorTab) => input.setTab(tab)
    },
    preferences: { areaMetric: input.areaMetric, colorMode: input.colorMode },
    colorFor: (index: number) => {
      const file = model?.files[index];
      if (!file || !model) return NO_COLOR;
      return mapColorFor(
        file,
        input.colorMode,
        model,
        input.migration,
        metricIndexOf(model)
      );
    },
    readCode: async (sourcePath: string) => {
      const snippet = await input.readCode({
        path: sourcePath,
        start: 1,
        end: Number.MAX_SAFE_INTEGER,
        whole: true
      });
      return snippet
        ? {
            lines: snippet.lines,
            start: snippet.start,
            end: snippet.end,
            total: snippet.total
          }
        : null;
    },
    url: {
      read: () => ({
        areaMetric: input.areaMetric,
        colorMode: input.colorMode,
        focusPath: input.focusPath,
        filePath: input.selection,
        tab: input.tab
      }),
      write: (state) => {
        if (state.areaMetric !== undefined) input.setAreaMetric(state.areaMetric);
        if (state.colorMode !== undefined) input.setColorMode(state.colorMode);
        if (state.focusPath !== undefined) input.setFocusPath(state.focusPath);
      }
    },
    storage: input.storage
  };
}
