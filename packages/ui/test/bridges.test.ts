import { describe, expect, it } from "vitest";
import { platformBridges } from "../src/app/bridges";
import type { Platform } from "../src/platform";

/** Una platform con lo que se diga y nada más. */
function makePlatform(extra: Partial<Platform> = {}): Platform {
  return extra as Platform;
}

describe("las puertas de la plataforma", () => {
  it("lo que la plataforma no tiene se contesta con su ausencia", async () => {
    const bridges = platformBridges(makePlatform());

    await expect(bridges.loadHistory()).resolves.toBeNull();
    await expect(bridges.loadHeat()).resolves.toBeNull();
    await expect(bridges.loadDiff("src/a.ts")).resolves.toBeNull();
    await expect(
      bridges.readCode({ path: "src/a.ts", start: 1, end: 2 })
    ).resolves.toBeNull();
    await expect(
      bridges.openInEditor({ path: "src/a.ts", line: 1 })
    ).resolves.toBe(false);
  });

  it("pasa la petición tal cual a la plataforma que sí la tiene", async () => {
    const pedidas: string[] = [];
    const bridges = platformBridges(
      makePlatform({
        diff: async (path) => {
          pedidas.push(path);
          return { path, lines: [] } as never;
        },
        openInEditor: async (request) => {
          pedidas.push(`${request.path}:${request.line}`);
          return true;
        }
      })
    );

    await expect(bridges.loadDiff("lib/c.ts")).resolves.toEqual({
      path: "lib/c.ts",
      lines: []
    });
    await expect(
      bridges.openInEditor({ path: "src/a.ts", line: 7 })
    ).resolves.toBe(true);
    expect(pedidas).toEqual(["lib/c.ts", "src/a.ts:7"]);
  });
});
