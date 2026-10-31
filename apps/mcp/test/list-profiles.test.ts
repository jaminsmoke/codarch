import { describe, expect, it } from "vitest";
import { listProfiles } from "../src/tools";

describe("listProfiles", () => {
  it("lista el catálogo con sus capas y sus reglas", () => {
    const result = listProfiles();

    expect(result.configVersion).toBe(1);
    expect(result.profiles.length).toBeGreaterThan(0);
    const first = result.profiles[0];
    expect(typeof first?.id).toBe("string");
    expect(first?.layers.length).toBeGreaterThan(0);
    expect(first?.rules[0]?.severity).toBeTruthy();
  });
});
