import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { watchRepository } from "../src/watch";

/**
 * Un repo pequeño, en `%TEMP%` a propósito.
 *
 * En Windows `os.tmpdir()` devuelve el nombre corto (`JAMINS~1`) y los eventos
 * del vigilante llegan con el largo: el proceso abortaba en libuv. El guardián
 * de que eso no vuelva es este propio directorio.
 */
function repo(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-watch-"));
  fs.mkdirSync(path.join(root, "src"));
  fs.writeFileSync(path.join(root, "src", "a.ts"), "export const a = 1;\n");
  return root;
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

function git(root: string, args: string[]): void {
  execFileSync("git", args, { cwd: root, stdio: "ignore" });
}

describe("la vigilancia del repositorio", () => {
  it("avisa de un cambio y no de lo que vive en .codarch", async () => {
    const root = repo();
    const seen: string[][] = [];
    const watcher = watchRepository(root, {
      delayMs: 50,
      onChange: (paths) => seen.push(paths)
    });
    try {
      // Sin `.git` se vigila solo el árbol, con un handle recursivo.
      expect(watcher.mode).toBe("archivos");
      await wait(500);
      fs.writeFileSync(path.join(root, "src", "a.ts"), "export const a = 2;\n");
      await wait(900);

      fs.mkdirSync(path.join(root, ".codarch"));
      fs.writeFileSync(path.join(root, ".codarch", "snapshot.cc.json"), "{}\n");
      await wait(500);

      expect(seen.some((paths) => paths.includes(path.join("src", "a.ts")))).toBe(
        true
      );
      expect(
        seen.every((paths) => paths.every((file) => !file.startsWith(".codarch")))
      ).toBe(true);
    } finally {
      await watcher.close();
      fs.rmSync(root, { recursive: true, force: true });
    }
  }, 15_000);

  it("vigila la ruta real aunque la que reciba sea un enlace", async () => {
    const base = repo();
    const real = path.join(base, "real");
    fs.mkdirSync(path.join(real, "src"), { recursive: true });
    fs.writeFileSync(path.join(real, "src", "a.ts"), "export const a = 1;\n");
    const link = path.join(base, "enlace");
    try {
      // Un junction no pide permisos en Windows; un symlink vale en el resto.
      fs.symlinkSync(real, link, "junction");
    } catch {
      fs.rmSync(base, { recursive: true, force: true });
      return;
    }

    const seen: string[][] = [];
    const watcher = watchRepository(link, {
      delayMs: 50,
      onChange: (paths) => seen.push(paths)
    });
    try {
      await wait(500);
      fs.writeFileSync(path.join(real, "src", "a.ts"), "export const a = 2;\n");
      await wait(900);

      expect(seen.some((paths) => paths.includes(path.join("src", "a.ts")))).toBe(
        true
      );
    } finally {
      await watcher.close();
      fs.rmSync(base, { recursive: true, force: true });
    }
  }, 15_000);

  it("avisa de un commit, que no toca ningún fichero del árbol", async () => {
    const root = repo();
    git(root, ["init", "-q"]);
    git(root, ["config", "user.name", "Test"]);
    git(root, ["config", "user.email", "test@example.com"]);
    git(root, ["add", "."]);
    git(root, ["commit", "-q", "-m", "primero"]);

    const seen: string[][] = [];
    const watcher = watchRepository(root, {
      delayMs: 50,
      onChange: (paths) => seen.push(paths)
    });
    try {
      // Dos handles: el árbol y `.git`, nunca uno por carpeta.
      expect(watcher.mode).toBe("git");
      await wait(500);
      git(root, ["commit", "-q", "--allow-empty", "-m", "vacío"]);
      await wait(1500);

      expect(seen.some((paths) => paths.includes(".git"))).toBe(true);
    } finally {
      await watcher.close();
      fs.rmSync(root, { recursive: true, force: true });
    }
  }, 15_000);
});
