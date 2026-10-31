import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RepoAnalyzer } from "../src/analyzer";
import type { AnalyzeOutcome } from "../src/analyze-protocol";
import type { DesktopTarget } from "../src/preload";
import { createLive } from "../src/live";

const roots: string[] = [];

function tempRepo(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-live-"));
  roots.push(root);
  return root;
}

function cc(checksum: string) {
  return { meta: { checksum, projectName: "demo" }, files: [] };
}

const parseCache = { format: 2, parser: "typescript", root: "", entries: {} };

function harness(outcome: AnalyzeOutcome) {
  const analyzer: RepoAnalyzer = {
    analyze: vi.fn(async () => outcome),
    refresh: vi.fn(async () => outcome),
    close: () => undefined
  };
  const sent: DesktopTarget[] = [];
  const live = createLive({
    analyzer: () => analyzer,
    send: (target) => sent.push(target),
    sendWatch: vi.fn()
  });
  return { live, sent, analyzer };
}

function snapshotOutcome(
  checksum: string,
  rest: unknown = null
): AnalyzeOutcome {
  return {
    kind: "snapshot",
    snapshot: cc(checksum) as never,
    rest: rest as never,
    files: 1,
    edges: 0,
    warnings: [],
    headReport: null,
    parseCache: parseCache as never
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("el repo vivo", () => {
  it("si el pulso no trae nada nuevo, no escribe ni repinta el mapa", async () => {
    const root = tempRepo();
    const { live, sent } = harness({
      kind: "unchanged",
      headReport: { summary: {} } as never
    });

    await live.refresh(root);

    expect(sent.map((target) => target.kind)).toEqual(["head"]);
    expect(fs.existsSync(path.join(root, ".codarch", "snapshot.cc.json"))).toBe(
      false
    );
    // El reporte del árbol de trabajo sí se guarda: es lo que lee la web.
    expect(fs.existsSync(path.join(root, ".codarch", "head-report.json"))).toBe(
      true
    );
  });

  it("con snapshot nuevo lo guarda y avisa con `refresh`", async () => {
    const root = tempRepo();
    const { live, sent } = harness(snapshotOutcome("c1"));

    await live.refresh(root);

    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      kind: "snapshot",
      label: root,
      refresh: true
    });
    expect(
      JSON.parse(
        fs.readFileSync(path.join(root, ".codarch", "snapshot.cc.json"), "utf8")
      )
    ).toMatchObject({ meta: { checksum: "c1" } });
    expect(fs.existsSync(path.join(root, ".codarch", "parse-cache.json"))).toBe(
      true
    );
  });

  it("si el snapshot y el resto son los mismos, no avisa", async () => {
    const root = tempRepo();
    const first = harness(snapshotOutcome("c1"));
    await first.live.refresh(root);
    expect(first.sent).toHaveLength(1);

    // Otra pasada con el mismo contenido: ni escritura anunciada ni aviso.
    const second = harness(snapshotOutcome("c1"));
    await second.live.refresh(root);
    expect(second.sent).toHaveLength(0);
  });

  it("si solo cambia el resto, avisa igual", async () => {
    const root = tempRepo();
    const rest = (checksum: string) => ({
      ...cc(checksum),
      lenses: { rest: {} }
    });
    const first = harness(snapshotOutcome("c1", rest("r1")));
    await first.live.refresh(root);

    const second = harness(snapshotOutcome("c1", rest("r2")));
    await second.live.refresh(root);

    expect(second.sent).toHaveLength(1);
    expect(second.sent[0]).toMatchObject({ kind: "snapshot", refresh: true });
  });

  it("borra lo que no reconoce al reanalizar", async () => {
    const root = tempRepo();
    fs.mkdirSync(path.join(root, ".codarch"));
    fs.writeFileSync(path.join(root, ".codarch", "map.html"), "<html>");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { live } = harness(snapshotOutcome("c1"));

    await live.refresh(root);

    expect(fs.existsSync(path.join(root, ".codarch", "map.html"))).toBe(false);
  });

  it("no vigila una raíz protegida y lo dice", () => {
    const sendWatch = vi.fn();
    const live = createLive({
      analyzer: () => {
        throw new Error("no debería analizar");
      },
      send: () => undefined,
      sendWatch
    });

    live.watch(path.parse(process.cwd()).root);

    expect(sendWatch).toHaveBeenCalledWith(false);
    expect(live.running()).toBe(false);
  });

  it("un repo que ya no existe no se reanaliza", async () => {
    const { live, sent, analyzer } = harness(snapshotOutcome("c1"));
    await live.refresh(path.join(tempRepo(), "fantasma"));
    expect(analyzer.refresh).not.toHaveBeenCalled();
    expect(sent).toHaveLength(0);
  });
});
