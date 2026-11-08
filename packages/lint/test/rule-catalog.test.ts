import { describe, expect, it } from "vitest";
import { listLintRules } from "../src/index";

describe("el catálogo de reglas conocidas", () => {
  it("enumera el núcleo y los plugins de ESLint del proyecto", async () => {
    const catalog = await listLintRules(process.cwd(), "eslint");
    const core = catalog.groups.find((group) => group.plugin === "core");
    const typescript = catalog.groups.find(
      (group) => group.plugin === "@typescript-eslint"
    );

    expect(catalog.source).toBe("project");
    expect(core?.rules.length).toBeGreaterThan(100);
    expect(typescript?.rules).toContain(
      "@typescript-eslint/no-explicit-any"
    );
  });

  it("enumera las reglas del esquema de oxlint", async () => {
    const catalog = await listLintRules(process.cwd(), "oxlint");
    const all = catalog.groups.flatMap((group) => group.rules);

    expect(catalog.source).toBe("project");
    expect(all).toContain("no-var");
    expect(all.length).toBeGreaterThan(100);
  });

  it("una herramienta sin catálogo lo dice y no inventa", async () => {
    const catalog = await listLintRules(process.cwd(), "ruff");
    expect(catalog.groups).toEqual([]);
    expect(catalog.source).toBe("active");
    expect(catalog.note).toMatch(/No se puede enumerar/);
  });

  it("Biome sin esquema instalado no inventa su catálogo", async () => {
    const catalog = await listLintRules(process.cwd(), "biome");
    expect(catalog.groups).toEqual([]);
    expect(catalog.source).toBe("active");
    expect(catalog.note).toMatch(/esquema de Biome/);
  });
});
