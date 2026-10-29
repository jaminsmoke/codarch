import { afterEach, describe, expect, it, vi } from "vitest";
import { runBoot, type SessionHandlers } from "../src/session";
import { writeProject } from "../src/storage";

/** Un `fetch` que contesta lo que diga el mapa; lo que no está, 204. */
function fakeFetch(answers: Record<string, unknown>): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      const body = answers[input];
      if (body === undefined) {
        return { ok: true, status: 204, json: async () => null };
      }
      return { ok: true, status: 200, json: async () => body };
    })
  );
}

function handlers(overrides: Partial<SessionHandlers> = {}): {
  handlers: SessionHandlers;
  calls: { lint: unknown[] };
} {
  const calls: { lint: unknown[] } = { lint: [] };
  const base: SessionHandlers = {
    snapshot: () => true,
    rest: () => true,
    lint: (raw) => {
      calls.lint.push(raw);
      return true;
    },
    report: () => true,
    resetReport: () => undefined,
    addons: async () => undefined,
    mode: () => undefined,
    sourceUrl: () => undefined,
    reportUrl: () => undefined,
    rootPath: () => undefined,
    version: () => undefined,
    error: () => undefined,
    reportError: () => undefined,
    loading: () => undefined
  };
  return { handlers: { ...base, ...overrides }, calls };
}

const lintArtifact = {
  schemaVersion: "1.0",
  meta: { checksum: "abc", tools: ["eslint"] },
  files: {},
  summary: { files: 0, errors: 0, warnings: 0, messages: 0 }
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("el arranque de la web", () => {
  it("con servidor, carga el lint del repo junto al snapshot", async () => {
    fakeFetch({
      "data/meta.json": { watch: false, rootPath: "/repo" },
      "data/snapshot.cc.json": { meta: { checksum: "abc" }, files: [] },
      "data/lint.json": lintArtifact
    });
    const { handlers: h, calls } = handlers();

    await runBoot({
      requested: { snapshotUrl: null, reportUrl: null },
      manual: { current: false },
      isCancelled: () => false,
      handlers: h
    });

    expect(calls.lint).toEqual([lintArtifact]);
  });

  it("sin lint en el servidor, el mapa se queda sin medir", async () => {
    fakeFetch({
      "data/meta.json": { watch: false, rootPath: "/repo" },
      "data/snapshot.cc.json": { meta: { checksum: "abc" }, files: [] }
    });
    const { handlers: h, calls } = handlers();

    await runBoot({
      requested: { snapshotUrl: null, reportUrl: null },
      manual: { current: false },
      isCancelled: () => false,
      handlers: h
    });

    expect(calls.lint).toEqual([null]);
  });

  it("el proyecto guardado trae su lint", async () => {
    const map = new Map<string, string>();
    const storage = {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => map.set(key, value),
      removeItem: (key: string) => map.delete(key),
      clear: () => map.clear(),
      key: () => null,
      length: 0
    } satisfies Partial<Storage> as unknown as Storage;
    // `localStore()` mira `window`: en Node hay que ponerlo para que la web
    // lea su proyecto guardado.
    vi.stubGlobal("window", { localStorage: storage });
    writeProject(
      {
        snapshot: { meta: { checksum: "abc" }, files: [] },
        lint: lintArtifact,
        report: null,
        label: "repo/.codarch/snapshot.cc.json",
        reportLabel: null
      },
      storage
    );
    fakeFetch({});
    const { handlers: h, calls } = handlers();

    await runBoot({
      requested: { snapshotUrl: null, reportUrl: null },
      manual: { current: false },
      isCancelled: () => false,
      handlers: h
    });

    expect(calls.lint).toEqual([lintArtifact]);
  });
});
