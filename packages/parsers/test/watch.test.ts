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

describe("la vigilancia del repositorio", () => {
  it("avisa de un cambio y no de lo que vive en .codarch", async () => {
    const root = repo();
    const seen: string[][] = [];
    const watcher = watchRepository(root, {
      delayMs: 50,
      onChange: (paths) => seen.push(paths)
    });
    try {
      // Chokidar tarda un poco en estar listo.
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
});
