import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  NodeFileSystem,
  ParseCache,
  TypeScriptParser,
  analyzeFiles,
  analyzeRepository
} from "../src/index";
import type { DirectoryEntry, FileSystem } from "../src/index";

// La regla del análisis incremental (ADR 0056): reutilizar el parseo no puede
// cambiar el resultado. Cada caso compara contra un análisis completo del mismo
// árbol, y también el checksum, que es lo que el resto del producto usa como
// identidad del snapshot.

const tempRoots: string[] = [];

function proyecto(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-incremental-"));
  tempRoots.push(root);
  fs.mkdirSync(path.join(root, "src"));
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({ name: "incremental" }),
    "utf8"
  );
  fs.writeFileSync(
    path.join(root, "src", "a.ts"),
    [
      'import { b } from "./b";',
      "export const a = (x: number) => (x > 0 ? x : -x);",
      "export function useB(value: number) {",
      "  return b(value);",
      "}"
    ].join("\n"),
    "utf8"
  );
  fs.writeFileSync(
    path.join(root, "src", "b.ts"),
    ["export function b(value: number) {", "  if (value > 1) return value;", "  return 0;", "}"].join("\n"),
    "utf8"
  );
  fs.writeFileSync(
    path.join(root, "src", "c.ts"),
    ["export interface C {", "  name: string;", "}"].join("\n"),
    "utf8"
  );
  return root;
}

/** Escribe un fichero y le mueve la fecha: una versión nueva, aunque pese igual. */
function escribir(file: string, content: string): void {
  fs.writeFileSync(file, content, "utf8");
  const later = new Date(Date.now() + 2000);
  fs.utimesSync(file, later, later);
}

/** Un puerto que cuenta lo que se lee, para probar que no se relee. */
class CountingFileSystem implements FileSystem {
  readonly caseSensitive = true;
  readonly reads: string[] = [];
  private readonly inner: NodeFileSystem;

  constructor(root: string) {
    this.inner = new NodeFileSystem(root);
  }

  readFile(target: string): string {
    this.reads.push(target);
    return this.inner.readFile(target);
  }

  tryReadFile(target: string): string | null {
    this.reads.push(target);
    return this.inner.tryReadFile(target);
  }

  readDirectory(target: string): DirectoryEntry[] {
    return this.inner.readDirectory(target);
  }

  exists(target: string): boolean {
    return this.inner.exists(target);
  }

  stat(target: string) {
    return this.inner.stat(target);
  }
}

function incremental(root: string, cache: ParseCache, fileSystem?: FileSystem) {
  return analyzeFiles({
    fileSystem: fileSystem ?? new NodeFileSystem(root),
    parsers: [new TypeScriptParser()],
    projectName: "incremental",
    cache
  });
}

function completo(root: string) {
  return analyzeRepository(root, { git: false });
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("el análisis incremental", () => {
  it("reutiliza el parseo y no vuelve a leer lo que no cambió", () => {
    const root = proyecto();
    const cache = new ParseCache();

    const primero = incremental(root, cache);
    expect(primero.cache).toEqual({ hits: 0, misses: 3 });

    const disco = new CountingFileSystem(root);
    const segundo = incremental(root, cache, disco);
    expect(segundo.cache).toEqual({ hits: 3, misses: 0 });
    // Ni un solo `readFile` de los tres ficheros: se fía de la versión.
    expect(disco.reads.filter((p) => /\.(ts)$/.test(p))).toEqual([]);
    expect(segundo.snapshot).toEqual(primero.snapshot);
    expect(segundo.snapshot.meta.checksum).toBe(primero.snapshot.meta.checksum);
  });

  it("reparsea solo el fichero tocado y da lo mismo que un análisis completo", () => {
    const root = proyecto();
    const cache = new ParseCache();
    incremental(root, cache);

    escribir(
      path.join(root, "src", "b.ts"),
      ["export function b(value: number) {", "  if (value > 2) return value * 2;", "  return 0;", "}"].join("\n")
    );

    const delta = incremental(root, cache);
    expect(delta.cache).toEqual({ hits: 2, misses: 1 });
    expect(delta.snapshot).toEqual(completo(root).snapshot);
  });

  it("ve un cambio del mismo tamaño con otra fecha", () => {
    const root = proyecto();
    const cache = new ParseCache();
    incremental(root, cache);

    escribir(path.join(root, "src", "c.ts"), "export interface D {\n  name: string;\n}");

    const delta = incremental(root, cache);
    expect(delta.cache).toEqual({ hits: 2, misses: 1 });
    expect(delta.snapshot).toEqual(completo(root).snapshot);
  });

  it("da lo mismo con un fichero nuevo y con uno borrado", () => {
    const root = proyecto();
    const cache = new ParseCache();
    incremental(root, cache);

    escribir(
      path.join(root, "src", "d.ts"),
      ['import { a } from "./a";', "export const d = a(1);"].join("\n")
    );
    const conAlta = incremental(root, cache);
    expect(conAlta.cache).toEqual({ hits: 3, misses: 1 });
    expect(conAlta.snapshot).toEqual(completo(root).snapshot);

    fs.rmSync(path.join(root, "src", "c.ts"));
    const conBaja = incremental(root, cache);
    expect(conBaja.snapshot).toEqual(completo(root).snapshot);
    // La caché se recorta: el fichero borrado no ocupa memoria.
    expect(cache.size).toBe(3);
  });

  it("es determinista: dos pasadas encima de sí mismas dan lo mismo", () => {
    const root = proyecto();
    const cache = new ParseCache();
    const primera = incremental(root, cache);
    const segunda = incremental(root, cache);
    const tercera = incremental(root, cache);
    expect(segunda.snapshot).toEqual(primera.snapshot);
    expect(tercera.snapshot).toEqual(primera.snapshot);
    expect(tercera.snapshot.meta.checksum).toBe(primera.snapshot.meta.checksum);
  });
});
