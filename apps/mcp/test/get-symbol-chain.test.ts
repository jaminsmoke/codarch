import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { saveHistory } from "@codarch/schema";
import { afterEach, describe, expect, it } from "vitest";
import { getSymbolChain } from "../src/tools";
import { makeStore } from "./fixtures";
import { historySnapshot } from "./helpers";

describe("getSymbolChain", () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  function historyRoot(): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-mcp-chain-"));
    roots.push(root);
    saveHistory(
      root,
      historySnapshot("history-1", "cargar"),
      new Date("2026-01-01T00:00:00.000Z")
    );
    saveHistory(
      root,
      historySnapshot("history-2", "buscar"),
      new Date("2026-01-02T00:00:00.000Z")
    );
    return root;
  }

  it("sin símbolo devuelve el calor del repo, no un error", () => {
    const result = getSymbolChain(makeStore(null, historyRoot()));

    expect(result.available).toBe(true);
    expect(result.reason).toBeUndefined();
    expect(result.chains).toEqual([]);
    expect(result.heat.map((entry) => entry.name)).toContain("buscar");
  });

  it("encuentra el nombre antiguo y conserva el tipo del símbolo", () => {
    const store = makeStore(null, historyRoot());

    const renamed = getSymbolChain(store, { symbol: "cargar" });
    expect(renamed.chains).toHaveLength(1);
    expect(renamed.chains[0]?.name).toBe("buscar");
    expect(renamed.chains[0]?.kind).toBe("function");

    const iface = getSymbolChain(store, { symbol: "Guardar" });
    expect(iface.chains[0]?.kind).toBe("interface");
    expect(iface.heat.find((entry) => entry.name === "Guardar")?.kind).toBe(
      "interface"
    );
  });

  it("no devuelve cadenas de ficheros, carpetas o proyecto", () => {
    const result = getSymbolChain(makeStore(null, historyRoot()), {
      symbol: "acme"
    });

    expect(result.available).toBe(true);
    expect(result.chains).toEqual([]);
  });
});
