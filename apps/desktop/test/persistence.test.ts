import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isDirectory,
  isSnapshot,
  persistProject,
  persistedChecksum,
  readPersistedLint,
  readPersistedRest,
  readPersistedRestLint,
  readPersistedSnapshot,
  restoreProject,
  storeRest,
  storeRestLint,
  sweepState,
  writeSnapshot
} from "../src/persistence";

const roots: string[] = [];

function tempRepo(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-desktop-"));
  roots.push(root);
  return root;
}

/** Un cc.json mínimo: lo que `isSnapshot` reconoce. */
function cc(checksum: string, extra: Record<string, unknown> = {}) {
  return { meta: { checksum, projectName: "demo" }, files: [], ...extra };
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("lo que el escritorio guarda en .codarch/", () => {
  it("escribe el snapshot en su nombre y recuerda su checksum", () => {
    const root = tempRepo();
    expect(writeSnapshot(root, cc("c1"))).toBe(true);

    const file = path.join(root, ".codarch", "snapshot.cc.json");
    expect(JSON.parse(fs.readFileSync(file, "utf8"))).toMatchObject({
      meta: { checksum: "c1" }
    });
    expect(persistedChecksum(root)).toBe("c1");
    expect(readPersistedSnapshot(root)).not.toBeNull();
  });

  it("no reescribe un snapshot que ya está en disco", () => {
    const root = tempRepo();
    writeSnapshot(root, cc("c1"));
    const file = path.join(root, ".codarch", "snapshot.cc.json");
    const before = fs.statSync(file).mtimeMs;

    persistProject(root, cc("c1"), null);

    expect(fs.statSync(file).mtimeMs).toBe(before);
  });

  it("persiste el reporte si viene y no lo toca si es null", () => {
    const root = tempRepo();
    persistProject(root, cc("c1"), { base: {}, summary: {} });
    expect(
      JSON.parse(
        fs.readFileSync(path.join(root, ".codarch", "report.json"), "utf8")
      )
    ).toMatchObject({ summary: {} });

    const file = path.join(root, ".codarch", "report.json");
    const before = fs.readFileSync(file, "utf8");
    persistProject(root, cc("c2"), null);
    expect(fs.readFileSync(file, "utf8")).toBe(before);
  });

  it("un fichero suelto no es un proyecto", () => {
    const file = path.join(tempRepo(), "suelto.json");
    fs.writeFileSync(file, "{}");
    expect(isDirectory(file)).toBe(false);
    expect(persistProject(file, cc("c1"), null)).toBe(false);
  });

  it("el resto solo cuenta si es un mapa del resto", () => {
    const root = tempRepo();
    storeRest(root, cc("rest-1"));
    expect(readPersistedRest(root)).toBeNull();

    expect(storeRest(root, cc("rest-2", { lenses: { rest: {} } }))).toBe(true);
    expect(readPersistedRest(root)).not.toBeNull();
    // El mismo contenido no se anuncia como cambio.
    expect(storeRest(root, cc("rest-2", { lenses: { rest: {} } }))).toBe(false);
  });

  it("el lint se lee tal cual, sin validarlo aquí", () => {
    const root = tempRepo();
    expect(readPersistedLint(root)).toBeNull();
    fs.mkdirSync(path.join(root, ".codarch"));
    fs.writeFileSync(
      path.join(root, ".codarch", "lint.repmod.json"),
      JSON.stringify({ schemaVersion: "1.2" })
    );
    expect(readPersistedLint(root)).toEqual({ schemaVersion: "1.2" });
  });

  it("las reglas del resto se leen y se guardan como el lint", () => {
    const root = tempRepo();
    expect(readPersistedRestLint(root)).toBeNull();
    storeRestLint(root, { schemaVersion: "1.2", meta: { tools: ["codarch"] } } as never);
    expect(readPersistedRestLint(root)).toEqual({
      schemaVersion: "1.2",
      meta: { tools: ["codarch"] }
    });
  });

  it("restaura el proyecto con sus addons y sin snapshot no hay nada", () => {
    const root = tempRepo();
    expect(restoreProject(root)).toBeNull();
    writeSnapshot(root, cc("c1"));
    const restored = restoreProject(root);
    expect(restored?.snapshot).toMatchObject({ meta: { checksum: "c1" } });
    expect(restored?.addons).toEqual({ addons: [], errors: [] });
    expect(restored?.report).toBeNull();
  });

  it("borra lo que no reconoce y lo dice", () => {
    const root = tempRepo();
    writeSnapshot(root, cc("c1"));
    const codarch = path.join(root, ".codarch");
    fs.writeFileSync(path.join(codarch, "map.html"), "<html>");
    fs.writeFileSync(path.join(codarch, "preferences.json"), "{}");
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(sweepState(root)).toEqual(["map.html"]);
    expect(fs.existsSync(path.join(codarch, "map.html"))).toBe(false);
    expect(fs.existsSync(path.join(codarch, "preferences.json"))).toBe(true);
    expect(String(error.mock.calls[0]?.[0] ?? "")).toContain("map.html");
  });

  it("reconoce un snapshot y no un reporte", () => {
    expect(isSnapshot(cc("c1"))).toBe(true);
    expect(isSnapshot({ base: {}, summary: {} })).toBe(false);
    expect(isSnapshot(null)).toBe(false);
  });
});
