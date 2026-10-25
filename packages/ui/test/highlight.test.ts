import { describe, expect, it } from "vitest";
import { highlightLine, languageForPath } from "../src/highlight";

describe("el resaltado del código", () => {
  it("elige el lenguaje por la extensión", () => {
    expect(languageForPath("src/App.tsx")).toBe("tsx");
    expect(languageForPath("src/App.ts")).toBe("typescript");
  });

  it("marca palabras clave y cadenas", () => {
    const html = highlightLine('export const nombre = "CodArch";', "a.ts");

    expect(html).toContain("token keyword");
    expect(html).toContain("token string");
  });

  it("escapa el HTML del fuente", () => {
    const html = highlightLine('const html = "<script>";', "a.ts");

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;");
  });

  it("deja vacía una línea vacía", () => {
    expect(highlightLine("", "a.ts")).toBe("");
  });
});
