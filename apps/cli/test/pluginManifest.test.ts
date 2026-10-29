import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readManifest } from "../src/pluginManifest";

const tempRoots: string[] = [];

function tempDir(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-manifest-"));
  tempRoots.push(root);
  return root;
}

/** Un plugin con el manifiesto que se le pase y un punto de entrada. */
function pluginWith(manifest: unknown, entry = "index.tsx"): string {
  const dir = tempDir();
  fs.writeFileSync(path.join(dir, "plugin.json"), JSON.stringify(manifest), "utf8");
  fs.writeFileSync(path.join(dir, entry), "export default null;\n", "utf8");
  return dir;
}

const VALID = {
  name: "demo",
  version: "0.1.0",
  title: "Demo",
  description: "Un plugin de prueba.",
  icon: "beaker",
  contributes: { views: ["capas"] },
  requires: { canvas: true }
};

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("leer un plugin.json", () => {
  it("acepta un manifiesto completo", () => {
    const loaded = readManifest(pluginWith(VALID), "demo");
    expect(loaded).toEqual({
      ok: true,
      manifest: {
        name: "demo",
        version: "0.1.0",
        title: "Demo",
        description: "Un plugin de prueba.",
        icon: "beaker",
        contributes: { views: ["capas"] },
        requires: { canvas: true }
      }
    });
  });

  it("se queda con el nombre de la carpeta si el manifiesto no lo trae", () => {
    const loaded = readManifest(pluginWith({ ...VALID, name: undefined }), "carpeta");
    expect(loaded.ok && loaded.manifest.name).toBe("carpeta");
  });

  it("tolera el BOM que deja Windows", () => {
    const dir = tempDir();
    fs.writeFileSync(
      path.join(dir, "plugin.json"),
      `\uFEFF${JSON.stringify(VALID)}`,
      "utf8"
    );
    fs.writeFileSync(path.join(dir, "index.ts"), "export default null;\n", "utf8");
    expect(readManifest(dir, "demo").ok).toBe(true);
  });

  it("dice qué falta cuando no hay manifiesto", () => {
    const dir = tempDir();
    expect(readManifest(dir, "demo")).toEqual({
      ok: false,
      message: `falta plugin.json en ${dir}`
    });
  });

  it("distingue el JSON roto del objeto que no vale", () => {
    const dir = tempDir();
    fs.writeFileSync(path.join(dir, "plugin.json"), "{ no es json", "utf8");
    const broken = readManifest(dir, "demo");
    expect(broken.ok).toBe(false);
    expect(broken.ok === false && broken.message).toContain("plugin.json no es JSON:");

    fs.writeFileSync(path.join(dir, "plugin.json"), "[]", "utf8");
    expect(readManifest(dir, "demo")).toEqual({
      ok: false,
      message: "plugin.json tiene que ser un objeto"
    });
  });

  it("valida el nombre, la versión y el título, en ese orden", () => {
    expect(readManifest(pluginWith({ ...VALID, name: "No Vale" }), "demo")).toEqual({
      ok: false,
      message:
        "name no es un nombre de plugin: No Vale (minúsculas, números y guiones)"
    });
    expect(readManifest(pluginWith({ ...VALID, version: " " }), "demo")).toEqual({
      ok: false,
      message: "falta version"
    });
    expect(readManifest(pluginWith({ ...VALID, title: "" }), "demo")).toEqual({
      ok: false,
      message: "falta title"
    });
  });

  it("exige al menos una vista y que sean nombres", () => {
    expect(
      readManifest(pluginWith({ ...VALID, contributes: {} }), "demo")
    ).toEqual({
      ok: false,
      message: "contributes.views tiene que ser una lista con al menos una vista"
    });
    expect(
      readManifest(pluginWith({ ...VALID, contributes: { views: ["ok", 3] } }), "demo")
    ).toEqual({ ok: false, message: "contributes.views solo admite nombres" });
  });

  it("exige el punto de entrada y nombra los que sirven", () => {
    const dir = pluginWith(VALID);
    fs.rmSync(path.join(dir, "index.tsx"));
    expect(readManifest(dir, "demo")).toEqual({
      ok: false,
      message: `falta el punto de entrada en ${dir}: index.tsx o index.ts`
    });
  });
});
