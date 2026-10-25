import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readSourceSnippet } from "../src/source";

const root = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "repo"
);

describe("el código de un símbolo", () => {
  it("devuelve el rango pedido con el total de líneas", () => {
    const snippet = readSourceSnippet(root, "src/index.ts", 1, 4);

    expect(snippet?.path).toBe("src/index.ts");
    expect(snippet?.start).toBe(1);
    expect(snippet?.end).toBe(4);
    expect(snippet?.total).toBeGreaterThan(4);
    expect(snippet?.lines).toHaveLength(4);
    expect(snippet?.lines[0]).toContain("import");
  });

  it("recorta el final al total y el principio a la línea 1", () => {
    const snippet = readSourceSnippet(root, "src/index.ts", 0, 100_000);

    expect(snippet?.start).toBe(1);
    expect(snippet?.end).toBe(snippet?.total);
  });

  it("no sale del repositorio ni sirve ficheros que no son código", () => {
    expect(readSourceSnippet(root, "../package.json", 1, 2)).toBeNull();
    expect(readSourceSnippet(root, "../../secret.ts", 1, 2)).toBeNull();
    expect(readSourceSnippet(root, "package.json", 1, 2)).toBeNull();
    expect(readSourceSnippet(root, "node_modules/x/index.js", 1, 2)).toBeNull();
    expect(readSourceSnippet(root, ".codarch/snapshot.cc.json", 1, 2)).toBeNull();
  });

  it("no inventa un fichero que no existe", () => {
    expect(readSourceSnippet(root, "src/no-existe.ts", 1, 2)).toBeNull();
  });
});
