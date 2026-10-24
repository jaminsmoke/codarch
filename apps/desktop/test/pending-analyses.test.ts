import { describe, expect, it, vi } from "vitest";
import { PendingAnalyses } from "../src/pending-analyses";

/**
 * Una promesa que el test resuelve a mano: así se controla cuándo termina cada
 * análisis y se puede mirar la cola a media faena.
 */
function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (cause: unknown) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("la cola de análisis", () => {
  it("corre uno a la vez y no solapa raíces distintas", async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const run = vi
      .fn<(root: string) => Promise<string>>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const queue = new PendingAnalyses(run);

    const a = queue.analyze("/repo/a");
    const b = queue.analyze("/repo/b");
    await Promise.resolve();

    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith("/repo/a");

    first.resolve("a1");
    await expect(a).resolves.toBe("a1");
    expect(run).toHaveBeenCalledTimes(2);
    expect(run).toHaveBeenLastCalledWith("/repo/b");

    second.resolve("b1");
    await expect(b).resolves.toBe("b1");
    expect(queue.busy).toBe(false);
  });

  it("agrupa los avisos de la misma raíz en una sola repetición", async () => {
    const running = deferred<string>();
    const again = deferred<string>();
    const run = vi
      .fn<(root: string) => Promise<string>>()
      .mockReturnValueOnce(running.promise)
      .mockReturnValueOnce(again.promise);
    const queue = new PendingAnalyses(run);

    const primera = queue.analyze("/repo");
    await Promise.resolve();
    // Tres guardados seguidos mientras el primero analiza.
    const segunda = queue.analyze("/repo");
    const tercera = queue.analyze("/repo");
    const cuarta = queue.analyze("/repo");

    expect(run).toHaveBeenCalledTimes(1);

    running.resolve("viejo");
    await expect(primera).resolves.toBe("viejo");
    expect(run).toHaveBeenCalledTimes(2);

    again.resolve("nuevo");
    // Las tres esperan el análisis de después del cambio.
    await expect(segunda).resolves.toBe("nuevo");
    await expect(tercera).resolves.toBe("nuevo");
    await expect(cuarta).resolves.toBe("nuevo");
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("un fallo llega a quien esperaba y no atasca la cola", async () => {
    const run = vi
      .fn<(root: string) => Promise<string>>()
      .mockRejectedValueOnce(new Error("sin permisos"))
      .mockResolvedValueOnce("bien");
    const queue = new PendingAnalyses(run);

    const mala = queue.analyze("/repo");
    const siguiente = queue.analyze("/repo");

    await expect(mala).rejects.toThrow("sin permisos");
    await expect(siguiente).resolves.toBe("bien");
    expect(run).toHaveBeenCalledTimes(2);
  });
});
