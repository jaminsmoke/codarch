import { describe, expect, it } from "vitest";
import { platformBridges } from "../src/app/bridges";
import type { Plataforma } from "../src/platform";

/** Una plataforma con lo que se diga y nada más. */
function plataforma(extra: Partial<Plataforma> = {}): Plataforma {
  return extra as Plataforma;
}

describe("las puertas de la plataforma", () => {
  it("lo que la plataforma no tiene se contesta con su ausencia", async () => {
    const bridges = platformBridges(plataforma());

    await expect(bridges.loadHistory()).resolves.toBeNull();
    await expect(bridges.loadHeat()).resolves.toBeNull();
    await expect(bridges.loadDiff("src/a.ts")).resolves.toBeNull();
    await expect(
      bridges.leerCodigo({ path: "src/a.ts", start: 1, end: 2 })
    ).resolves.toBeNull();
    await expect(
      bridges.abrirEnEditor({ path: "src/a.ts", line: 1 })
    ).resolves.toBe(false);
  });

  it("pasa la petición tal cual a la plataforma que sí la tiene", async () => {
    const pedidas: string[] = [];
    const bridges = platformBridges(
      plataforma({
        diff: async (path) => {
          pedidas.push(path);
          return { path, lines: [] } as never;
        },
        abrirEnEditor: async (request) => {
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
      bridges.abrirEnEditor({ path: "src/a.ts", line: 7 })
    ).resolves.toBe(true);
    expect(pedidas).toEqual(["lib/c.ts", "src/a.ts:7"]);
  });
});
