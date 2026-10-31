import { describe, expect, it } from "vitest";
import {
  adviceForExtensions,
  extensionOf,
  MINIMAL_LINT
} from "../src/advice";

describe("el mínimo recomendable", () => {
  it("lee la extensión de una ruta o un nombre", () => {
    expect(extensionOf("src/app/main.TS")).toBe("ts");
    expect(extensionOf("pyproject.toml")).toBe("toml");
    expect(extensionOf("Makefile")).toBe("");
  });

  it("recomienda solo los lenguajes presentes, sin repetir", () => {
    const advice = adviceForExtensions(["ts", "tsx", ".py", "go"]);
    const tools = advice.map((entry) => entry.tool);

    expect(tools).toEqual([
      "ESLint + typescript-eslint",
      "Ruff",
      "go vet + staticcheck"
    ]);
  });

  it("un stack sin lenguajes conocidos no recomienda nada", () => {
    expect(adviceForExtensions(["md", "json"])).toEqual([]);
  });

  it("los cinco lenguajes del producto tienen su mínimo", () => {
    expect(MINIMAL_LINT.map((entry) => entry.language)).toEqual([
      "TypeScript y JavaScript",
      "Python",
      "Go",
      "Java",
      "C#"
    ]);
  });
});
