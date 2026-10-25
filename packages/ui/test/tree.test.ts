import { describe, expect, it } from "vitest";
import type { TreeNode } from "@codarch/render/browser";
import { findFolder, folderTrail, parentFolder } from "../src/tree";

const folder = (path: string, children: TreeNode[] = []): TreeNode => ({
  kind: "folder",
  key: `d:${path}`,
  name: path.split("/").at(-1) ?? path,
  path,
  value: 0,
  fileCount: 0,
  section: 0,
  children
});

describe("buscar una carpeta", () => {
  const app = folder("app", [folder("app/src")]);
  const roots = [app, folder("docs")];

  it("encuentra una carpeta de primer nivel", () => {
    expect(findFolder(roots, "docs")?.path).toBe("docs");
  });

  it("entra en las carpetas hijas", () => {
    expect(findFolder(roots, "app/src")?.path).toBe("app/src");
  });

  it("no confunde una ruta con un prefijo", () => {
    expect(findFolder(roots, "app/s")).toBeNull();
  });

  it("devuelve null si no existe", () => {
    expect(findFolder(roots, "nope")).toBeNull();
  });
});

describe("migas del mapa", () => {
  const src = folder("app/src", [folder("app/src/ui")]);
  const roots = [folder("app", [src]), folder("docs")];

  it("da un tramo por nivel, de la raíz al foco", () => {
    expect(folderTrail(roots, "app/src/ui")).toEqual([
      { name: "app", path: "app" },
      { name: "src", path: "app/src" },
      { name: "ui", path: "app/src/ui" }
    ]);
  });

  it("no inventa tramos de una ruta que no está en el árbol", () => {
    expect(folderTrail(roots, "app/nope")).toEqual([]);
  });

  it("sube un nivel y se para en la raíz", () => {
    expect(parentFolder(roots, "app/src/ui")).toBe("app/src");
    expect(parentFolder(roots, "app")).toBeNull();
    expect(parentFolder(roots, "app/nope")).toBeNull();
  });
});
