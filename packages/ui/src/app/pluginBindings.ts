import { useMemo } from "react";
import type { PluginContext } from "@codarch/plugin-api";
import type { RenderFile, RenderModel } from "@codarch/render/browser";
import type { readMigration } from "../data";
import type { CodeRequest, CodeSnippet } from "../platform";
import { localStore } from "../storage-local";
import type { PluginRuntime } from "../plugins";
import type { InspectorTab } from "../viewState";
import {
  activeViewOf,
  buildPluginContext,
  pluginViewsOf
} from "./pluginViews";

/**
 * Lo que la app le da a un plugin: sus vistas y su contexto.
 *
 * Los plugins activados aportan vistas —el registro lo genera el build— y
 * reciben el mismo modelo, la misma selección y el mismo color que el mapa, para
 * que dibujen lo mismo y no una segunda lectura de los datos (ADR 0028).
 */

export interface PluginBindingsInput {
  plugins: PluginRuntime;
  /** La vista abierta por su id, si hay una. */
  pluginView: string | null;
  model: RenderModel | null;
  selectedFile: RenderFile | null;
  areaMetric: string | null;
  colorMode: string;
  focusPath: string | null;
  tab: InspectorTab;
  migration: ReturnType<typeof readMigration>;
  select: (index: number) => void;
  setFocusPath: (path: string | null) => void;
  setTab: (tab: InspectorTab) => void;
  setAreaMetric: (metric: string | null) => void;
  setColorMode: (mode: string) => void;
  readCode: (request: CodeRequest) => Promise<CodeSnippet | null>;
}

export function usePluginBindings(input: PluginBindingsInput) {
  const {
    plugins,
    pluginView,
    model,
    selectedFile,
    areaMetric,
    colorMode,
    focusPath,
    tab,
    migration,
    select,
    setFocusPath,
    setTab,
    setAreaMetric,
    setColorMode,
    readCode
  } = input;

  const pluginViews = useMemo(() => pluginViewsOf(plugins), [plugins]);
  const activePluginView = activeViewOf(pluginViews, pluginView);

  const pluginContext = useMemo<PluginContext>(
    () =>
      buildPluginContext({
        model,
        selection: selectedFile?.path ?? null,
        areaMetric,
        colorMode,
        focusPath,
        tab,
        migration,
        select,
        setFocusPath,
        setTab,
        setAreaMetric,
        setColorMode,
        readCode,
        storage: localStore()
      }),
    [
      model,
      selectedFile,
      areaMetric,
      colorMode,
      focusPath,
      tab,
      migration,
      select,
      setFocusPath,
      setTab,
      setAreaMetric,
      setColorMode,
      readCode
    ]
  );

  return { pluginViews, activePluginView, pluginContext };
}
