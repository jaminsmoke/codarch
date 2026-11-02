import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadServedProject,
  runBoot,
  type SessionHandlers
} from "../src/session";
import { writeProject } from "../src/storage";

/** Un `fetch` que contesta lo que diga el mapa; lo que no está, 204. */
function fakeFetch(answers: Record<string, unknown>): ReturnType<typeof vi.fn> {
  const mock = vi.fn(async (input: string) => {
    const body = answers[input];
    if (body === undefined) {
      return { ok: true, status: 204, json: async () => null };
    }
    return { ok: true, status: 200, json: async () => body };
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

function handlers(overrides: Partial<SessionHandlers> = {}): {
  handlers: SessionHandlers;
  calls: {
    lint: unknown[];
    restLint: unknown[];
    snapshot: { label: string; preserveView?: boolean }[];
    report: string[];
    resetReport: number;
    mode: string[];
    addons: number;
  };
} {
  const calls = {
    lint: [] as unknown[],
    restLint: [] as unknown[],
    snapshot: [] as { label: string; preserveView?: boolean }[],
    report: [] as string[],
    resetReport: 0,
    mode: [] as string[],
    addons: 0
  };
  const base: SessionHandlers = {
    snapshot: (_raw, label, preserveView) => {
      calls.snapshot.push({ label, preserveView });
      return true;
    },
    rest: () => true,
    lint: (raw) => {
      calls.lint.push(raw);
      return true;
    },
    restLint: (raw) => {
      calls.restLint.push(raw);
      return true;
    },
    report: (_raw, label) => {
      calls.report.push(label);
      return true;
    },
    resetReport: () => {
      calls.resetReport += 1;
    },
    addons: async () => {
      calls.addons += 1;
    },
    mode: (mode) => {
      calls.mode.push(mode);
    },
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
      "data/lint.repmod.json": lintArtifact
    });
    const { handlers: h, calls } = handlers();

    await runBoot({
      requested: { snapshotUrl: null, reportUrl: null },
      manual: { current: false },
      isCancelled: () => false,
      handlers: h
    });

    expect(calls.lint).toEqual([lintArtifact]);
    expect(calls.restLint).toEqual([null]);
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
    expect(calls.restLint).toEqual([null]);
  });

  it("una URL que no carga no cambia el modo del mapa", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 404, json: async () => null }))
    );
    const { handlers: h, calls } = handlers();

    await runBoot({
      requested: {
        snapshotUrl: "https://ejemplo/snapshot.cc.json",
        reportUrl: null
      },
      manual: { current: false },
      isCancelled: () => false,
      handlers: h
    });

    // Se queda como estaba: no hay nada nuevo en el mapa.
    expect(calls.mode).toEqual([]);
  });

  it("el proyecto guardado trae su lint y sus reglas del resto", async () => {
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
        restLint: lintArtifact,
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
    expect(calls.restLint).toEqual([lintArtifact]);
  });
});

/**
 * El refresco de lo que sirve el servidor.
 *
 * Lo usa el arranque y, después, el cambio de carpeta y el encendido del live:
 * no puede quedarse una versión para cada uno.
 */
describe("loadServedProject", () => {
  it("deja snapshot, resto, lint, reglas del resto, reporte HEAD y addons", async () => {
    fakeFetch({
      "data/meta.json": { watch: true, rootPath: "/repo", version: "0.3.0" },
      "data/snapshot.cc.json": { meta: { checksum: "abc" }, files: [] },
      "data/rest.cc.json": { meta: { checksum: "def" }, files: [] },
      "data/lint.repmod.json": lintArtifact,
      "data/lint-rest.repmod.json": lintArtifact,
      "data/head-report.json": { added: 0, removed: 0, files: [] }
    });
    const { handlers: h, calls } = handlers();

    await expect(loadServedProject(h)).resolves.toBe(true);

    expect(calls.snapshot).toEqual([
      { label: "servidor local", preserveView: false }
    ]);
    expect(calls.lint).toEqual([lintArtifact]);
    expect(calls.restLint).toEqual([lintArtifact]);
    expect(calls.report).toEqual(["HEAD"]);
    expect(calls.resetReport).toBe(0);
    expect(calls.mode).toEqual(["live"]);
    expect(calls.addons).toBe(1);
  });

  it("sin servidor detrás, el reporte es el del artefacto", async () => {
    fakeFetch({
      "data/snapshot.cc.json": { meta: { checksum: "abc" }, files: [] },
      "data/report.json": { added: 1, removed: 0, files: [] }
    });
    const { handlers: h, calls } = handlers();

    await expect(loadServedProject(h)).resolves.toBe(true);

    expect(calls.report).toEqual(["report.json"]);
    expect(calls.mode).toEqual(["served"]);
  });

  it("sin reporte que enseñar, Cambios se vacía", async () => {
    fakeFetch({
      "data/meta.json": { watch: false, rootPath: "/repo" },
      "data/snapshot.cc.json": { meta: { checksum: "abc" }, files: [] }
    });
    const { handlers: h, calls } = handlers();

    await loadServedProject(h);

    expect(calls.report).toEqual([]);
    expect(calls.resetReport).toBe(1);
  });

  it("sin snapshot no toca la app y lo dice", async () => {
    fakeFetch({ "data/meta.json": { watch: true, rootPath: "/repo" } });
    const { handlers: h, calls } = handlers();

    await expect(loadServedProject(h)).resolves.toBe(false);

    expect(calls.snapshot).toEqual([]);
    expect(calls.addons).toBe(0);
  });

  it("conserva la vista cuando lo pide el refresco en vivo", async () => {
    fakeFetch({
      "data/snapshot.cc.json": { meta: { checksum: "abc" }, files: [] }
    });
    const { handlers: h, calls } = handlers();

    await loadServedProject(h, { preserveView: true });

    expect(calls.snapshot).toEqual([
      { label: "servidor local", preserveView: true }
    ]);
  });

  it("acepta lo ya leído, sin volver a pedirlo", async () => {
    const fetchMock = fakeFetch({
      "data/rest.cc.json": { meta: { checksum: "rest" }, files: [] }
    });
    const { handlers: h, calls } = handlers();

    await loadServedProject(h, {
      meta: { watch: false, rootPath: "/repo" },
      served: { meta: { checksum: "abc" }, files: [] }
    });

    expect(calls.snapshot).toHaveLength(1);
    const pedidas = fetchMock.mock.calls.map(([url]) => String(url));
    expect(pedidas).not.toContain("data/meta.json");
    expect(pedidas).not.toContain("data/snapshot.cc.json");
  });
});
