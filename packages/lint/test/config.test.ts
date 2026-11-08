import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { LintError, loadLintConfig, parseLintConfig } from "../src/index";

const tempFiles: string[] = [];

function tempConfig(content: string): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-lint-config-"));
  tempFiles.push(directory);
  const file = path.join(directory, ".codarch.yml");
  fs.writeFileSync(file, content, "utf8");
  return file;
}

afterEach(() => {
  for (const directory of tempFiles.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("el bloque lint de .codarch.yml", () => {
  it("lee las herramientas del ejemplo del ADR", () => {
    const tools = parseLintConfig({
      version: 1,
      lint: [
        { name: "eslint", command: "npx eslint . --format json", format: "eslint-json" },
        { name: "oxlint", command: "npx oxlint --format json .", format: "oxlint-json" }
      ]
    });

    expect(tools).toEqual([
      { name: "eslint", command: "npx eslint . --format json", format: "eslint-json" },
      { name: "oxlint", command: "npx oxlint --format json .", format: "oxlint-json" }
    ]);
  });

  it("una herramienta puede declarar el comando que lista su universo", () => {
    const tools = parseLintConfig({
      lint: [
        {
          name: "oxlint",
          command: "npx oxlint --format json .",
          format: "oxlint-json",
          list: "npx oxlint --debug=files ."
        }
      ]
    });

    expect(tools).toEqual([
      {
        name: "oxlint",
        command: "npx oxlint --format json .",
        format: "oxlint-json",
        listCommand: "npx oxlint --debug=files ."
      }
    ]);
  });

  it("sin bloque lint no hay herramientas, y no es un error", () => {
    expect(parseLintConfig({ version: 1 })).toEqual([]);
    expect(parseLintConfig(null)).toEqual([]);
  });

  it("rechaza un bloque que no es una lista", () => {
    expect(() => parseLintConfig({ lint: { name: "eslint" } })).toThrow(
      LintError
    );
  });

  it("rechaza una herramienta sin nombre, sin comando o repetida", () => {
    const valid = { name: "eslint", command: "npx eslint .", format: "eslint-json" };

    expect(() => parseLintConfig({ lint: [{ ...valid, name: " " }] })).toThrow(
      /no lleva name/
    );
    expect(() =>
      parseLintConfig({ lint: [{ ...valid, command: "" }] })
    ).toThrow(/no lleva command/);
    expect(() => parseLintConfig({ lint: [valid, valid] })).toThrow(
      /repite la herramienta/
    );
  });

  it("acepta los cuatro dialectos y rechaza uno inventado", () => {
    for (const format of [
      "eslint-json",
      "oxlint-json",
      "biome-json",
      "ruff-json",
      "checkstyle-xml",
      "govet-text",
      "dotnet-text"
    ]) {
      expect(
        parseLintConfig({ lint: [{ name: "x", command: "x", format }] })
      ).toHaveLength(1);
    }

    expect(() =>
      parseLintConfig({
        lint: [{ name: "x", command: "x", format: "lint-json" }]
      })
    ).toThrow(
      /format desconocido.*eslint-json, oxlint-json, biome-json, ruff-json, checkstyle-xml, govet-text y dotnet-text/
    );
  });

  it("lee un fichero y dice cuál falla", () => {
    const file = tempConfig(
      "version: 1\nlint:\n  - name: eslint\n    command: npx eslint . --format json\n    format: eslint-json\n"
    );

    expect(loadLintConfig(file)).toHaveLength(1);

    const broken = tempConfig("lint:\n  - name: eslint\n");
    expect(() => loadLintConfig(broken)).toThrow(LintError);
    expect(() => loadLintConfig(path.join(broken, "nope.yml"))).toThrow(
      /no se pudo leer/
    );
  });
});
