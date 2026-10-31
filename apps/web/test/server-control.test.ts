import { afterEach, describe, expect, it, vi } from "vitest";
import { selectRoot, setWatch } from "../src/server-control";

/**
 * Los dos mandos del servidor local (ADR 0044).
 *
 * Lo que se prueba es el contrato: qué se manda, qué se hace con la respuesta
 * y qué se le enseña al usuario cuando el servidor dice que no.
 */

/** Un `fetch` que contesta lo que se le diga. */
function responder(
  body: unknown,
  init: { ok?: boolean; status?: number } = {}
): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async () => ({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("cambiar de carpeta", () => {
  it("pide al servidor que analice la ruta y devuelve el modo nuevo", async () => {
    const fetchMock = responder({ watch: true, rootPath: "/repo" });

    await expect(selectRoot("/repo")).resolves.toEqual({
      watch: true,
      rootPath: "/repo",
      version: null
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/root", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "/repo" })
    });
  });

  it("si el servidor explica por qué no, se enseña su motivo", async () => {
    responder({ error: "la ruta no es un directorio" }, { ok: false, status: 400 });

    await expect(selectRoot("/nada")).rejects.toThrow(
      "la ruta no es un directorio"
    );
  });

  it("sin cuerpo de error, se dice lo que se intentaba", async () => {
    responder(null, { ok: false, status: 500 });

    await expect(selectRoot("/repo")).rejects.toThrow(
      "no se pudo analizar la carpeta"
    );
  });

  it("sin servidor delante, el error dice que no hubo respuesta", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("failed to fetch");
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(selectRoot("/repo")).rejects.toThrow(
      "no se pudo analizar la carpeta (failed to fetch)"
    );
  });
});

describe("encender y apagar el live", () => {
  it("manda el estado pedido y devuelve el que quedó", async () => {
    const fetchMock = responder({ watch: false, rootPath: "/repo" });

    await expect(setWatch(false)).resolves.toEqual({
      watch: false,
      rootPath: "/repo",
      version: null
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/watch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: false })
    });
  });

  it("si el servidor no deja encenderlo, se enseña su motivo", async () => {
    responder({ error: "no hay ninguna carpeta que vigilar" }, { ok: false });

    await expect(setWatch(true)).rejects.toThrow(
      "no hay ninguna carpeta que vigilar"
    );
  });
});
