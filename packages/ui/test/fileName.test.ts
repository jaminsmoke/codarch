import { describe, expect, it } from "vitest";
import { splitFileName } from "../src/fileName";

describe("el nombre del fichero en la cabecera", () => {
  it("separa la extensión, que es donde puede partir la línea", () => {
    expect(splitFileName("CollapsibleSection.tsx")).toEqual({
      base: "CollapsibleSection",
      ext: ".tsx"
    });
  });

  it("parte por el último punto, no por el primero", () => {
    expect(splitFileName("serve.test.ts")).toEqual({
      base: "serve.test",
      ext: ".ts"
    });
  });

  it("no inventa extensión en un nombre oculto, sin punto o con punto final", () => {
    expect(splitFileName(".gitignore")).toEqual({ base: ".gitignore", ext: "" });
    expect(splitFileName("Makefile")).toEqual({ base: "Makefile", ext: "" });
    expect(splitFileName("fichero.")).toEqual({ base: "fichero.", ext: "" });
  });
});
