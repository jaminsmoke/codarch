import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { defaultOutputPath } from "../src/commands/render";

describe("opciones de render", () => {
  it("deriva la carpeta de salida del nombre de entrada", () => {
    expect(defaultOutputPath("mapa.cc.json.gz")).toBe("mapa");
    expect(defaultOutputPath("samples/codecharta_visualization.cc.json.gz")).toBe(
      "samples/codecharta_visualization"
    );
    expect(defaultOutputPath("mapa.json")).toBe("mapa");
    expect(defaultOutputPath("mapa")).toBe("mapa.sitio");
  });
});

describe("CLI dispatch", () => {
  // Cuatro procesos `node --import tsx` seguidos: con la suite entera en
  // paralelo no caben en los 5 s que vitest da por defecto.
  it("preserves help, validation and unknown-command exit codes", () => {
    const run = (...args: string[]) => spawnSync(
      process.execPath,
      ["--import", "tsx", "apps/cli/src/index.ts", ...args],
      { encoding: "utf8" }
    );
    const help = run("--help");
    expect(help.status).toBe(0);
    expect(help.stdout).toContain("codarch analyze");

    const diff = run("diff", "--top", "0");
    expect(diff.status).toBe(1);
    expect(diff.stderr).toContain("--top necesita un entero positivo");

    const verify = run("verify", "--unknown");
    expect(verify.status).toBe(1);
    expect(verify.stderr).toContain("opción desconocida: --unknown");

    const unknown = run("missing-command");
    expect(unknown.status).toBe(1);
    expect(unknown.stderr).toContain("comando desconocido: missing-command");
  }, 30_000);
});
