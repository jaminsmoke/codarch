import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RepoAnalyzer } from "../src/analyzer";
import type { AnalyzeOutcome } from "../src/analyze-protocol";
import type { DesktopTarget } from "../src/preload";
import { createTargets, type TargetOptions } from "../src/targets";

const roots: string[] = [];

function tempRepo(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-targets-"));
  roots.push(root);
  return root;
}

function cc(checksum: string) {
  return { meta: { checksum, projectName: "demo" }, files: [] };
}

const parseCache = { format: 2, parser: "typescript", root: "", entries: {} };

function snapshotOutcome(checksum: string): AnalyzeOutcome {
  return {
    kind: "snapshot",
    snapshot: cc(checksum) as never,
    rest: null,
    restLint: null,
    files: 1,
    edges: 0,
    warnings: [],
    headReport: null,
    parseCache: parseCache as never
  };
}

function harness(outcome: AnalyzeOutcome) {
  const analyze = vi.fn(async () => outcome);
  const refresh = vi.fn<(root: string) => Promise<void>>(async () => undefined);
  const analyzer: RepoAnalyzer = {
    analyze,
    refresh: async () => outcome,
    close: () => undefined
  };
  const sent: DesktopTarget[] = [];
  const options: TargetOptions = {
    analyzer: () => analyzer,
    send: (target) => {
      sent.push(target);
    },
    title: vi.fn(),
    fail: vi.fn(),
    watch: vi.fn(),
    stopWatching: vi.fn(),
    refresh,
    setRoot: vi.fn()
  };
  return { targets: createTargets(options), options, sent, analyze, refresh };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("abrir una carpeta", () => {
  it("si ya hay snapshot guardado, lo pinta y reanaliza por detrás", async () => {
    vi.useFakeTimers();
    const root = tempRepo();
    fs.mkdirSync(path.join(root, ".codarch"));
    fs.writeFileSync(
      path.join(root, ".codarch", "snapshot.cc.json"),
      JSON.stringify(cc("guardado"))
    );
    const { targets, options, sent, analyze, refresh } = harness(
      snapshotOutcome("nuevo")
    );

    await targets.open(root);

    expect(analyze).not.toHaveBeenCalled();
    expect(sent[0]).toMatchObject({ kind: "snapshot", label: root });
    expect(options.watch).toHaveBeenCalledWith(root);
    expect(options.title).toHaveBeenCalledWith(root, "demo");
    await vi.advanceTimersByTimeAsync(400);
    expect(refresh).toHaveBeenCalledWith(root);
  });

  it("sin snapshot, analiza, guarda y limpia la carpeta", async () => {
    const root = tempRepo();
    fs.mkdirSync(path.join(root, ".codarch"));
    fs.writeFileSync(path.join(root, ".codarch", "lint.json"), "{}");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { targets, options, sent, analyze } = harness(snapshotOutcome("c1"));

    await targets.open(root);

    expect(analyze).toHaveBeenCalledWith(root);
    expect(
      JSON.parse(
        fs.readFileSync(
          path.join(root, ".codarch", "snapshot.cc.json"),
          "utf8"
        )
      )
    ).toMatchObject({ meta: { checksum: "c1" } });
    expect(fs.existsSync(path.join(root, ".codarch", "lint.json"))).toBe(false);
    expect(sent[0]).toMatchObject({ kind: "snapshot", label: root });
    expect(options.setRoot).toHaveBeenCalledWith(root);
    expect(options.watch).toHaveBeenCalledWith(root);
  });

  it("sin cambios y sin snapshot guardado, lo dice", async () => {
    const root = tempRepo();
    const { targets, options } = harness({
      kind: "unchanged",
      headReport: null
    });

    await targets.open(root);

    expect(options.fail).toHaveBeenCalledWith(
      "No se pudo abrir",
      expect.stringContaining("no hay snapshot guardado")
    );
  });

  it("no analiza una raíz protegida", async () => {
    const { targets, options, analyze } = harness(snapshotOutcome("c1"));
    await targets.open(path.parse(process.cwd()).root);
    expect(analyze).not.toHaveBeenCalled();
    expect(options.fail).toHaveBeenCalledWith(
      "No se pudo analizar",
      expect.stringContaining("no analiza")
    );
  });
});

describe("abrir un fichero", () => {
  it("un cc.json suelto no trae resto ni lint", async () => {
    const file = path.join(tempRepo(), "mapa.cc.json");
    fs.writeFileSync(file, JSON.stringify(cc("c1")));
    const { targets, options, sent } = harness(snapshotOutcome("c1"));

    await targets.open(file);

    expect(sent[0]).toMatchObject({
      kind: "snapshot",
      snapshot: cc("c1"),
      rest: null,
      lint: null,
      restLint: null,
      label: file
    });
    expect(options.stopWatching).toHaveBeenCalled();
    expect(options.setRoot).toHaveBeenCalledWith(null);
  });

  it("un report.json se abre como reporte", async () => {
    const file = path.join(tempRepo(), "report.json");
    fs.writeFileSync(file, JSON.stringify({ base: {}, summary: {} }));
    const { targets, sent } = harness(snapshotOutcome("c1"));

    await targets.open(file);

    expect(sent[0]).toMatchObject({ kind: "report", label: file });
  });

  it("un fichero que no se puede leer se dice", async () => {
    const file = path.join(tempRepo(), "roto.json");
    fs.writeFileSync(file, "{no es json");
    const { targets, options } = harness(snapshotOutcome("c1"));

    await targets.open(file);

    expect(options.fail).toHaveBeenCalledWith(
      "No se pudo abrir el fichero",
      expect.stringContaining("roto.json")
    );
  });

  it("una ruta que no existe se dice sin abrir nada", async () => {
    const { targets, options, sent } = harness(snapshotOutcome("c1"));
    await targets.open(path.join(tempRepo(), "no-existe"));
    expect(sent).toHaveLength(0);
    expect(options.fail).toHaveBeenCalledWith(
      "No se pudo abrir",
      expect.stringContaining("No existe")
    );
  });
});
