import { describe, expect, it } from "vitest";
import { historyEntries, symbolHeat } from "../src/platform";

/**
 * Las dos proyecciones que la web y el escritorio escribían por su cuenta: el
 * transporte es de cada plataforma, la forma del payload no.
 */

const ENTRY = {
  date: "2026-10-27T10:00:00.000Z",
  checksum: "abc123",
  files: 4,
  rloc: 120,
  path: "history/2026-10-27-abc123.cc.json"
};

describe("payload de las plataformas", () => {
  it("saca las entradas del historial", () => {
    expect(historyEntries({ entries: [ENTRY] })).toEqual([ENTRY]);
    expect(historyEntries({ entries: [] })).toEqual([]);
    expect(historyEntries({ hist: [ENTRY] })).toBeNull();
  });

  it("saca el calor de los símbolos", () => {
    const heat = [{ id: "a", name: "a", path: "src/a.ts", churn: 3 }];
    expect(symbolHeat({ heat })).toEqual(heat);
    expect(symbolHeat({ heat: {} })).toBeNull();
    expect(symbolHeat({ entries: [] })).toBeNull();
  });

  it("un payload que no se entiende es `null`, no una lista vacía", () => {
    for (const payload of [null, undefined, 7, "no", []]) {
      expect(historyEntries(payload)).toBeNull();
      expect(symbolHeat(payload)).toBeNull();
    }
    expect(historyEntries({})).toBeNull();
    expect(symbolHeat({})).toBeNull();
  });
});
