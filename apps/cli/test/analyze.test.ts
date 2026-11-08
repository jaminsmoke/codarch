import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fileId, getStats, parseCcJson } from "@codarch/schema";
import { runAnalyze } from "../src/commands/analyze";

const tempRoots: string[] = [];

function tempRepo(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-analyze-"));
  tempRoots.push(root);
  for (const [name, content] of Object.entries(files)) {
    const file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content, "utf8");
  }
  return root;
}

function readSnapshot(outDirectory: string) {
  const raw = fs.readFileSync(
    path.join(outDirectory, "snapshot.cc.json"),
    "utf8"
  );
  return parseCcJson(JSON.parse(raw));
}

function readRest(outDirectory: string) {
  const raw = fs.readFileSync(path.join(outDirectory, "rest.cc.json"), "utf8");
  return parseCcJson(JSON.parse(raw));
}

/** Una carpeta de salida fuera del repo: dentro, el análisis la vería. */
function tempOut(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-out-"));
  tempRoots.push(directory);
  return directory;
}

afterEach(async () => {
  vi.restoreAllMocks();
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("alcance de analyze", () => {
  it("lee ignore del .codarch.yml y suma el --ignore puntual", async () => {
    const root = tempRepo({
      ".codarch.yml": "version: 1\nignore:\n  - src/config-skip/**\n",
      "src/keep.ts": "export const keep = 1;\n",
      "src/config-skip/a.ts": "export const a = 1;\n",
      "src/cli-skip/b.ts": "export const b = 1;\n"
    });
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    const code = await runAnalyze({
      root,
      out: path.join(root, "out"),
      ignore: ["src/cli-skip/**"],
      git: false,
      help: false
    });

    expect(code).toBe(0);
    expect(getStats(readSnapshot(path.join(root, "out"))).files).toBe(1);
  });

  it("con --no-config no aplica el alcance del YAML", async () => {
    const root = tempRepo({
      ".codarch.yml": "version: 1\nignore:\n  - src/skip/**\n",
      "src/keep.ts": "export const keep = 1;\n",
      "src/skip/a.ts": "export const a = 1;\n"
    });
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    const code = await runAnalyze({
      root,
      out: path.join(root, "out"),
      noConfig: true,
      git: false,
      help: false
    });

    expect(code).toBe(0);
    expect(getStats(readSnapshot(path.join(root, "out"))).files).toBe(2);
  });

  it("falla con un alcance inválido antes de analizar", async () => {
    const root = tempRepo({
      ".codarch.yml": "version: 1\nignore: fixtures/**\n",
      "src/keep.ts": "export const keep = 1;\n"
    });
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const code = await runAnalyze({
      root,
      out: path.join(root, "out"),
      git: false,
      help: false
    });

    expect(code).toBe(1);
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("configuración inválida")
    );
    expect(fs.existsSync(path.join(root, "out", "snapshot.cc.json"))).toBe(
      false
    );
  });
});

describe("el resumen de analyze", () => {
  it("cuenta las fases en orden, de la raíz al churn", async () => {
    const root = tempRepo({
      "src/a.ts": "export const a = 1;\n",
      "src/b.ts": "import { a } from './a';\nexport const b = () => a;\n"
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    const code = await runAnalyze({
      root,
      out: path.join(root, "out"),
      git: false,
      help: false
    });

    expect(code).toBe(0);
    const salida = String(log.mock.calls[0]?.[0] ?? "");
    const etiquetas = salida
      .split("\n")
      .filter(
        (line) =>
          line.startsWith("  ") &&
          line.trim() !== "" &&
          !line.includes("CodArch ·")
      )
      .map((line) => line.trim().split(/\s+/)[0]);

    // El orden es la lectura del comando: qué se analizó, qué se guardó y
    // cómo fue. Un campo que se cuela cambia esta lista.
    expect(etiquetas).toEqual([
      "raíz",
      "snapshot",
      "resto",
      "lint",
      "estructura",
      "imports",
      "migración",
      "parseo",
      "alcances",
      "tiempo",
      "churn"
    ]);
    expect(salida).toContain("2 ficheros");
    expect(salida).toContain("sin git; se omite churn");
  });
});

describe("el resto de analyze", () => {
  it("escribe su snapshot aparte y no lo mezcla con el código", async () => {
    const root = tempRepo({
      "src/a.ts": "export const a = 1;\n",
      "README.md": "# Hola\n\nDos líneas.\n",
      "data/logo.png": "PNG\n"
    });
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    expect(
      await runAnalyze({
        root,
        out: path.join(root, "out"),
        git: false,
        help: false
      })
    ).toBe(0);

    const code = readSnapshot(path.join(root, "out"));
    expect(getStats(code).files).toBe(1);

    const rest = readRest(path.join(root, "out"));
    expect(rest.meta.checksum).toMatch(/^[0-9a-f]{32}$/);
    expect(rest.meta.checksum).not.toBe(code.meta.checksum);
    expect(rest.lenses?.rest?.nodes[fileId("README.md")]).toEqual({
      kind: "doc",
      loc: 3
    });
    expect(rest.lenses?.rest?.nodes[fileId("data/logo.png")]?.kind).toBe(
      "asset"
    );
    expect(
      rest.lenses?.metrics?.attributes[fileId("data/logo.png")]?.bytes
    ).toBeGreaterThan(0);
  });

  it("un documento que cambia mueve su checksum y no el del código", async () => {
    const root = tempRepo({
      "src/a.ts": "export const a = 1;\n",
      "README.md": "# Hola\n"
    });
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    // La salida va fuera del repo: dentro, el segundo análisis la leería.
    const out = tempOut();

    await runAnalyze({ root, out, git: false, help: false });
    const code = readSnapshot(out).meta.checksum;
    const rest = readRest(out).meta.checksum;

    fs.appendFileSync(path.join(root, "README.md"), "Una línea más.\n");
    await runAnalyze({ root, out, git: false, help: false });

    expect(readSnapshot(out).meta.checksum).toBe(code);
    expect(readRest(out).meta.checksum).not.toBe(rest);
  });

  it("deja el mismo resto byte a byte en dos pasadas", async () => {
    const root = tempRepo({
      "src/a.ts": "export const a = 1;\n",
      "README.md": "[Guía](docs/guia.md)\n",
      "docs/guia.md": "# Guía\n"
    });
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const first = tempOut();
    const second = tempOut();

    await runAnalyze({ root, out: first, git: false, help: false });
    await runAnalyze({ root, out: second, git: false, help: false });

    const read = (out: string) =>
      fs.readFileSync(path.join(out, "rest.cc.json"), "utf8");
    expect(read(second)).toBe(read(first));
    expect(readRest(first).meta.checksum).toBe(readRest(second).meta.checksum);
  });
});

describe("el lint de la pasada (ADR 0099)", () => {
  const LINT_CONFIG = `version: 1
lint:
  - name: eslint
    command: eslint-json
    format: eslint-json
`;

  it("mide el lint del proyecto y lo firma con el árbol analizado", async () => {
    const root = tempRepo({
      ".codarch.yml": LINT_CONFIG,
      "src/a.ts": "export const a = 1;\n"
    });
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    const code = await runAnalyze({
      root,
      git: false,
      help: false,
      lintRun: async () => ({
        stdout: JSON.stringify([
          // Un fichero limpio y otro con un error: el limpio también se midió.
          { filePath: path.join(root, "src", "a.ts"), messages: [] },
          {
            filePath: path.join(root, "src", "b.ts"),
            messages: [
              { ruleId: "no-var", severity: 2, message: "var", line: 1 }
            ]
          }
        ]),
        stderr: "",
        code: 1
      })
    });

    expect(code).toBe(0);
    const artifact = JSON.parse(
      fs.readFileSync(path.join(root, ".codarch", "lint.repmod.json"), "utf8")
    ) as { schemaVersion: string; meta: { tree: string }; summary: object };
    expect(artifact.schemaVersion).toBe("1.3");
    expect(artifact.meta.tree).toBe(
      readSnapshot(path.join(root, ".codarch")).meta.checksum
    );
    expect(artifact.summary).toMatchObject({ files: 1, measured: 2 });
  });

  it("con --no-lint no se lanza ningún linter", async () => {
    const root = tempRepo({
      ".codarch.yml": LINT_CONFIG,
      "src/a.ts": "export const a = 1;\n"
    });
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    let called = false;

    const code = await runAnalyze({
      root,
      git: false,
      noLint: true,
      help: false,
      lintRun: async () => {
        called = true;
        return { stdout: "[]", stderr: "", code: 0 };
      }
    });

    expect(code).toBe(0);
    expect(called).toBe(false);
    expect(fs.existsSync(path.join(root, ".codarch", "lint.repmod.json"))).toBe(
      false
    );
  });

  it("dice que el proyecto no declara lint en vez de fingir ceros", async () => {
    const root = tempRepo({ "src/a.ts": "export const a = 1;\n" });
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await runAnalyze({ root, git: false, help: false });

    const text = log.mock.calls.map((call) => call.map(String).join(" ")).join("\n");
    expect(text).toContain("el proyecto no declara lint");
    expect(fs.existsSync(path.join(root, ".codarch", "lint.repmod.json"))).toBe(
      false
    );
  });
});

describe("la carpeta del producto", () => {
  it("borra lo que no reconoce y dice qué se llevó", async () => {
    const root = tempRepo({ "src/a.ts": "export const a = 1;\n" });
    const codarch = path.join(root, ".codarch");
    fs.mkdirSync(path.join(codarch, "backup"), { recursive: true });
    fs.writeFileSync(path.join(codarch, "backup", "viejo.json"), "{}");
    fs.writeFileSync(path.join(codarch, "lint.json"), "{}");
    fs.writeFileSync(path.join(codarch, "map.html"), "<html></html>");
    // El estado local no se toca aunque esta pasada no lo escriba.
    fs.writeFileSync(
      path.join(codarch, "preferences.json"),
      '{"color":"riesgo"}'
    );
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const code = await runAnalyze({
      root,
      git: false,
      noLint: true,
      help: false
    });

    expect(code).toBe(0);
    expect(fs.existsSync(path.join(codarch, "snapshot.cc.json"))).toBe(true);
    expect(fs.existsSync(path.join(codarch, "lint.json"))).toBe(false);
    expect(fs.existsSync(path.join(codarch, "map.html"))).toBe(false);
    expect(fs.existsSync(path.join(codarch, "backup"))).toBe(false);
    expect(
      fs.readFileSync(path.join(codarch, "preferences.json"), "utf8")
    ).toContain("riesgo");
    // El aviso dice qué se borró, en orden: la carpeta no se escribe a mano.
    expect(String(warn.mock.calls[0]?.[0] ?? "")).toContain(
      "backup, lint.json, map.html"
    );
  });

  it("no limpia una salida de --out ni crea el .codarch del repo", async () => {
    const root = tempRepo({ "src/a.ts": "export const a = 1;\n" });
    const out = tempOut();
    fs.writeFileSync(path.join(out, "mio.json"), "{}");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    const code = await runAnalyze({
      root,
      out,
      git: false,
      noLint: true,
      help: false
    });

    expect(code).toBe(0);
    expect(fs.existsSync(path.join(out, "mio.json"))).toBe(true);
    expect(fs.existsSync(path.join(root, ".codarch"))).toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });
});
