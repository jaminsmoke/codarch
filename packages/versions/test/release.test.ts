import { describe, expect, it } from "vitest";
import { nextProductVersion } from "../src/release";

describe("la siguiente versión del producto", () => {
  it("sube el parche por defecto", () => {
    expect(nextProductVersion("0.3.2", "patch")).toBe("0.3.3");
    expect(nextProductVersion("1.9.9", "patch")).toBe("1.9.10");
  });

  it("el menor y el mayor se piden a mano", () => {
    expect(nextProductVersion("0.3.2", "minor")).toBe("0.4.0");
    expect(nextProductVersion("0.3.2", "major")).toBe("1.0.0");
  });

  it("desde una prerelease, el parche sale a la estable del mismo núcleo", () => {
    expect(nextProductVersion("0.3.1-alpha.8", "patch")).toBe("0.3.1");
  });

  it("desde una prerelease también se puede saltar de menor", () => {
    expect(nextProductVersion("0.3.1-alpha.8", "minor")).toBe("0.4.0");
  });

  it("rechaza lo que no es semver", () => {
    expect(() => nextProductVersion("0.3", "patch")).toThrow(/semver/);
    expect(() => nextProductVersion("v0.3.2", "patch")).toThrow(/semver/);
  });
});
