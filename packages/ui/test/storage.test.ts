import { describe, expect, it } from "vitest";
import {
  PREFERENCES_KEY,
  PLUGINS_KEY,
  forgetKey,
  parseSavedProject,
  readEnabledPlugins,
  readPreferences,
  readSavedProject,
  writeEnabledPlugins,
  writePreferences
} from "../src/storage";

/**
 * El almacén local de la máquina, que hasta ahora estaba copiado en la web y en
 * el escritorio: un solo sitio para las preferencias, los plugins y la forma de
 * un proyecto guardado.
 */

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

describe("almacén local compartido", () => {
  it("guarda y recupera preferencias y plugins", () => {
    const storage = memoryStorage();
    const preferences = {
      areaMetric: "rloc",
      colorMode: "status",
      showLabels: false
    };

    writePreferences(preferences, storage);
    writeEnabledPlugins(["vista-3d"], storage);

    expect(storage.getItem(PREFERENCES_KEY)).not.toBeNull();
    expect(storage.getItem(PLUGINS_KEY)).not.toBeNull();
    expect(readPreferences(storage)).toEqual(preferences);
    expect(readEnabledPlugins(storage)).toEqual(["vista-3d"]);
  });

  it("sin almacén no hay nada que leer ni romper", () => {
    expect(readPreferences(null)).toBeNull();
    expect(readEnabledPlugins(null)).toEqual([]);
    expect(readSavedProject("codarch.project.v1", null)).toBeNull();
    expect(() => writePreferences({ areaMetric: null, colorMode: "size", showLabels: true }, null)).not.toThrow();
    expect(() => writeEnabledPlugins(["x"], null)).not.toThrow();
    expect(() => forgetKey("codarch.project.v1", null)).not.toThrow();
  });

  it("descarta lo que no se entiende", () => {
    const storage = memoryStorage();
    storage.setItem(PREFERENCES_KEY, "{roto");
    storage.setItem(PLUGINS_KEY, JSON.stringify({ no: "es lista" }));
    expect(readPreferences(storage)).toBeNull();
    expect(readEnabledPlugins(storage)).toEqual([]);

    expect(parseSavedProject(null)).toBeNull();
    expect(parseSavedProject({ label: "x", snapshot: null })).toBeNull();
    expect(parseSavedProject({ snapshot: { files: [] } })).toBeNull();
  });

  it("normaliza un proyecto guardado y conserva sus addons", () => {
    const project = parseSavedProject({
      snapshot: { meta: { apiVersion: "2.0" } },
      label: "/repos/x",
      reportLabel: 7,
      addons: ["vista-3d"]
    });

    expect(project).toEqual({
      snapshot: { meta: { apiVersion: "2.0" } },
      report: null,
      label: "/repos/x",
      reportLabel: null,
      addons: ["vista-3d"]
    });
  });

  it("lee el proyecto de una clave y lo olvida cuando se le pide", () => {
    const storage = memoryStorage();
    const key = "codarch.project.v1";
    storage.setItem(
      key,
      JSON.stringify({
        snapshot: { files: [] },
        report: null,
        label: "/repos/x",
        reportLabel: null
      })
    );

    expect(readSavedProject(key, storage)?.label).toBe("/repos/x");
    forgetKey(key, storage);
    expect(readSavedProject(key, storage)).toBeNull();
  });
});
