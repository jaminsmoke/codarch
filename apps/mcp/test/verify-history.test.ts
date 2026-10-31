import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { saveHistory } from "@codarch/schema";
import { afterEach, describe, expect, it } from "vitest";
import { verifyHistory } from "../src/tools";
import { makeStore } from "./fixtures";
import { historySnapshot } from "./helpers";

describe("verifyHistory", () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  function withHistory(): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-mcp-verify-"));
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

  it("declara que no hay historial en vez de inventarlo", () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-mcp-verify-"));
    roots.push(empty);

    const result = verifyHistory(makeStore(null, empty));
    expect(result.available).toBe(false);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("historial");
  });

  it("comprueba el snapshot contra las cadenas guardadas", () => {
    const store = makeStore(null, withHistory());
    const result = verifyHistory(store);

    expect(result.available).toBe(true);
    expect(result.checked).toBeGreaterThan(0);
    expect(typeof result.projectHead).toBe("string");
  });
});
