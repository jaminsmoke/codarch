import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzeState, browseDirectories } from "../src/commands/serve";

const tempDirs: string[] = [];

function tempDir(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-browse-"));
  tempDirs.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of tempDirs.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("browseDirectories", () => {
  it("lista solo carpetas y filtra directorios internos", () => {
    const root = tempDir();
    fs.mkdirSync(path.join(root, "src"));
    fs.mkdirSync(path.join(root, "docs"));
    fs.mkdirSync(path.join(root, "node_modules"));
    fs.mkdirSync(path.join(root, ".git"));
    fs.writeFileSync(path.join(root, "README.md"), "hola");

    const result = browseDirectories(root, null);

    expect(result.path).toBe(root);
    expect(result.parent).toBe(path.dirname(root));
    expect(result.entries.map((entry) => entry.name)).toEqual(["docs", "src"]);
    expect(result.entries[0]?.kind).toBe("directory");
  });

  it("navega a una subcarpeta y devuelve su padre", () => {
    const root = tempDir();
    const nested = path.join(root, "packages", "core");
    fs.mkdirSync(nested, { recursive: true });

    const result = browseDirectories(root, nested);

    expect(result.path).toBe(nested);
    expect(result.parent).toBe(path.join(root, "packages"));
    expect(result.entries).toEqual([]);
  });

  it("rechaza ficheros", () => {
    const root = tempDir();
    const file = path.join(root, "file.txt");
    fs.writeFileSync(file, "x");

    expect(() => browseDirectories(root, file)).toThrow("no es un directorio");
  });
});

describe("analyzeState", () => {
  it("relee el alcance del .codarch.yml en cada análisis", () => {
    const root = tempDir();
    fs.mkdirSync(path.join(root, "src", "skip"), { recursive: true });
    fs.writeFileSync(
      path.join(root, "src", "keep.ts"),
      "export const keep = 1;\n"
    );
    fs.writeFileSync(
      path.join(root, "src", "skip", "a.ts"),
      "export const a = 1;\n"
    );
    const config = path.join(root, ".codarch.yml");
    fs.writeFileSync(config, "version: 1\nignore:\n  - src/skip/**\n");

    expect(analyzeState(root, false).files).toBe(1);

    fs.writeFileSync(config, "version: 1\nignore: []\n");
    expect(analyzeState(root, false).files).toBe(2);
  });

  it("guarda la caché de parseo y el servidor siguiente la encuentra", async () => {
    const root = tempDir();
    fs.mkdirSync(path.join(root, "src"));
    fs.writeFileSync(path.join(root, "src", "a.ts"), "export const a = 1;\n");
    fs.writeFileSync(path.join(root, "src", "b.ts"), "export const b = 2;\n");

    const state = analyzeState(root, false);

    // Lo que escribe el servidor es derivado: la caché de su propia pasada.
    const payload = JSON.parse(
      fs.readFileSync(path.join(root, ".codarch", "parse-cache.json"), "utf8")
    ) as { root: string; entries: Record<string, unknown> };
    expect(payload.root).toBe(path.resolve(root));
    expect(Object.keys(payload.entries).sort()).toEqual([
      "src/a.ts",
      "src/b.ts"
    ]);

    // Un servidor nuevo —sesión nueva, como al reiniciar— la lee del disco y da
    // el mismo checksum que el análisis en frío.
    vi.resetModules();
    const fresh = await import("../src/commands/serve");
    expect(fresh.analyzeState(root, false).checksum).toBe(state.checksum);
  }, 20_000);
});
