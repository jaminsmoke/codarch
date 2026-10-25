import { describe, expect, it } from "vitest";
import { canAutoUpdate, releaseUrl, resolveUpdateFeed } from "../src/updates";

/** Un `fetch` que devuelve la lista de releases que le den. */
function releases(items: unknown[]) {
  return async () => ({
    ok: true,
    status: 200,
    json: async () => items
  });
}

describe("actualizaciones automáticas", () => {
  it("funcionan en Windows y Linux empaquetados", () => {
    expect(canAutoUpdate("win32", true)).toBe(true);
    expect(canAutoUpdate("linux", true)).toBe(true);
  });

  it("no se activan en macOS sin firma", () => {
    expect(canAutoUpdate("darwin", true)).toBe(false);
  });

  it("no se activan en desarrollo", () => {
    expect(canAutoUpdate("win32", false)).toBe(false);
    expect(canAutoUpdate("linux", false)).toBe(false);
  });
});

describe("a qué release mira la actualización", () => {
  it("se queda con la mayor versión y no con la etiqueta v1 de la acción", async () => {
    // GitHub devuelve las releases de la más nueva a la más vieja, y la etiqueta
    // `v1` de la acción es un tag sin versión: así empezaba el feed que llevaba
    // a pedir `download/v1/latest-linux.yml`.
    const feed = await resolveUpdateFeed(
      "jaminsmoke/codarch",
      "0.3.26",
      releases([
        { tag_name: "v1", draft: false },
        { tag_name: "v0.3.28", draft: false },
        { tag_name: "v0.3.27", draft: false }
      ])
    );

    expect(feed).toEqual({
      version: "0.3.28",
      url: "https://github.com/jaminsmoke/codarch/releases/download/v0.3.28/"
    });
  });

  it("salta los borradores y las etiquetas sin versión", async () => {
    const feed = await resolveUpdateFeed(
      "jaminsmoke/codarch",
      "0.3.26",
      releases([
        { tag_name: "v0.3.29", draft: true },
        { tag_name: "docs", draft: false },
        { tag_name: "v0.3.27", draft: false }
      ])
    );

    expect(feed?.version).toBe("0.3.27");
  });

  it("no inventa una release cuando no hay ninguna versión", async () => {
    const feed = await resolveUpdateFeed(
      "jaminsmoke/codarch",
      "0.3.26",
      releases([{ tag_name: "v1", draft: false }])
    );

    expect(feed).toBeNull();
  });

  it("la base de descarga lleva la barra final", () => {
    expect(releaseUrl("jaminsmoke/codarch", "0.3.28")).toBe(
      "https://github.com/jaminsmoke/codarch/releases/download/v0.3.28/"
    );
  });
});
