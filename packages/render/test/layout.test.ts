import { describe, expect, it } from "vitest";
import { layoutMap, VIEW_HEIGHT, VIEW_WIDTH, type PlacedNode, type TreeNode } from "../src/index";

function file(name: string, index: number, value: number): TreeNode {
  return {
    kind: "file",
    key: `f:${index}`,
    name,
    path: `src/${name}`,
    value,
    fileCount: 1,
    section: 0,
    fileIndex: index
  };
}

function folder(name: string, path: string, children: TreeNode[]): TreeNode {
  return {
    kind: "folder",
    key: `d:${path}`,
    name,
    path,
    value: children.reduce((sum, child) => sum + child.value, 0),
    fileCount: children.reduce((sum, child) => sum + child.fileCount, 0),
    section: -1,
    children
  };
}

function collect(placed: PlacedNode[], out: PlacedNode[] = []): PlacedNode[] {
  for (const node of placed) {
    out.push(node);
    collect(node.children, out);
  }
  return out;
}

describe("layoutMap", () => {
  it("coloca todos los ficheros de un árbol con espacio", () => {
    const files = Array.from({ length: 20 }, (_, index) =>
      file(`f${index}.ts`, index, index + 1)
    );
    const placed = layoutMap([folder("src", "src", files)]);
    const leaves = collect(placed).filter((entry) => entry.node.kind === "file");

    expect(leaves).toHaveLength(files.length);
    expect(new Set(leaves.map((entry) => entry.node.fileIndex)).size).toBe(files.length);
  });

  it("mantiene todas las celdas dentro del lienzo y de su carpeta", () => {
    const files = Array.from({ length: 40 }, (_, index) =>
      file(`f${index}.ts`, index, (index % 7) + 1)
    );
    const root = folder("src", "src", files);
    const placed = layoutMap([root]);

    for (const entry of collect(placed)) {
      expect(entry.rect.x).toBeGreaterThanOrEqual(-1e-6);
      expect(entry.rect.y).toBeGreaterThanOrEqual(-1e-6);
      expect(entry.rect.x + entry.rect.w).toBeLessThanOrEqual(VIEW_WIDTH + 1e-6);
      expect(entry.rect.y + entry.rect.h).toBeLessThanOrEqual(VIEW_HEIGHT + 1e-6);
    }

    for (const parent of collect(placed).filter((entry) => entry.node.kind === "folder")) {
      for (const child of parent.children) {
        expect(child.rect.x).toBeGreaterThanOrEqual(parent.rect.x - 1e-6);
        expect(child.rect.y).toBeGreaterThanOrEqual(parent.rect.y - 1e-6);
        expect(child.rect.x + child.rect.w).toBeLessThanOrEqual(
          parent.rect.x + parent.rect.w + 1e-6
        );
        expect(child.rect.y + child.rect.h).toBeLessThanOrEqual(
          parent.rect.y + parent.rect.h + 1e-6
        );
      }
    }
  });

  it("es determinista", () => {
    const files = Array.from({ length: 12 }, (_, index) =>
      file(`f${index}.ts`, index, (index % 5) + 1)
    );
    const roots = [folder("src", "src", files)];

    expect(layoutMap(roots)).toEqual(layoutMap(roots));
  });
});
