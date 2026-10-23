import { describe, expect, it } from "vitest";
import { canAutoUpdate } from "../src/updates";

describe("actualizaciones automáticas", () => {
  it("funcionan en Windows y Linux empaquetados", () => {
    expect(canAutoUpdate("win32", true)).toBe(true);
    expect(canAutoUpdate("linux", true)).toBe(true);
  });

  it("no se activan en macOS sin firma", () => {
    expect(canAutoUpdate("darwin", true)).toBe(false);
  });

  it("no se activan en desarrollo", () => {
    expect(canAutoUpdate("win32", false)).toBe(false);
    expect(canAutoUpdate("linux", false)).toBe(false);
  });
});
