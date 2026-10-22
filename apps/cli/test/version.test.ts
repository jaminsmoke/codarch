import { afterEach, describe, expect, it, vi } from "vitest";
import { runVersion } from "../src/commands/version";
import type { FetchLike } from "@codarch/versions";

afterEach(() => {
  vi.restoreAllMocks();
});

function fakeFetch(cuerpo: unknown, status = 200): FetchLike {
  return async () => ({
    ok: status < 400,
    status,
    json: async () => cuerpo
  });
}

describe("codarch version", () => {
  it("dice la versión", async () => {
    const lineas: string[] = [];
    vi.spyOn(console, "log").mockImplementation((line: unknown) => {
      lineas.push(String(line));
    });

    expect(await runVersion({ check: false, json: false })).toBe(0);
    expect(lineas.join("\n")).toContain("codarch");
  });

  it("con --check dice si hay algo más nuevo y cómo se trae", async () => {
    const lineas: string[] = [];
    vi.spyOn(console, "log").mockImplementation((line: unknown) => {
      lineas.push(String(line));
    });

    const codigo = await runVersion({
      check: true,
      json: false,
      fetch: fakeFetch({ version: "9.9.9" })
    });

    const texto = lineas.join("\n");
    expect(codigo).toBe(0);
    expect(texto).toContain("9.9.9");
    expect(texto).toContain("npm i -g codarch@latest");
  });

  it("si no se puede comprobar, lo dice y falla", async () => {
    const lineas: string[] = [];
    vi.spyOn(console, "log").mockImplementation((line: unknown) => {
      lineas.push(String(line));
    });

    const codigo = await runVersion({
      check: true,
      json: false,
      fetch: fakeFetch({}, 503)
    });

    expect(codigo).toBe(1);
    expect(lineas.join("\n")).toContain("No se pudo comprobar");
  });

  it("en json cuenta lo mismo", async () => {
    const lineas: string[] = [];
    vi.spyOn(console, "log").mockImplementation((line: unknown) => {
      lineas.push(String(line));
    });

    await runVersion({
      check: true,
      json: true,
      fetch: fakeFetch({ version: "9.9.9" })
    });

    const datos = JSON.parse(lineas.join("\n")) as {
      name: string;
      latest: string | null;
      outdated: boolean;
    };
    expect(datos.name).toBe("codarch");
    expect(datos.latest).toBe("9.9.9");
    expect(datos.outdated).toBe(true);
  });
});
