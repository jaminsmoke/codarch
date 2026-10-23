import { describe, expect, it } from "vitest";
import { readMigration, readReport } from "../src/data";

describe("lectura de datos del proyecto", () => {
  it("lee la lente de migración si trae nodos y resumen", () => {
    const migration = { nodes: {}, summary: { languages: {} } };
    expect(readMigration({ lenses: { migration } } as never)).toBe(migration);
  });

  it("ignora una lente de migración incompleta", () => {
    expect(readMigration({ lenses: { migration: { nodes: {} } } } as never)).toBeNull();
  });

  it("devuelve null cuando el reporte no es válido", () => {
    expect(readReport({})).toBeNull();
  });
});
