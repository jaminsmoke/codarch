import { describe, expect, it } from "vitest";
import { TOOL_ENTRIES, toolLabel } from "../src/ToolBar";

describe("la barra de herramientas", () => {
  it("tiene una entrada por mapa, en su orden", () => {
    // El código primero porque es el mapa que abre: el resto es un segundo
    // snapshot opcional (ADR 0093).
    expect(TOOL_ENTRIES.map((entry) => entry.id)).toEqual(["code", "rest"]);
  });

  it("cada entrada lleva nombre y pista, y ninguno se repite", () => {
    const labels = TOOL_ENTRIES.map((entry) => entry.label);
    expect(new Set(labels).size).toBe(labels.length);
    for (const entry of TOOL_ENTRIES) {
      expect(entry.label.trim()).not.toBe("");
      expect(entry.hint.trim()).not.toBe("");
    }
  });

  it("la hoja se anuncia con el nombre del mapa que enseña", () => {
    expect(toolLabel("code")).toBe("Mapa");
    expect(toolLabel("rest")).toBe("Docs y config");
  });
});
