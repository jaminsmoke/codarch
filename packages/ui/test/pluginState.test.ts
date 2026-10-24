import { describe, expect, it } from "vitest";
import { nextEnabledPlugins, summarizePlugins } from "../src/pluginState";

describe("plugins activados", () => {
  it("activa uno nuevo al final", () => {
    expect(nextEnabledPlugins(["vista-3d"], "panel", true)).toEqual([
      "vista-3d",
      "panel"
    ]);
  });

  it("no repite un plugin que ya estaba activo", () => {
    expect(nextEnabledPlugins(["vista-3d", "panel"], "vista-3d", true)).toEqual([
      "vista-3d",
      "panel"
    ]);
  });

  it("desactiva el plugin nombrado y respeta el orden", () => {
    expect(nextEnabledPlugins(["vista-3d", "panel"], "vista-3d", false)).toEqual([
      "panel"
    ]);
  });

  it("desactivar uno que no estaba no toca la lista", () => {
    expect(nextEnabledPlugins(["vista-3d"], "panel", false)).toEqual([
      "vista-3d"
    ]);
  });
});

describe("el resumen de la tienda", () => {
  it("cuenta instalados, activos y caídos", () => {
    expect(
      summarizePlugins(
        ["vista-3d", "panel", "grafo"],
        ["vista-3d", "grafo"],
        ["grafo"]
      )
    ).toEqual({ installed: 3, enabled: 2, failed: 1 });
  });

  it("no cuenta un activado que ya no está instalado", () => {
    expect(
      summarizePlugins(["vista-3d"], ["vista-3d", "fantasma"], [])
    ).toEqual({ installed: 1, enabled: 1, failed: 0 });
  });
});
