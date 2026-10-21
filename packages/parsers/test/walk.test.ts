import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { walkSourceFiles } from "../src/index";
import { NodeFileSystem } from "../src/node-fs";

const fixture = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "walk"
);

function relativePaths(root: string, options?: Parameters<typeof walkSourceFiles>[1]): string[] {
  return walkSourceFiles(new NodeFileSystem(root), options).files.map(
    (file) => file.relativePath
  );
}

describe("walkSourceFiles", () => {
  it("aplica .gitignore raíz, negaciones y .gitignore anidados", () => {
    expect(relativePaths(fixture)).toEqual([
      "src/a.ts",
      "src/b.tsx",
      "src/keep.skip.ts",
      "src/nested/deeper/x.ts",
      "src/nested/keep.ts"
    ]);
  });

  it("ignora node_modules aunque no aparezca en .gitignore", () => {
    expect(relativePaths(fixture)).not.toContain("node_modules/pkg/index.ts");
  });

  it("acepta patrones extra", () => {
    expect(relativePaths(fixture, { ignore: ["src/nested/"] })).toEqual([
      "src/a.ts",
      "src/b.tsx",
      "src/keep.skip.ts"
    ]);
  });

  it("filtra por extensión", () => {
    expect(relativePaths(fixture, { extensions: [".ts"] })).toEqual([
      "src/a.ts",
      "src/keep.skip.ts",
      "src/nested/deeper/x.ts",
      "src/nested/keep.ts"
    ]);
  });

  it("devuelve rutas relativas con separador posix y orden estable", () => {
    const first = walkSourceFiles(new NodeFileSystem(fixture)).files;
    const second = walkSourceFiles(new NodeFileSystem(fixture)).files;
    expect(first).toEqual(second);
    expect(first.every((file) => !file.relativePath.includes("\\"))).toBe(true);
    expect(first.every((file) => file.absolutePath.startsWith("/"))).toBe(true);
  });
});
