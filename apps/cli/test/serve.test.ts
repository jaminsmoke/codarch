import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { browseDirectories } from "../src/commands/serve";

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
