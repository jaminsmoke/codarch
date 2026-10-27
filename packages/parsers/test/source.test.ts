import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { readSourceFile, readSourceSnippet } from "../src/source";

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

describe("el fichero entero", () => {
  // Un repo de verdad, pequeño y temporal: 600 líneas no caben en un fixture
  // sin llenar el árbol de ruido.
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-source-"));
  afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));
  fs.mkdirSync(path.join(temp, "src"));
  fs.writeFileSync(
    path.join(temp, "src/largo.ts"),
    Array.from({ length: 600 }, (_, index) => `export const n${index} = ${index};`).join("\n")
  );

  it("pasa del tope de una muestra y empieza en la línea 1", () => {
    const file = readSourceFile(temp, "src/largo.ts");

    expect(file?.start).toBe(1);
    expect(file?.lines.length).toBeGreaterThan(400);
    expect(file?.end).toBe(600);
    expect(file?.total).toBe(600);
  });

  it("aplica las mismas reglas de ruta que una muestra", () => {
    expect(readSourceFile(temp, "../package.json")).toBeNull();
    expect(readSourceFile(temp, "package.json")).toBeNull();
    expect(readSourceFile(temp, "src/no-existe.ts")).toBeNull();
  });
});
