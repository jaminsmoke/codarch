import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CC_JSON_VERSION,
  CHAIN_LEDGER_VERSION,
  CLI_VERSION,
  CONFIG_VERSION,
  DESKTOP_VERSION,
  DOCKER_VERSION,
  ENGINE_VERSION,
  HISTORY_VERSION,
  MCP_VERSION,
  REPORT_SCHEMA_VERSION,
  WEB_VERSION
} from "../src/index";

/**
 * Una versión por componente (ADR 0065): el manifiesto sale de
 * `versions.json` y cada package.json sigue la suya.
 */

function read(relative: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(new URL(relative, import.meta.url), "utf8")
  ) as Record<string, unknown>;
}

describe("las versiones declaradas", () => {
  it("el manifiesto y versions.json dicen lo mismo", () => {
    const declared = read("../../../versions.json");

    expect(declared.engine).toBe(ENGINE_VERSION);
    expect(declared.cli).toBe(CLI_VERSION);
    expect(declared.desktop).toBe(DESKTOP_VERSION);
    expect(declared.web).toBe(WEB_VERSION);
    expect(declared.mcp).toBe(MCP_VERSION);
    expect(declared.docker).toBe(DOCKER_VERSION);
    expect(declared.ccJson).toBe(CC_JSON_VERSION);
    expect(declared.report).toBe(REPORT_SCHEMA_VERSION);
    expect(declared.config).toBe(CONFIG_VERSION);
    expect(declared.history).toBe(HISTORY_VERSION);
    expect(declared.chainLedger).toBe(CHAIN_LEDGER_VERSION);
  });

  it("cada package.json lleva la versión de su componente", () => {
    expect(read("../../../package.json").version).toBe(ENGINE_VERSION);
    expect(read("../../../apps/cli/package.json").version).toBe(CLI_VERSION);
    expect(read("../../../apps/desktop/package.json").version).toBe(
      DESKTOP_VERSION
    );
    expect(read("../../../apps/web/package.json").version).toBe(WEB_VERSION);
    expect(read("../../../apps/mcp/package.json").version).toBe(MCP_VERSION);
  });

  it("los formatos tienen una forma estable", () => {
    expect(CC_JSON_VERSION).toMatch(/^\d+\.\d+$/);
    expect(REPORT_SCHEMA_VERSION).toMatch(/^\d+\.\d+$/);
    expect(Number.isInteger(CONFIG_VERSION)).toBe(true);
    expect(Number.isInteger(HISTORY_VERSION)).toBe(true);
    expect(Number.isInteger(CHAIN_LEDGER_VERSION)).toBe(true);
  });
});
