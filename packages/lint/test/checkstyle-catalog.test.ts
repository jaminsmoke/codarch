import { describe, expect, it } from "vitest";
import { checkstyleContainer, checkstyleGroups } from "../src/checkstyle-catalog";

describe("el catálogo curado de Checkstyle", () => {
  it("coloca los módulos nuevos en su contenedor", () => {
    expect(checkstyleContainer("AbbreviationAsWordInName")).toBe("TreeWalker");
    expect(checkstyleContainer("RegexpOnFilename")).toBe("Checker");
    expect(checkstyleContainer("NoCodeInFile")).toBe("Checker");
  });

  it("no adivina un módulo desconocido", () => {
    expect(checkstyleContainer("ModuloInventado")).toBeNull();
  });

  it("no repite un módulo entre contenedores", () => {
    const groups = checkstyleGroups();
    const names = groups.flatMap((group) => group.rules);
    expect(new Set(names).size).toBe(names.length);
  });
});
