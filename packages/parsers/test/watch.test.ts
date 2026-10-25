import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { watchRepository } from "../src/watch";

function repo(): string {
  // Dentro del repo, no en %TEMP%: Windows puede devolver ahí la ruta corta
  // (`JAMINS~1`) y los eventos llegan con la larga, que hace saltar a libuv.
  const base = path.join(process.cwd(), ".codarch");
  fs.mkdirSync(base, { recursive: true });
  const root = fs.mkdtempSync(path.join(base, "watch-"));
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
