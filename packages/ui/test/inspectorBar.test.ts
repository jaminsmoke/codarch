import { describe, expect, it } from "vitest";
import { INSPECTOR_SECTIONS, inspectorLabel } from "../src/InspectorBar";

describe("la barra del inspector", () => {
  it("tiene una entrada por apartado, en su orden", () => {
    expect(INSPECTOR_SECTIONS.map((section) => section.id)).toEqual([
      "file",
      "folder",
      "changes"
    ]);
  });

  it("cada entrada lleva nombre y pista, y ninguno se repite", () => {
    const labels = INSPECTOR_SECTIONS.map((section) => section.label);
    expect(new Set(labels).size).toBe(labels.length);
    for (const section of INSPECTOR_SECTIONS) {
      expect(section.label.trim()).not.toBe("");
      expect(section.hint.trim()).not.toBe("");
    }
  });

  it("el panel se anuncia con el nombre de su apartado", () => {
    expect(inspectorLabel("file")).toBe("Fichero");
    expect(inspectorLabel("folder")).toBe("Carpeta");
    expect(inspectorLabel("changes")).toBe("Cambios");
  });
});
