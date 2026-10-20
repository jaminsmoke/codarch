import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ImportResolver,
  TypeScriptParser,
  walkSourceFiles,
  type ResolveResult,
  type WalkedFile
} from "../src/index";

const fixture = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "repo"
);

const walked = walkSourceFiles(fixture);
const files = walked.files;
const resolver = new ImportResolver(fixture, files);
const parser = new TypeScriptParser();

function file(relativePath: string): WalkedFile {
  const found = files.find((candidate) => candidate.relativePath === relativePath);
  if (!found) throw new Error(`no existe en el fixture: ${relativePath}`);
  return found;
}

function resolved(importer: string, specifier: string): ResolveResult {
  return resolver.resolve(file(importer).absolutePath, specifier);
}

function internalPath(result: ResolveResult): string | null {
  return result.kind === "internal" ? result.file.relativePath : null;
}

describe("ImportResolver", () => {
  it("resuelve relativos, extensión .js→.ts, index y type-only", () => {
    expect(internalPath(resolved("src/index.ts", "./lib/a.js"))).toBe(
      "src/lib/a.ts"
    );
    expect(internalPath(resolved("src/index.ts", "./dir"))).toBe(
      "src/dir/index.ts"
    );
    expect(internalPath(resolved("src/index.ts", "./types"))).toBe(
      "src/types.ts"
    );
  });

  it("resuelve paths de tsconfig", () => {
    expect(internalPath(resolved("src/index.ts", "@app/b"))).toBe("src/b.ts");
    expect(internalPath(resolved("src/index.ts", "@root"))).toBe("src/index.ts");
  });

  it("resuelve el tsconfig más cercano en un workspace", () => {
    expect(
      internalPath(resolved("packages/util/src/local.ts", "@local/extra"))
    ).toBe("packages/util/src/extra.ts");
  });

  it("resuelve paquetes del workspace con exports", () => {
    expect(internalPath(resolved("src/index.ts", "@fixture/util"))).toBe(
      "packages/util/src/index.ts"
    );
    expect(internalPath(resolved("src/index.ts", "@fixture/util/extra"))).toBe(
      "packages/util/src/extra.ts"
    );
  });

  it("resuelve exports, dinámicos y require", () => {
    expect(internalPath(resolved("src/index.ts", "./re-export"))).toBe(
      "src/re-export.ts"
    );
    expect(internalPath(resolved("src/index.ts", "./lazy"))).toBe("src/lazy.ts");
    expect(internalPath(resolved("src/index.ts", "./legacy"))).toBe(
      "src/legacy.ts"
    );
  });

  it("clasifica builtins y paquetes externos sin crear aristas", () => {
    expect(resolved("src/index.ts", "node:fs")).toEqual({
      kind: "external",
      specifier: "node:fs",
      builtin: true
    });
    expect(resolved("src/index.ts", "fs")).toEqual({
      kind: "external",
      specifier: "fs",
      builtin: true
    });
    expect(resolved("src/index.ts", "some-external")).toEqual({
      kind: "external",
      specifier: "some-external",
      builtin: false
    });
  });

  it("distingue un relativo roto de un externo", () => {
    expect(resolved("src/index.ts", "./does-not-exist").kind).toBe(
      "unresolved"
    );
    expect(resolved("src/index.ts", "@app/missing").kind).toBe("unresolved");
  });

  it("acepta imports absolutos desde el root del proyecto", () => {
    expect(internalPath(resolved("src/index.ts", "/src/b.ts"))).toBe(
      "src/b.ts"
    );
  });

  it("extrae y resuelve todos los imports del fichero de entrada", () => {
    const importer = file("src/index.ts");
    const source = fs.readFileSync(importer.absolutePath, "utf8");
    const imports = parser.parse(source, importer.relativePath).imports;

    const paths = imports.map((item) => {
      const result = resolver.resolve(importer.absolutePath, item.specifier);
      return [item.specifier, internalPath(result), result.kind] as const;
    });

    expect(paths).toEqual([
      ["./lib/a.js", "src/lib/a.ts", "internal"],
      ["@app/b", "src/b.ts", "internal"],
      ["./dir", "src/dir/index.ts", "internal"],
      ["./types", "src/types.ts", "internal"],
      ["@fixture/util", "packages/util/src/index.ts", "internal"],
      ["@fixture/util/extra", "packages/util/src/extra.ts", "internal"],
      ["@root", "src/index.ts", "internal"],
      ["./re-export", "src/re-export.ts", "internal"],
      ["./lazy", "src/lazy.ts", "internal"],
      ["./legacy", "src/legacy.ts", "internal"],
      ["external-package", null, "external"],
      ["./missing", null, "unresolved"]
    ]);
  });
});
