import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  LintError,
  loadDocsConfig,
  parseDocsConfig,
  parseDocsYaml
} from "../src/index";

const tempFiles: string[] = [];

function tempConfig(content: string): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-docs-config-"));
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

describe("el bloque docs de .codarch.yml", () => {
  it("lee el ejemplo del ADR 0105", () => {
    const docs = parseDocsConfig({
      version: 1,
      docs: {
        entries: ["README.md", "docs/index.md"],
        twins: [{ from: "docs", to: "docs/en" }],
        frontmatter: [
          {
            files: "docs/**/*.md",
            required: ["title", "description", "section", "sidebar"]
          }
        ],
        severity: { "doc/orphan": "info" }
      }
    });

    expect(docs).toEqual({
      entries: ["README.md", "docs/index.md"],
      twins: [{ from: "docs", to: "docs/en" }],
      frontmatter: [
        {
          files: "docs/**/*.md",
          required: ["title", "description", "section", "sidebar"]
        }
      ],
      severity: { "doc/orphan": "info" }
    });
  });

  it("sin bloque docs no hay reglas, y no es un error", () => {
    expect(parseDocsConfig({ version: 1 })).toEqual({});
    expect(parseDocsConfig(null)).toEqual({});
    expect(parseDocsYaml("version: 1\n")).toEqual({});
  });

  it("rechaza un bloque que no es un objeto y claves desconocidas", () => {
    expect(() => parseDocsConfig({ docs: [] })).toThrow(LintError);
    expect(() => parseDocsConfig({ docs: { orphan: [] } })).toThrow(
      /clave desconocida/
    );
  });

  it("rechaza gemelas sin from/to y frontmatter sin files/required", () => {
    expect(() =>
      parseDocsConfig({ docs: { twins: [{ from: "docs" }] } })
    ).toThrow(/no lleva to/);
    expect(() =>
      parseDocsConfig({
        docs: { frontmatter: [{ files: "docs/**/*.md" }] }
      })
    ).toThrow(/no lleva required/);
  });

  it("rechaza severidades y reglas inventadas", () => {
    expect(() =>
      parseDocsConfig({
        docs: { severity: { "doc/orphan": "fatal" } }
      })
    ).toThrow(/error, warn o info/);
    expect(() =>
      parseDocsConfig({
        docs: { severity: { "doc/inventada": "error" } }
      })
    ).toThrow(/regla desconocida/);
  });

  it("lee un fichero y dice cuál falla", () => {
    const file = tempConfig(
      "version: 1\ndocs:\n  entries:\n    - README.md\n"
    );
    expect(loadDocsConfig(file)).toEqual({ entries: ["README.md"] });

    const broken = tempConfig("docs:\n  twins: hola\n");
    expect(() => loadDocsConfig(broken)).toThrow(LintError);
    expect(() => loadDocsConfig(path.join(broken, "nope.yml"))).toThrow(
      /no se pudo leer/
    );
  });
});
