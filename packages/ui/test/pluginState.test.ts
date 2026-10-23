import { describe, expect, it } from "vitest";
import { nextEnabledPlugins } from "../src/pluginState";

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
