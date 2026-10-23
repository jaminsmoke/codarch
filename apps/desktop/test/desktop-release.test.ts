import { describe, expect, it } from "vitest";
import {
  desktopVersions,
  planDesktopRelease
} from "../../../scripts/desktop-release.ts";

describe("desktopVersions", () => {
  it("se queda con las etiquetas del escritorio y las ordena", () => {
    expect(
      desktopVersions([
        "desktop-v0.3.0-alpha.2",
        "v1",
        "desktop-v0.2.0",
        "desktop-vno-es-version",
        "desktop-v0.3.0-alpha.10"
      ])
    ).toEqual(["0.2.0", "0.3.0-alpha.2", "0.3.0-alpha.10"]);
  });

  it("una prerelease va antes que su estable", () => {
    expect(desktopVersions(["desktop-v0.3.0", "desktop-v0.3.0-alpha.2"])).toEqual([
      "0.3.0-alpha.2",
      "0.3.0"
    ]);
  });
});

describe("planDesktopRelease", () => {
  it("publica la primera vez que no hay ningún release", () => {
    expect(planDesktopRelease("0.3.0-alpha.2", [], "push")).toEqual({
      version: "0.3.0-alpha.2",
      latest: null,
      shouldRelease: true,
      shouldBuild: true
    });
  });

  it("publica cuando la versión es mayor que el último release", () => {
    expect(
      planDesktopRelease("0.3.0-alpha.2", ["desktop-v0.3.0-alpha.1"], "push")
    ).toMatchObject({
      latest: "0.3.0-alpha.1",
      shouldRelease: true,
      shouldBuild: true
    });
  });

  it("no publica ni construye si la versión ya está publicada", () => {
    expect(
      planDesktopRelease("0.3.0-alpha.2", ["desktop-v0.3.0-alpha.2"], "push")
    ).toMatchObject({
      latest: "0.3.0-alpha.2",
      shouldRelease: false,
      shouldBuild: false
    });
  });

  it("no publica si el release es más nuevo", () => {
    expect(
      planDesktopRelease("0.3.0-alpha.2", ["desktop-v0.3.0-alpha.3"], "push")
    ).toMatchObject({
      latest: "0.3.0-alpha.3",
      shouldRelease: false,
      shouldBuild: false
    });
  });

  it("un PR construye aunque no haya release", () => {
    expect(
      planDesktopRelease("0.3.0-alpha.2", ["desktop-v0.3.0-alpha.2"], "pull_request")
    ).toMatchObject({
      shouldRelease: false,
      shouldBuild: true
    });
  });

  it("un workflow_dispatch construye para probar los instaladores", () => {
    expect(
      planDesktopRelease(
        "0.3.0-alpha.2",
        ["desktop-v0.3.0-alpha.2"],
        "workflow_dispatch"
      )
    ).toMatchObject({
      shouldRelease: false,
      shouldBuild: true
    });
  });
});
