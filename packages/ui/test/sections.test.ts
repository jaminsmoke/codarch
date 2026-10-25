import { describe, expect, it } from "vitest";
import {
  readSectionClosed,
  sectionKey,
  writeSectionClosed,
  type SectionStorage
} from "../src/sections";

function store(initial: Record<string, string> = {}): SectionStorage & {
  values: Record<string, string>;
} {
  const values = { ...initial };
  return {
    values,
    getItem: (key) => values[key] ?? null,
    setItem: (key, value) => {
      values[key] = value;
    }
  };
}

describe("el estado de una sección", () => {
  it("usa el identificador con prefijo, no una clave suelta", () => {
    expect(sectionKey("metrics")).toBe("codarch:section:metrics");
  });

  it("cae al estado por defecto cuando no hay nada guardado", () => {
    expect(readSectionClosed(store(), "metrics")).toBe(false);
    expect(readSectionClosed(store(), "metrics", true)).toBe(true);
    expect(readSectionClosed(null, "metrics")).toBe(false);
  });

  it("recuerda si se cerró o se abrió", () => {
    const storage = store();
    writeSectionClosed(storage, "metrics", true);
    expect(readSectionClosed(storage, "metrics")).toBe(true);
    writeSectionClosed(storage, "metrics", false);
    expect(readSectionClosed(storage, "metrics")).toBe(false);
  });

  it("no se fía de lo que no entiende", () => {
    expect(
      readSectionClosed(store({ "codarch:section:metrics": "plegado" }), "metrics")
    ).toBe(false);
  });

  it("sigue funcionando si el almacenamiento lanza", () => {
    const broken: SectionStorage = {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: () => {
        throw new Error("bloqueado");
      }
    };
    expect(readSectionClosed(broken, "metrics")).toBe(false);
    expect(() => writeSectionClosed(broken, "metrics", true)).not.toThrow();
  });
});
