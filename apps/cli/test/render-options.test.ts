import { describe, expect, it } from "vitest";
import { defaultOutputPath, defaultProjectName } from "../src/commands/render";

describe("opciones de render", () => {
  it("deriva la salida del nombre de entrada", () => {
    expect(defaultOutputPath("mapa.cc.json.gz")).toBe("mapa.html");
    expect(defaultOutputPath("mapa.json")).toBe("mapa.html");
    expect(defaultOutputPath("mapa")).toBe("mapa.html");
  });

  it("deriva un nombre de proyecto legible", () => {
    expect(defaultProjectName("samples/codecharta_visualization.cc.json.gz")).toBe(
      "codecharta_visualization"
    );
    expect(defaultProjectName("C:\\repo\\mi-mapa.json")).toBe("mi-mapa");
    expect(defaultProjectName("")).toBe("Proyecto sin nombre");
  });
});
