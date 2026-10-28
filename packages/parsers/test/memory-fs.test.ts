import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { analyzeFiles } from "../src/analyze-core";
import { analyzeRepository } from "../src/analyze";
import { MemoryFileSystem } from "../src/fs";
import { TypeScriptParser } from "../src/ts/parser";

/**
 * El navegador analiza con el fichero en memoria; el CLI, con el disco.
 *
 * Si el puerto de ficheros no devolviera exactamente lo mismo, el snapshot del
 * navegador y el del CLI no casarían y habríamos abierto dos verdades.
 */

const FIXTURES = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "repo"
);

/** Lee un directorio del disco como sistema de ficheros virtual. */
function memoryFrom(root: string): MemoryFileSystem {
  const files: Array<[string, string]> = [];
  const walk = (directory: string, prefix: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      const virtualPath = `${prefix}/${entry.name}`;
      if (entry.isDirectory()) {
        walk(full, virtualPath);
        continue;
      }
      if (!/\.(ts|tsx|js|jsx|json)$/.test(entry.name)) continue;
      files.push([virtualPath, fs.readFileSync(full, "utf8")]);
    }
  };
  walk(root, "");
  return new MemoryFileSystem(files);
}

describe("sistema de ficheros virtual", () => {
  it("da el mismo snapshot que el CLI con los mismos ficheros", () => {
    const memory = memoryFrom(FIXTURES);
    const inMemory = analyzeFiles({
      fileSystem: memory,
      root: "/",
      parsers: [new TypeScriptParser()]
    });

    const onDisk = analyzeRepository(FIXTURES, { git: false });

    expect(inMemory.files).toBe(onDisk.files);
    expect(inMemory.edges).toBe(onDisk.edges);
    expect(inMemory.cycles).toEqual(onDisk.cycles);
    expect(inMemory.unresolved).toEqual(onDisk.unresolved);
    expect(inMemory.snapshot.meta.checksum).toBe(onDisk.snapshot.meta.checksum);
  });

  it("las líneas no cambian el código: CRLF y LF dan el mismo snapshot", () => {
    // El export del HEAD en Windows sale con CRLF y el árbol de trabajo con
    // LF; sin normalizar, el checksum y los hashes de los símbolos cambian y
    // Cambios enseña ficheros que nadie ha tocado (ADR 0076).
    const lf = new MemoryFileSystem([
      ["/src/a.ts", "export const a = 1;\nexport const b = 2;\n"]
    ]);
    const crlf = new MemoryFileSystem([
      ["/src/a.ts", "export const a = 1;\r\nexport const b = 2;\r\n"]
    ]);

    const analyzedLf = analyzeFiles({ fileSystem: lf, root: "/", parsers: [new TypeScriptParser()] });
    const analyzedCrlf = analyzeFiles({
      fileSystem: crlf,
      root: "/",
      parsers: [new TypeScriptParser()]
    });

    expect(analyzedCrlf.snapshot.meta.checksum).toBe(analyzedLf.snapshot.meta.checksum);
    expect(analyzedCrlf.snapshot.lenses?.metrics).toEqual(
      analyzedLf.snapshot.lenses?.metrics
    );
    expect(analyzedCrlf.snapshot.lenses?.symbols).toEqual(
      analyzedLf.snapshot.lenses?.symbols
    );
  });

  it("aplica los .gitignore y las exclusiones", () => {
    const memory = memoryFrom(FIXTURES);
    const result = analyzeFiles({
      fileSystem: memory,
      root: "/",
      parsers: [new TypeScriptParser()]
    });
    const paths = result.snapshot.files.length;
    expect(paths).toBeGreaterThan(0);
    // El fixture tiene ficheros que el .gitignore excluye.
    expect(result.files).toBeLessThan(paths + 100);
  });

  it("lista los directorios a partir de los ficheros", () => {
    const memory = new MemoryFileSystem([
      ["/src/app.ts", "export const a = 1;"],
      ["/src/deep/b.ts", "export const b = 2;"],
      ["/package.json", '{"name":"demo"}']
    ]);
    expect(memory.readDirectory("/src")).toEqual([
      { name: "app.ts", isDirectory: false, isFile: true },
      { name: "deep", isDirectory: true, isFile: false }
    ]);
    expect(memory.exists("/src/deep")).toBe(true);
    expect(memory.exists("/src/falta.ts")).toBe(false);
    expect(memory.tryReadFile("/src/falta.ts")).toBeNull();
  });
});
