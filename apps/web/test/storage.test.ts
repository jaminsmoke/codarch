import { describe, expect, it } from "vitest";
import {
  clearProject,
  readPreferences,
  readProject,
  writePreferences,
  writeProject
} from "../src/storage";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => {
      map.delete(key);
    },
    setItem: (key, value) => {
      map.set(key, value);
    }
  } as Storage;
}

describe("almacenamiento del visor", () => {
  it("guarda y recupera las preferencias", () => {
    const storage = memoryStorage();
    writePreferences(
      { areaMetric: "migrationDebt", colorMode: "status", showLabels: true },
      storage
    );
    expect(readPreferences(storage)).toEqual({
      areaMetric: "migrationDebt",
      colorMode: "status",
      showLabels: true
    });
  });

  it("ignora preferencias inválidas", () => {
    const storage = memoryStorage();
    storage.setItem("codarch.preferences.v1", "{no-json");
    expect(readPreferences(storage)).toBeNull();
  });

  it("guarda y recupera un proyecto", () => {
    const storage = memoryStorage();
    const project = {
      snapshot: { meta: { apiVersion: "2.0" } },
      report: { schemaVersion: "1.0" },
      label: "repo/.codarch/snapshot.cc.json",
      reportLabel: "repo/.codarch/report.json"
    };

    expect(writeProject(project, storage)).toBe(true);
    expect(readProject(storage)).toEqual(project);
  });

  it("guarda el mapa del resto junto al del código", () => {
    const storage = memoryStorage();
    const project = {
      snapshot: { meta: { apiVersion: "2.0" }, bloat: "x".repeat(2_000_000) },
      rest: { meta: { apiVersion: "2.0" }, bloat: "y".repeat(300_000) },
      report: null,
      label: "repo/.codarch/snapshot.cc.json",
      reportLabel: null
    };

    // Los dos artefactos caben: el límite es para un proyecto con su resto
    // (ADR 0093), no para un cc.json suelto.
    expect(writeProject(project, storage)).toBe(true);
    expect(readProject(storage)?.rest).toEqual(project.rest);
  });

  it("guarda el lint junto al proyecto", () => {
    const storage = memoryStorage();
    const lint = {
      schemaVersion: "1.0",
      meta: { checksum: "abc", tools: ["eslint"] },
      files: {},
      summary: { files: 0, errors: 2, warnings: 1, messages: 3 }
    };
    const project = {
      snapshot: { meta: { apiVersion: "2.0" } },
      lint,
      report: null,
      label: "repo/.codarch/snapshot.cc.json",
      reportLabel: null
    };

    expect(writeProject(project, storage)).toBe(true);
    expect(readProject(storage)?.lint).toEqual(lint);
  });

  it("elimina proyectos corruptos y respeta el límite de tamaño", () => {
    const storage = memoryStorage();
    storage.setItem("codarch.project.v1", "{roto");
    expect(readProject(storage)).toBeNull();
    expect(storage.getItem("codarch.project.v1")).toBeNull();

    expect(
      writeProject(
        {
          snapshot: { huge: "x".repeat(4_500_000) },
          report: null,
          label: "grande",
          reportLabel: null
        },
        storage
      )
    ).toBe(false);
    expect(storage.getItem("codarch.project.v1")).toBeNull();
  });

  it("limpia el proyecto guardado", () => {
    const storage = memoryStorage();
    writeProject(
      {
        snapshot: { ok: true },
        report: null,
        label: "x",
        reportLabel: null
      },
      storage
    );
    clearProject(storage);
    expect(readProject(storage)).toBeNull();
  });
});
