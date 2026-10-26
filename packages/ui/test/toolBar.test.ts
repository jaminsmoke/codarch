import { describe, expect, it } from "vitest";
import { TOOL_ENTRIES, toolLabel } from "../src/ToolBar";

describe("la barra de herramientas", () => {
  it("tiene una entrada por herramienta, en su orden", () => {
    expect(TOOL_ENTRIES.map((entry) => entry.id)).toEqual(["map"]);
  });

  it("cada entrada lleva nombre y pista, y ninguno se repite", () => {
    const labels = TOOL_ENTRIES.map((entry) => entry.label);
    expect(new Set(labels).size).toBe(labels.length);
    for (const entry of TOOL_ENTRIES) {
      expect(entry.label.trim()).not.toBe("");
      expect(entry.hint.trim()).not.toBe("");
    }
  });

  it("la hoja se anuncia con el nombre de su herramienta", () => {
    expect(toolLabel("map")).toBe("Mapa");
  });
});
