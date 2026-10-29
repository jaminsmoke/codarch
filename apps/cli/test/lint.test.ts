import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LintProcessRunner } from "@codarch/lint";
import { parseLint } from "../src/args/lint";
import { runLintCommand } from "../src/commands/lint";
import { runProjectLint } from "../src/lint-store";

const tempRoots: string[] = [];

function tempRepo(files: Record<string, string> = {}): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-lint-"));
  tempRoots.push(root);
  for (const [name, content] of Object.entries(files)) {
    const file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content, "utf8");
  }
  return root;
}

function readArtifact(file: string) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

const config = `version: 1
lint:
  - name: eslint
    command: eslint-json
    format: eslint-json
  - name: oxlint
    command: oxlint-json
    format: oxlint-json
`;

/** ESLint con un error y un aviso sobre un fichero de la raíz. */
function eslintJson(root: string): string {
  return JSON.stringify([
    {
      filePath: path.join(root, "src", "a.ts"),
      messages: [
        { ruleId: "no-var", severity: 2, message: "Unexpected var", line: 1, column: 1 },
        { ruleId: "no-debugger", severity: 1, message: "Unexpected debugger", line: 2, column: 1 }
      ]
    }
  ]);
}

function runner(root: string, options: { oxlintFails?: boolean } = {}): LintProcessRunner {
  return async (command) => {
    if (command === "eslint-json") return { stdout: eslintJson(root), stderr: "", code: 1 };
    if (command === "oxlint-json") {
      if (options.oxlintFails) throw new Error("oxlint no está instalado");
      return {
        stdout: JSON.stringify({ diagnostics: [] }),
        stderr: "",
        code: 0
      };
    }
    throw new Error(`comando inesperado: ${command}`);
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("codarch lint", () => {
  it("escribe el artefacto y no bloquea por defecto", async () => {
    const root = tempRepo({ ".codarch.yml": config });
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    const code = await runLintCommand({
      root,
      run: runner(root),
      help: false
    });

    expect(code).toBe(0);
    const file = path.join(root, ".codarch", "lint.json");
    const artifact = readArtifact(file);
    expect(artifact.meta.tools).toEqual(["eslint", "oxlint"]);
    expect(artifact.summary).toMatchObject({ errors: 1, warnings: 1 });
    // El estado local nace ignorado.
    expect(fs.readFileSync(path.join(root, ".gitignore"), "utf8")).toContain(
      ".codarch/"
    );
  });

  it("con --fail-on errors sale con error, después de escribir", async () => {
    const root = tempRepo({ ".codarch.yml": config });
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const code = await runLintCommand({
      root,
      failOn: "errors",
      run: runner(root),
      help: false
    });

    expect(code).toBe(1);
    expect(fs.existsSync(path.join(root, ".codarch", "lint.json"))).toBe(true);
  });

  it("una herramienta caída no impide escribir lo que sí se midió", async () => {
    const root = tempRepo({ ".codarch.yml": config });
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    const code = await runLintCommand({
      root,
      run: runner(root, { oxlintFails: true }),
      help: false
    });

    expect(code).toBe(0);
    const artifact = readArtifact(path.join(root, ".codarch", "lint.json"));
    expect(artifact.meta.tools).toEqual(["eslint"]);
  });

  it("si no mide ninguna herramienta, no escribe artefacto y falla", async () => {
    const root = tempRepo({ ".codarch.yml": config });
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    const code = await runLintCommand({
      root,
      run: async () => {
        throw new Error("no está");
      },
      help: false
    });

    expect(code).toBe(1);
    expect(fs.existsSync(path.join(root, ".codarch", "lint.json"))).toBe(false);
  });

  it("--out escribe el artefacto donde se pide", async () => {
    const root = tempRepo({ ".codarch.yml": config });
    const out = tempRepo();
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    const code = await runLintCommand({
      root,
      out,
      run: runner(root),
      help: false
    });

    expect(code).toBe(0);
    expect(fs.existsSync(path.join(out, "lint.json"))).toBe(true);
  });

  it("sin herramientas declaradas no hay nada que medir", async () => {
    const root = tempRepo({ ".codarch.yml": "version: 1\n" });
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const code = await runLintCommand({ root, help: false });

    expect(code).toBe(1);
    expect(error.mock.calls.join("\n")).toMatch(/bloque `lint:`/);
  });

  it("una configuración inválida se dice y no se linta", async () => {
    const root = tempRepo({
      ".codarch.yml": "lint:\n  - name: eslint\n    command: eslint .\n    format: ruff\n"
    });
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const code = await runLintCommand({ root, help: false });

    expect(code).toBe(1);
    expect(error.mock.calls.join("\n")).toMatch(/format desconocido/);
  });
});

describe("la pasada que comparten lint y serve", () => {
  it("mide con las herramientas del repo y escribe el artefacto", async () => {
    const root = tempRepo({ ".codarch.yml": config });

    const result = await runProjectLint(root, { run: runner(root) });

    expect(result?.artifact?.meta.tools).toEqual(["eslint", "oxlint"]);
    expect(fs.existsSync(path.join(root, ".codarch", "lint.json"))).toBe(true);
  });

  it("un repo sin herramientas no tiene pasada de lint", async () => {
    const root = tempRepo({ ".codarch.yml": "version: 1\n" });

    expect(await runProjectLint(root)).toBeNull();
  });
});

describe("argumentos de lint", () => {
  it("lee --fail-on en sus dos formas", () => {
    expect(parseLint(["--fail-on", "warnings"])).toMatchObject({
      failOn: "warnings",
      root: "."
    });
    expect(parseLint(["--fail-on=errors", "repo"])).toMatchObject({
      failOn: "errors",
      root: "repo"
    });
    expect(parseLint(["--no-config"])).toMatchObject({ noConfig: true });
  });

  it("rechaza un --fail-on que no conoce", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(parseLint(["--fail-on", "todo"])).toBe(1);
  });
});
