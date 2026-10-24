import { describe, expect, it } from "vitest";
import {
  clearLegacyProject,
  readLastRoot,
  readLegacyProject,
  writeLastRoot
} from "../src/renderer/storage";

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

describe("almacenamiento del escritorio", () => {
  it("recuerda la raíz del último repo", () => {
    const storage = memoryStorage();
    expect(readLastRoot(storage)).toBeNull();
    writeLastRoot("/repos/actual", storage);
    expect(readLastRoot(storage)).toBe("/repos/actual");
  });

  it("lee el proyecto de la versión anterior y lo olvida", () => {
    const storage = memoryStorage();
    storage.setItem(
      "codarch.project.v1",
      JSON.stringify({
        snapshot: { meta: { projectName: "viejo" }, files: [] },
        report: null,
        label: "/repos/viejo",
        reportLabel: null
      })
    );

    const legado = readLegacyProject(storage);
    expect(legado?.label).toBe("/repos/viejo");
    expect(legado?.addons).toEqual([]);

    clearLegacyProject(storage);
    expect(readLegacyProject(storage)).toBeNull();
  });

  it("descarta un proyecto viejo que no se entiende", () => {
    const storage = memoryStorage();
    storage.setItem("codarch.project.v1", "{roto");
    expect(readLegacyProject(storage)).toBeNull();

    storage.setItem(
      "codarch.project.v1",
      JSON.stringify({ label: "/repos/x", snapshot: null })
    );
    expect(readLegacyProject(storage)).toBeNull();
  });
});
