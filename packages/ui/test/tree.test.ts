import { describe, expect, it } from "vitest";
import type { TreeNode } from "@codarch/render/browser";
import { findFolder } from "../src/tree";

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
