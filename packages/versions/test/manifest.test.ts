import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CC_JSON_VERSION,
  CHAIN_LEDGER_VERSION,
  CONFIG_VERSION,
  HISTORY_VERSION,
  PRODUCT_VERSION,
  REPORT_SCHEMA_VERSION
} from "../src/index";

/**
 * Las versiones de los componentes se declaran una vez (ADR 0041): el
 * manifiesto sale de `versions.json` y los package.json lo siguen.
 */

function read(relative: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(new URL(relative, import.meta.url), "utf8")
  ) as Record<string, unknown>;
}

describe("las versiones declaradas", () => {
  it("el manifiesto y versions.json dicen lo mismo", () => {
    const declared = read("../../../versions.json");

    expect(declared.product).toBe(PRODUCT_VERSION);
    expect(declared.ccJson).toBe(CC_JSON_VERSION);
    expect(declared.report).toBe(REPORT_SCHEMA_VERSION);
    expect(declared.config).toBe(CONFIG_VERSION);
    expect(declared.history).toBe(HISTORY_VERSION);
    expect(declared.chainLedger).toBe(CHAIN_LEDGER_VERSION);
  });

  it("los package.json del producto no se separan", () => {
    for (const file of [
      "../../../package.json",
      "../../../apps/cli/package.json",
      "../../../apps/desktop/package.json",
      "../../../apps/mcp/package.json"
    ]) {
      expect(read(file).version).toBe(PRODUCT_VERSION);
    }
  });

  it("los formatos tienen una forma estable", () => {
    expect(CC_JSON_VERSION).toMatch(/^\d+\.\d+$/);
    expect(REPORT_SCHEMA_VERSION).toMatch(/^\d+\.\d+$/);
    expect(Number.isInteger(CONFIG_VERSION)).toBe(true);
    expect(Number.isInteger(HISTORY_VERSION)).toBe(true);
    expect(Number.isInteger(CHAIN_LEDGER_VERSION)).toBe(true);
  });
});
