import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Platform } from "../src/platform";
import { useCodarchApp } from "../src/useCodarchApp";

/** Una platform sin nada opcional: lo mínimo que la app pide al arrancar. */
function makePlatform(): Platform {
  return {
    readPreferences: () => null,
    writePreferences: () => {},
    readProject: () => null,
    writeProject: () => true,
    clearProject: () => {},
    plugins: { read: () => [], write: () => {} }
  };
}

/**
 * El hook tal cual lo montan las apps, sin armazón.
 *
 * No hay efectos en el render de servidor, así que esto no prueba la carga de
 * documentos: comprueba que el pegamento se ata —estado, acciones, piezas
 * derivadas— y que sin snapshot la app contesta valores vacíos y no revienta.
 */
function App() {
  const app = useCodarchApp(makePlatform());
  return createElement(
    "p",
    null,
    JSON.stringify({
      tab: app.state.tab,
      map: app.state.map,
      loading: app.state.loading,
      hasModel: app.view.model !== null,
      detail: app.detail,
      matches: app.matches,
      colors: app.colorOptions.map((option) => option.value),
      metrics: app.metricOptions.length,
      selection: app.pluginContext.selection,
      pluginViews: app.pluginViews.length,
      actions: [
        typeof app.actions.selectIndex,
        typeof app.actions.setMap,
        typeof app.applyView,
        typeof app.actions.openSnapshot
      ],
      bridges: [
        typeof app.loadHistory,
        typeof app.loadHeat,
        typeof app.loadDiff
      ].every((kind) => kind === "function")
    })
  );
}

describe("el hook de la app", () => {
  it("arranca en el mapa del código, sin modelo y con las opciones de color", () => {
    const markup = renderToStaticMarkup(createElement(App));
    // El render escapa las comillas del texto: se deshacen para leer el JSON.
    const state = JSON.parse(
      markup
        .replace(/<\/?p>/g, "")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
    );

    expect(state).toEqual({
      tab: "file",
      map: "code",
      loading: true,
      hasModel: false,
      detail: null,
      matches: 0,
      colors: ["risk", "structure"],
      metrics: 0,
      selection: null,
      pluginViews: 0,
      actions: ["function", "function", "function", "function"],
      bridges: true
    });
  });
});
