import { describe, expect, it } from "vitest";
import {
  checkForUpdate,
  checkSource,
  compareVersions,
  isNewer,
  parseVersion,
  type FetchLike
} from "../src/index";

/** Un `fetch` de mentira: responde con lo que le digan. */
function fakeFetch(respuestas: Record<string, { status?: number; body: unknown }>): {
  fetch: FetchLike;
  pedidos: string[];
} {
  const pedidos: string[] = [];
  const fetch: FetchLike = async (url) => {
    pedidos.push(url);
    const respuesta = respuestas[url];
    if (!respuesta) {
      return {
        ok: false,
        status: 404,
        json: async () => ({})
      };
    }
    return {
      ok: (respuesta.status ?? 200) < 400,
      status: respuesta.status ?? 200,
      json: async () => respuesta.body
    };
  };
  return { fetch, pedidos };
}

describe("parseVersion", () => {
  it("parte una versión normal", () => {
    expect(parseVersion("1.2.3")).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
      prerelease: null
    });
  });

  it("acepta la v de delante y la prerelease", () => {
    expect(parseVersion("v0.3.0-beta.1")).toEqual({
      major: 0,
      minor: 3,
      patch: 0,
      prerelease: "beta.1"
    });
  });

  it("lo que no se entiende no es una versión", () => {
    expect(parseVersion("dev")).toBeNull();
    expect(parseVersion("1.2")).toBeNull();
    expect(parseVersion("")).toBeNull();
  });
});

describe("compareVersions", () => {
  it("compara por mayor, menor y parche", () => {
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
    expect(compareVersions("1.0.1", "1.0.0")).toBe(1);
    expect(compareVersions("1.1.0", "1.0.9")).toBe(1);
    expect(compareVersions("2.0.0", "1.9.9")).toBe(1);
    expect(compareVersions("0.2.0", "0.3.0")).toBe(-1);
  });

  it("la prerelease va antes que la estable", () => {
    expect(compareVersions("1.0.0-beta", "1.0.0")).toBe(-1);
    expect(compareVersions("1.0.0", "1.0.0-beta")).toBe(1);
    expect(compareVersions("1.0.0-beta.1", "1.0.0-beta.2")).toBe(-1);
    expect(compareVersions("1.0.0-beta", "1.0.0-alpha")).toBe(1);
  });

  it("una versión ilegible no es la más nueva", () => {
    expect(compareVersions("dev", "1.0.0")).toBe(-1);
    expect(compareVersions("1.0.0", "dev")).toBe(1);
    expect(compareVersions("dev", "otro")).toBe(0);
  });

  it("isNewer responde lo mismo", () => {
    expect(isNewer("0.3.0", "0.2.0")).toBe(true);
    expect(isNewer("0.2.0", "0.2.0")).toBe(false);
    expect(isNewer("0.1.0", "0.2.0")).toBe(false);
  });
});

describe("checkSource", () => {
  it("pregunta a npm y dice si hay algo más nuevo", async () => {
    const { fetch, pedidos } = fakeFetch({
      "https://registry.npmjs.org/codarch/latest": { body: { version: "0.3.0" } }
    });

    const resultado = await checkSource("0.2.0", { kind: "npm", package: "codarch" }, fetch);

    expect(pedidos).toEqual(["https://registry.npmjs.org/codarch/latest"]);
    expect(resultado.latest).toBe("0.3.0");
    expect(resultado.outdated).toBe(true);
    expect(resultado.error).toBeNull();
    expect(resultado.url).toBe("https://www.npmjs.com/package/codarch");
  });

  it("pregunta a GitHub y quita la v de la etiqueta", async () => {
    const { fetch, pedidos } = fakeFetch({
      "https://api.github.com/repos/jaminsmoke/codarch-desktop/releases/latest": {
        body: { tag_name: "desktop-v0.3.0", html_url: "https://github.com/x/releases/1" }
      }
    });

    const resultado = await checkSource(
      "0.2.0",
      { kind: "github", repo: "jaminsmoke/codarch-desktop" },
      fetch
    );

    expect(pedidos).toEqual([
      "https://api.github.com/repos/jaminsmoke/codarch-desktop/releases/latest"
    ]);
    expect(resultado.latest).toBe("0.3.0");
    expect(resultado.outdated).toBe(true);
    expect(resultado.url).toBe("https://github.com/x/releases/1");
  });

  it("si ya está al día, no está atrasada", async () => {
    const { fetch } = fakeFetch({
      "https://registry.npmjs.org/codarch/latest": { body: { version: "0.2.0" } }
    });

    const resultado = await checkSource("0.2.0", { kind: "npm", package: "codarch" }, fetch);

    expect(resultado.outdated).toBe(false);
  });

  it("una fuente que falla no rompe nada", async () => {
    const { fetch } = fakeFetch({
      "https://registry.npmjs.org/codarch/latest": { status: 503, body: {} }
    });

    const resultado = await checkSource("0.2.0", { kind: "npm", package: "codarch" }, fetch);

    expect(resultado.latest).toBeNull();
    expect(resultado.outdated).toBe(false);
    expect(resultado.error).toContain("503");
  });

  it("una respuesta sin versión es un error, no una versión", async () => {
    const { fetch } = fakeFetch({
      "https://registry.npmjs.org/codarch/latest": { body: { hola: true } }
    });

    const resultado = await checkSource("0.2.0", { kind: "npm", package: "codarch" }, fetch);

    expect(resultado.latest).toBeNull();
    expect(resultado.error).toContain("no trae versión");
  });
});

describe("checkForUpdate", () => {
  it("pregunta a varias fuentes y no se rinde si una falla", async () => {
    const { fetch } = fakeFetch({
      "https://registry.npmjs.org/codarch/latest": { body: { version: "0.2.0" } },
      "https://api.github.com/repos/jaminsmoke/codarch-desktop/releases/latest": {
        body: { tag_name: "desktop-v0.4.0" }
      }
    });

    const resultados = await checkForUpdate(
      "0.2.0",
      [
        { kind: "npm", package: "codarch" },
        { kind: "github", repo: "jaminsmoke/codarch-desktop" }
      ],
      fetch
    );

    expect(resultados).toHaveLength(2);
    expect(resultados[0]?.outdated).toBe(false);
    expect(resultados[1]?.latest).toBe("0.4.0");
    expect(resultados[1]?.outdated).toBe(true);
  });
});
