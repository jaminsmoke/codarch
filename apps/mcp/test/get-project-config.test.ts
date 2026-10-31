import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getProjectConfig } from "../src/tools";
import { makeReport, makeStore } from "./fixtures";

describe("getProjectConfig", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  /** Un repo de mentira con los ficheros que se le pidan. */
  function repo(files: Record<string, string>): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-mcp-"));
    dirs.push(root);
    for (const [name, content] of Object.entries(files)) {
      const file = path.join(root, name);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, content);
    }
    return root;
  }

  const ADDON = JSON.stringify({
    name: "demo",
    version: "0.1.0",
    title: "Demo",
    contributes: { views: ["views.yml"] }
  });

  it("lee las reglas del equipo y los addons con sus vistas", () => {
    const root = repo({
      ".codarch.yml": `version: 1
addons:
  - demo
ignore:
  - packages/*/test/fixtures/**
rules:
  - type: threshold
    name: complejidad
    metric: maxComplexity
    max: 25
    severity: warn
`,
      "addons/demo/addon.json": ADDON,
      "addons/demo/views.yml": `- id: capas
  title: Las capas
  state:
    focus: src/domain
    labels: true
`
    });

    const config = getProjectConfig(makeStore(makeReport(), root));
    expect(config.available).toBe(true);
    expect(config.file).toBe(".codarch.yml");
    expect(config.profile).toBeNull();
    expect(config.rules.map((rule) => rule.name)).toEqual(["complejidad"]);
    expect(config.rules[0]?.source).toBe("config");
    expect(config.ignore).toEqual(["packages/*/test/fixtures/**"]);
    expect(config.addons.map((addon) => addon.name)).toEqual(["demo"]);
    expect(config.addons[0]?.views[0]?.id).toBe("capas");
    expect(config.addons[0]?.views[0]?.state.focus).toBe("src/domain");
    expect(config.errors).toEqual([]);
    expect(config.reason).toBeUndefined();
  });

  it("si el addon declarado falta, lo dice en vez de callar", () => {
    const root = repo({
      ".codarch.yml": `version: 1
addons:
  - fantasma
ignore:
  - vendor/**
`
    });

    const config = getProjectConfig(makeStore(null, root));
    expect(config.available).toBe(true);
    expect(config.rules).toEqual([]);
    expect(config.ignore).toEqual(["vendor/**"]);
    expect(config.addons).toEqual([]);
    expect(config.reason).toMatch(/fantasma/);
  });

  it("sin .codarch.yml no hay configuración ni addons declarados", () => {
    const root = repo({ "addons/demo/addon.json": ADDON });

    const config = getProjectConfig(makeStore(null, root));
    expect(config.available).toBe(false);
    expect(config.file).toBeNull();
    expect(config.ignore).toEqual([]);
    expect(config.addons).toEqual([]);
    expect(config.reason).toMatch(/\.codarch\.yml/);
  });
});
