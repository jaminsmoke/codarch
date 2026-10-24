import path from "node:path";
import { describe, expect, it } from "vitest";
import { chainLedgerPath } from "../src/chain-store";
import { historyLocation } from "../src/history-store";

/**
 * El estado es de cada repositorio, no de la app (ADR 0050).
 *
 * Snapshot, reporte y libro de cadenas viven en `.codarch/` del repo; el
 * historial, en `.codarch-history/`. Nada de esto se guarda en el perfil de
 * instalación de CodArch.
 */
describe("el estado es de cada repositorio", () => {
  const root = path.join(path.sep, "repos", "app");

  it("el libro de cadenas vive en el .codarch del repo", () => {
    expect(chainLedgerPath(root)).toBe(
      path.join(root, ".codarch", "chains.json")
    );
  });

  it("el historial vive en el .codarch-history del repo", () => {
    expect(historyLocation(root).directory).toBe(
      path.join(root, ".codarch-history")
    );
    expect(historyLocation(root).indexFile).toBe(
      path.join(root, ".codarch-history", "index.json")
    );
  });
});
