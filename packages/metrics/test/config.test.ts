import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  ConfigError,
  loadRuleConfig,
  parseRuleConfig
} from "../src/index";

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("parseRuleConfig", () => {
  it("normaliza capas, reglas y patrones", () => {
    const config = parseRuleConfig({
      version: 1,
      layers: [
        { name: "domain", patterns: ["./src/domain/**"] },
        { name: "infra", paths: ["src\\infra\\**"] }
      ],
      rules: [
        {
          name: "domain-no-infra",
          type: "forbidden",
          from: "domain",
          to: "infra"
        },
        {
          name: "complexity",
          type: "threshold",
          metric: "maxComplexity",
          max: 40,
          severity: "warn"
        },
        { name: "cycles", type: "cycles", severity: "info" }
      ]
    });

    expect(config.layers).toEqual([
      { name: "domain", patterns: ["src/domain/**"] },
      { name: "infra", patterns: ["src/infra/**"] }
    ]);
    expect(config.rules[0]).toMatchObject({
      type: "forbidden",
      severity: "error"
    });
    expect(config.rules[1]).toMatchObject({
      type: "threshold",
      metric: "maxComplexity",
      max: 40,
      severity: "warn"
    });
    expect(config.rules[2]).toMatchObject({
      type: "cycles",
      severity: "info"
    });
  });

  it("rechaza configuraciones ambiguas", () => {
    expect(() =>
      parseRuleConfig({ version: 2, layers: [], rules: [] })
    ).toThrow("version debe ser 1");
    expect(() =>
      parseRuleConfig({
        version: 1,
        layers: [
          { name: "a", patterns: ["src/**"] },
          { name: "a", patterns: ["lib/**"] }
        ]
      })
    ).toThrow("capa duplicada");
    expect(() =>
      parseRuleConfig({
        version: 1,
        layers: [{ name: "a", patterns: ["/src/**"] }]
      })
    ).toThrow("relativo al root");
    expect(() =>
      parseRuleConfig({
        version: 1,
        layers: [{ name: "a", patterns: ["src/**"] }],
        rules: [
          {
            name: "bad",
            type: "forbidden",
            from: "a",
            to: "missing"
          }
        ]
      })
    ).toThrow("capa inexistente");
    expect(() =>
      parseRuleConfig({
        version: 1,
        layers: [],
        rules: [
          {
            name: "threshold",
            type: "threshold",
            metric: "rloc",
            min: 10,
            max: 5
          }
        ]
      })
    ).toThrow("min no puede ser mayor");
  });
});

describe("loadRuleConfig", () => {
  it("lee YAML y reporta errores con el fichero", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-config-"));
    tempRoots.push(root);
    const file = path.join(root, ".codarch.yml");
    fs.writeFileSync(
      file,
      [
        "version: 1",
        "layers:",
        "  - name: domain",
        "    paths:",
        "      - src/domain/**",
        "rules:",
        "  - name: no-infra",
        "    type: forbidden",
        "    from: domain",
        "    to: domain",
        "    severity: warn"
      ].join("\n"),
      "utf8"
    );

    const config = loadRuleConfig(file);
    expect(config.rules[0]).toMatchObject({
      type: "forbidden",
      severity: "warn"
    });
  });

  it("falla si el YAML no es válido", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-config-"));
    tempRoots.push(root);
    const file = path.join(root, ".codarch.yml");
    fs.writeFileSync(file, "version: [", "utf8");

    expect(() => loadRuleConfig(file)).toThrow(ConfigError);
    expect(() => loadRuleConfig(file)).toThrow("YAML inválido");
  });
});
