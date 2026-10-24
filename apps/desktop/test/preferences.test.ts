import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  preferencesPath,
  readRepoPreferences,
  writeRepoPreferences
} from "../src/preferences";

function repo(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-prefs-"));
  fs.mkdirSync(path.join(root, ".codarch"));
  return root;
}

describe("las preferencias de un repositorio", () => {
  it("viven en .codarch/preferences.json", () => {
    const root = repo();
    try {
      expect(preferencesPath(root)).toBe(
        path.join(root, ".codarch", "preferences.json")
      );
      expect(
        writeRepoPreferences(root, {
          areaMetric: "rloc",
          colorMode: "migrationDebt",
          showLabels: false
        })
      ).toBe(true);
      expect(fs.existsSync(preferencesPath(root))).toBe(true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("se leen tal cual se escribieron", () => {
    const root = repo();
    try {
      const preferences = {
        areaMetric: "maxComplexity",
        colorMode: "risk",
        showLabels: true
      };
      writeRepoPreferences(root, preferences);
      expect(readRepoPreferences(root)).toEqual(preferences);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("descartan un fichero roto o incompleto", () => {
    const root = repo();
    try {
      fs.writeFileSync(preferencesPath(root), "{roto", "utf8");
      expect(readRepoPreferences(root)).toBeNull();
      fs.writeFileSync(preferencesPath(root), '{"showLabels":true}', "utf8");
      expect(readRepoPreferences(root)).toBeNull();
      fs.writeFileSync(preferencesPath(root), '{"colorMode":"risk"}', "utf8");
      expect(readRepoPreferences(root)).toEqual({
        areaMetric: null,
        colorMode: "risk",
        showLabels: true
      });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("cada repo tiene las suyas", () => {
    const first = repo();
    const second = repo();
    try {
      writeRepoPreferences(first, {
        areaMetric: "rloc",
        colorMode: "risk",
        showLabels: true
      });
      expect(readRepoPreferences(second)).toBeNull();
    } finally {
      fs.rmSync(first, { recursive: true, force: true });
      fs.rmSync(second, { recursive: true, force: true });
    }
  });
});
