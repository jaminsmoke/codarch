import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseCcJson, type CcJson } from "@codarch/schema";
import { afterEach, describe, expect, it } from "vitest";
import { ArchitectureStore, loadArchitectureStore } from "../src/store";
import { makeReport, SNAPSHOT } from "./fixtures";

const temporary: string[] = [];

function repository(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-mcp-"));
  temporary.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of temporary.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("loadArchitectureStore", () => {
  it("carga el snapshot y el reporte por defecto", () => {
    const root = repository();
    fs.mkdirSync(path.join(root, ".codarch"));
    fs.writeFileSync(
      path.join(root, ".codarch", "snapshot.cc.json"),
      JSON.stringify(SNAPSHOT)
    );
    fs.writeFileSync(
      path.join(root, ".codarch", "report.json"),
      JSON.stringify(makeReport())
    );

    const store = loadArchitectureStore({ root });
    expect(store.report).not.toBeNull();
    expect(store.summary().reportLoaded).toBe(true);
    expect(store.files).toHaveLength(5);
  });

  it("respeta --no-report aunque exista el reporte por defecto", () => {
    const root = repository();
    fs.mkdirSync(path.join(root, ".codarch"));
    fs.writeFileSync(
      path.join(root, ".codarch", "snapshot.cc.json"),
      JSON.stringify(SNAPSHOT)
    );
    fs.writeFileSync(
      path.join(root, ".codarch", "report.json"),
      JSON.stringify(makeReport())
    );

    const store = loadArchitectureStore({ root, report: null });
    expect(store.report).toBeNull();
    expect(store.reportPath).toBeNull();
  });

  it("falla si se pide un reporte explícito que no existe", () => {
    const root = repository();
    fs.mkdirSync(path.join(root, ".codarch"));
    fs.writeFileSync(
      path.join(root, ".codarch", "snapshot.cc.json"),
      JSON.stringify(SNAPSHOT)
    );

    expect(() =>
      loadArchitectureStore({ root, report: "missing.json" })
    ).toThrow(/no encuentro el reporte/);
  });
});

describe("snapshots con varias raíces", () => {
  it("conserva el nombre de la raíz para no colisionar rutas", () => {
    const multi: CcJson = {
      meta: {
        projectName: "multi",
        apiVersion: "2.1",
        checksum: "multi-checksum",
        commitHash: "multi-commit"
      },
      files: [
        {
          id: "one",
          name: "one",
          type: "Folder",
          children: [{ id: "a1", name: "a.ts", type: "File" }]
        },
        {
          id: "two",
          name: "two",
          type: "Folder",
          children: [{ id: "a2", name: "a.ts", type: "File" }]
        }
      ],
      lenses: {
        metrics: {
          attributes: {
            a1: { rloc: 10 },
            a2: { rloc: 20 }
          }
        }
      }
    };

    const store = new ArchitectureStore(parseCcJson(multi));
    expect(store.files.map((file) => file.path)).toEqual([
      "one/a.ts",
      "two/a.ts"
    ]);
    expect(store.resolveTarget("two/a.ts")).toMatchObject({ id: "a2" });
  });
});

describe("prefijo de la raíz", () => {
  it("acepta el nombre de la raíz sin romper rutas reales", () => {
    const single: CcJson = {
      meta: {
        projectName: "src",
        apiVersion: "2.1",
        checksum: "single-checksum",
        commitHash: "single-commit"
      },
      files: [
        {
          id: "root",
          name: "src",
          type: "Folder",
          children: [{ id: "file", name: "a.ts", type: "File" }]
        }
      ],
      lenses: {
        metrics: {
          attributes: { file: { rloc: 5 } }
        }
      }
    };

    const store = new ArchitectureStore(parseCcJson(single));
    expect(store.resolveTarget("a.ts")).toMatchObject({ path: "a.ts" });
    expect(store.resolveTarget("src/a.ts")).toMatchObject({ path: "a.ts" });
  });
});
