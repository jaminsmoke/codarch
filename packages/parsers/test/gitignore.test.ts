import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ensureGitignoreEntry } from "../src/gitignore";

function repo(content?: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-gitignore-"));
  if (content !== undefined) {
    fs.writeFileSync(path.join(root, ".gitignore"), content, "utf8");
  }
  return root;
}

function leer(root: string): string {
  return fs.readFileSync(path.join(root, ".gitignore"), "utf8");
}

describe("el estado no se versiona", () => {
  it("crea el .gitignore si no existe", () => {
    const root = repo();
    try {
      expect(ensureGitignoreEntry(root, ".codarch/")).toBe(true);
      expect(leer(root)).toBe(".codarch/\n");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("añade la entrada sin comerse la última línea", () => {
    const root = repo("node_modules/\ndist/");
    try {
      expect(ensureGitignoreEntry(root, ".codarch/")).toBe(true);
      expect(leer(root)).toBe("node_modules/\ndist/\n.codarch/\n");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("no repite la entrada si ya está", () => {
    for (const content of ["node_modules/\n.codarch/\n", ".codarch\n"]) {
      const root = repo(content);
      try {
        expect(ensureGitignoreEntry(root, ".codarch/")).toBe(false);
        expect(leer(root)).toBe(content);
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it("respeta los finales de línea que ya tenía el fichero", () => {
    const root = repo("node_modules/\r\n");
    try {
      ensureGitignoreEntry(root, ".codarch/");
      expect(leer(root)).toBe("node_modules/\r\n.codarch/\n");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
