import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { analyzeFiles } from "../src/analyze-core";
import { PARSE_CACHE_FORMAT, ParseCache, type CachedParse } from "../src/cache";
import { MemoryFileSystem } from "../src/fs";
import { extensionsFor, parserFor } from "../src/parsers";
import { loadOwnParseCache, serializeParseCache } from "../src/parse-cache-store";
import { TypeScriptParser } from "../src/ts/parser";
import type { FileParseResult, SourceParser } from "../src/types";

/**
 * El registro de parsers (ADR 0090).
 *
 * El análisis elige por extensión y la caché firma cada entrada con el parser
 * que la produjo. La prueba que manda: un repositorio de TS/JS da el mismo
 * `cc.json` con un parser que con varios.
 */

const tempRoots: string[] = [];

function tempDir(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-parsers-"));
  tempRoots.push(root);
  return root;
}

/** Un parser de mentira que atiende una extensión y anota lo que parsea. */
function fakeParser(
  name: string,
  extensions: string[]
): SourceParser & { seen: string[] } {
  const seen: string[] = [];
  return {
    name,
    extensions,
    seen,
    parse(_source: string, filePath: string): FileParseResult {
      seen.push(filePath);
      return { metrics: { loc: 1, rloc: 1 }, imports: [] };
    }
  };
}

function entry(parser: string): CachedParse {
  return {
    version: "10:1000",
    parser,
    parsed: { metrics: { loc: 1, rloc: 1 }, imports: [] },
    bridge: false
  };
}

function project(): MemoryFileSystem {
  return new MemoryFileSystem([
    ["/package.json", JSON.stringify({ name: "proyecto" })],
    ["/src/a.ts", "import { b } from './b';\nexport const a = b + 1;\n"],
    ["/src/b.ts", "export const b = 2;\n"]
  ]);
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("el registro de parsers", () => {
  it("atiende cada extensión con el primer parser que la declara", () => {
    const first = fakeParser("first", [".foo"]);
    const second = fakeParser("second", [".foo", ".bar"]);
    const registry = [first, second];

    expect(parserFor(registry, "/src/a.foo")).toBe(first);
    expect(parserFor(registry, "/src/a.bar")).toBe(second);
    // La extensión no distingue mayúsculas: un `.FOO` es un fichero del mismo
    // lenguaje, y el sistema de ficheros del usuario puede no distinguirlas.
    expect(parserFor(registry, "/src/A.FOO")).toBe(first);
    expect(parserFor(registry, "/src/a.ts")).toBeNull();
  });

  it("recorre la unión de extensiones, sin perder las de la lente", () => {
    const registry = [fakeParser("foo", [".foo"]), new TypeScriptParser()];

    expect(extensionsFor(registry, [".rs"])).toEqual([
      ".cjs",
      ".cts",
      ".foo",
      ".js",
      ".jsx",
      ".mjs",
      ".mts",
      ".rs",
      ".ts",
      ".tsx"
    ]);
  });

  it("un repo de TS/JS da el mismo checksum con un parser que con varios", () => {
    const alone = analyzeFiles({
      fileSystem: project(),
      root: "/",
      parsers: [new TypeScriptParser()],
      extensions: extensionsFor([new TypeScriptParser()], [".rs", ".wasm"])
    });

    const withOthers = analyzeFiles({
      fileSystem: project(),
      root: "/",
      parsers: [
        new TypeScriptParser(),
        fakeParser("java", [".java"]),
        fakeParser("python", [".py"])
      ],
      extensions: extensionsFor(
        [
          new TypeScriptParser(),
          fakeParser("java", [".java"]),
          fakeParser("python", [".py"])
        ],
        [".rs", ".wasm"]
      )
    });

    // Byte a byte: el mismo `cc.json`, no solo el mismo checksum.
    expect(JSON.stringify(withOthers.snapshot)).toBe(
      JSON.stringify(alone.snapshot)
    );
    expect(withOthers.files).toBe(alone.files);
    expect(withOthers.edges).toBe(alone.edges);
  });

  it("parsea cada fichero con el suyo y no inventa estado de migración", () => {
    const fake = fakeParser("foo", [".foo"]);
    const result = analyzeFiles({
      fileSystem: new MemoryFileSystem([
        ["/package.json", JSON.stringify({ name: "proyecto" })],
        ["/src/a.ts", "export const a = 1;\n"],
        ["/src/b.foo", "lo que sea\n"]
      ]),
      root: "/",
      parsers: [new TypeScriptParser(), fake],
      extensions: extensionsFor([new TypeScriptParser(), fake])
    });

    expect(fake.seen).toEqual(["src/b.foo"]);
    expect(result.files).toBe(2);
    // `.foo` no es un lenguaje de la lente: es un nodo, y nada más.
    expect(result.migration.files).toBe(1);
  });
});

describe("la caché firmada por parser", () => {
  it("solo acierta con el parser que la escribió", () => {
    const cache = new ParseCache();
    cache.set("src/a.ts", entry("typescript"));

    expect(cache.get("src/a.ts", "10:1000", "typescript")).not.toBeNull();
    expect(cache.get("src/a.ts", "10:1000", "java")).toBeNull();
    // Sin parser pedido, basta la versión: es la consulta de diagnóstico.
    expect(cache.get("src/a.ts", "10:1000")).not.toBeNull();
  });

  it("el fichero de la caché dice con qué parsers se midió", () => {
    const cache = new ParseCache();
    cache.set("src/a.ts", entry("typescript"));
    cache.set("src/B.java", entry("java"));

    const payload = serializeParseCache("/repo", cache);
    expect(payload.format).toBe(2);
    expect(payload.parser).toBe("java,typescript");
  });

  it("ignora una caché de formato 1 y carga una de formato 2", () => {
    const root = tempDir();
    const out = path.join(root, ".codarch");
    fs.mkdirSync(out, { recursive: true });
    const file = path.join(out, "parse-cache.json");

    fs.writeFileSync(
      file,
      JSON.stringify({
        format: 1,
        parser: "typescript",
        root: path.resolve(root),
        entries: { "src/a.ts": { ...entry("typescript"), parser: undefined } }
      }),
      "utf8"
    );
    expect(loadOwnParseCache(new ParseCache(), root, out)).toBe(0);

    fs.writeFileSync(
      file,
      JSON.stringify({
        format: PARSE_CACHE_FORMAT,
        parser: "typescript",
        root: path.resolve(root),
        entries: { "src/a.ts": entry("typescript") }
      }),
      "utf8"
    );
    const cache = new ParseCache();
    expect(loadOwnParseCache(cache, root, out)).toBe(1);
    expect(cache.get("src/a.ts", "10:1000", "typescript")).not.toBeNull();

    // Una entrada sin parser es de un formato que no conocemos: no se usa.
    fs.writeFileSync(
      file,
      JSON.stringify({
        format: PARSE_CACHE_FORMAT,
        parser: "typescript",
        root: path.resolve(root),
        entries: { "src/a.ts": { ...entry("typescript"), parser: undefined } }
      }),
      "utf8"
    );
    expect(loadOwnParseCache(new ParseCache(), root, out)).toBe(0);
  });
});
