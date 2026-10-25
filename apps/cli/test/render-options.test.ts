import { describe, expect, it } from "vitest";
import { defaultOutputPath } from "../src/commands/render";

describe("opciones de render", () => {
  it("deriva la carpeta de salida del nombre de entrada", () => {
    expect(defaultOutputPath("mapa.cc.json.gz")).toBe("mapa");
    expect(defaultOutputPath("samples/codecharta_visualization.cc.json.gz")).toBe(
      "samples/codecharta_visualization"
    );
    expect(defaultOutputPath("mapa.json")).toBe("mapa");
    expect(defaultOutputPath("mapa")).toBe("mapa.sitio");
  });
});
