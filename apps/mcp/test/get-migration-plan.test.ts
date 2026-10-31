import { describe, expect, it } from "vitest";
import { getMigrationPlan } from "../src/tools";
import { makeStore } from "./fixtures";

describe("getMigrationPlan", () => {
  it("devuelve el estado de la migración y los ficheros con más deuda", () => {
    const result = getMigrationPlan(makeStore());
    expect(result.available).toBe(true);
    expect(result.summary?.debt).toBe(72);
    expect(result.summary?.crossings).toBe(4);
    expect(result.summary?.status.rust).toBe(0);
    expect(result.topDebt.map((file) => file.path)).toEqual([
      "src/domain/c.ts",
      "src/a.ts",
      "src/b.ts",
      "index.ts"
    ]);
    expect(result.topDebt[0]?.debt).toBe(42);
    expect(result.topDebt[0]?.crossings).toBe(2);
  });

  it("limita el plan a una carpeta", () => {
    const result = getMigrationPlan(makeStore(), { folder: "src/domain" });
    expect(result.topDebt.map((file) => file.path)).toEqual(["src/domain/c.ts"]);
  });

  it("trae los cambios de deuda del reporte", () => {
    const result = getMigrationPlan(makeStore());
    expect(result.changes.available).toBe(true);
    if (!result.changes.available) return;
    expect(result.changes.increased[0]?.path).toBe("src/domain/c.ts");
    expect(result.changes.debt).toEqual({ base: 40, head: 30, delta: -10 });
  });

  it("declara cuando no hay reporte", () => {
    const result = getMigrationPlan(makeStore(null));
    expect(result.changes.available).toBe(false);
    expect(result.summary?.debt).toBe(72);
  });
});
