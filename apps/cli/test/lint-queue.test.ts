import { describe, expect, it } from "vitest";
import { createLintQueue, type LintRequest } from "../src/lint-queue";

/** Una pasada que no termina hasta que el test la suelta. */
function gated() {
  const gates: Array<() => void> = [];
  const calls: LintRequest[] = [];
  const queue = createLintQueue((job) => {
    calls.push(job);
    return new Promise<void>((resolve) => gates.push(resolve));
  });
  return { gates, calls, queue };
}

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe("la cola del lint del live (ADR 0094, ADR 0098)", () => {
  it("lanza una pasada por petición", async () => {
    const { gates, calls, queue } = gated();
    queue.request({ root: "repo", tree: "a" });
    expect(calls).toEqual([{ root: "repo", tree: "a" }]);
    gates[0]!();
    await queue.idle();
    expect(calls).toEqual([{ root: "repo", tree: "a" }]);
  });

  it("un guardado durante la pasada se lintará al acabar, una sola vez", async () => {
    const { gates, calls, queue } = gated();
    queue.request({ root: "repo", tree: "a" });
    queue.request({ root: "repo", tree: "b" });
    queue.request({ root: "repo", tree: "c" });
    expect(calls).toEqual([{ root: "repo", tree: "a" }]);

    gates[0]!();
    await tick();
    expect(calls).toEqual([
      { root: "repo", tree: "a" },
      { root: "repo", tree: "c" }
    ]);

    gates[1]!();
    await queue.idle();
    // Tres peticiones durante la pasada no se convierten en tres ejecuciones.
    expect(calls).toHaveLength(2);
  });

  it("linta la petición última, con su árbol, no la primera que llegó", async () => {
    const { gates, calls, queue } = gated();
    queue.request({ root: "viejo", tree: "a" });
    queue.request({ root: "nuevo", tree: "b" });
    gates[0]!();
    await tick();
    // El árbol de la petición encolada es el suyo: no se firma con el de ahora.
    expect(calls).toEqual([
      { root: "viejo", tree: "a" },
      { root: "nuevo", tree: "b" }
    ]);
    gates[1]!();
    await queue.idle();
  });

  it("una pasada que falla no bloquea la siguiente", async () => {
    const calls: LintRequest[] = [];
    let first = true;
    const queue = createLintQueue((job) => {
      calls.push(job);
      if (first) {
        first = false;
        return Promise.reject(new Error("revienta"));
      }
      return Promise.resolve();
    });
    queue.request({ root: "a", tree: "1" });
    queue.request({ root: "b", tree: "2" });
    await queue.idle();
    expect(calls).toEqual([
      { root: "a", tree: "1" },
      { root: "b", tree: "2" }
    ]);
  });

  it("sin peticiones, no hay nada que esperar", async () => {
    const { calls, queue } = gated();
    await queue.idle();
    expect(calls).toEqual([]);
  });
});
