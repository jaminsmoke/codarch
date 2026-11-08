import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { LintError, writeLintRule } from "../src/index";

const roots: string[] = [];

function repo(config?: unknown): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-lint-write-"));
  roots.push(root);
  fs.mkdirSync(path.join(root, "node_modules/oxlint/bin"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "node_modules/oxlint/bin/oxlint"),
    "// binario",
    "utf8"
  );
  if (config !== undefined) {
    fs.writeFileSync(
      path.join(root, ".oxlintrc.json"),
      JSON.stringify(config, null, 2),
      "utf8"
    );
  }
  return root;
}

function read(root: string): Record<string, unknown> {
  return JSON.parse(
    fs.readFileSync(path.join(root, ".oxlintrc.json"), "utf8")
  ) as Record<string, unknown>;
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("escribir una regla de oxlint", () => {
  it("activa una regla y conserva el resto del documento", () => {
    const root = repo({
      $schema: "./node_modules/oxlint/configuration_schema.json",
      categories: { correctness: "off" },
      rules: { "no-var": "error" }
    });

    const result = writeLintRule(root, {
      system: "oxlint",
      rule: "no-eval",
      severity: "warn"
    });

    expect(result.path).toBe(".oxlintrc.json");
    expect(read(root)).toEqual({
      $schema: "./node_modules/oxlint/configuration_schema.json",
      categories: { correctness: "off" },
      rules: { "no-var": "error", "no-eval": "warn" }
    });
    expect(result.after.endsWith("\n")).toBe(true);
  });

  it("desactiva una regla explícita sin dejar la entrada", () => {
    const root = repo({
      categories: { correctness: "off" },
      rules: { "no-var": "error", "no-eval": "warn" }
    });

    writeLintRule(root, { system: "oxlint", rule: "no-var", severity: null });

    expect(read(root).rules).toEqual({ "no-eval": "warn" });
  });

  it("desactiva con off si una categoría puede encender la regla", () => {
    const root = repo({
      categories: { correctness: "warn" },
      rules: { "no-var": "error" }
    });

    writeLintRule(root, { system: "oxlint", rule: "no-var", severity: null });

    expect(read(root).rules).toEqual({ "no-var": "off" });
  });

  it("deja off una regla que no estaba escrita y no hay categorías", () => {
    const root = repo({ categories: { correctness: "off" }, rules: {} });

    writeLintRule(root, { system: "oxlint", rule: "no-eval", severity: null });

    expect(read(root).rules).toEqual({ "no-eval": "off" });
  });

  it("rechaza una config que no es JSON o un sistema que no se escribe", () => {
    const broken = repo();
    fs.writeFileSync(path.join(broken, ".oxlintrc.json"), "{ roto", "utf8");
    expect(() =>
      writeLintRule(broken, { system: "oxlint", rule: "no-var", severity: "error" })
    ).toThrow(LintError);

    const other = repo({ rules: {} });
    fs.writeFileSync(
      path.join(other, "eslint.config.js"),
      "export default [];",
      "utf8"
    );
    expect(() =>
      writeLintRule(other, { system: "ruff", rule: "no-var", severity: "error" })
    ).toThrow(/todavía no soporta/);
  });

  it("rechaza una regla con espacios o un sistema sin config", () => {
    const root = repo({ rules: {} });
    expect(() =>
      writeLintRule(root, { system: "oxlint", rule: "no eval", severity: "error" })
    ).toThrow(/regla inválida/);

    const empty = repo();
    expect(() =>
      writeLintRule(empty, { system: "oxlint", rule: "no-var", severity: "error" })
    ).toThrow(/no declara archivo/);
  });
});

function eslintRepo(config: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-eslint-write-"));
  roots.push(root);
  fs.writeFileSync(path.join(root, "eslint.config.js"), config, "utf8");
  return root;
}

describe("escribir una regla de ESLint", () => {
  it("inserta el bloque gestionado en la llamada de la config", () => {
    const root = eslintRepo(
      [
        'import tseslint from "typescript-eslint";',
        "",
        "export default tseslint.config(",
        "  { rules: { \"no-console\": \"error\" } }",
        ");",
        ""
      ].join("\n")
    );

    const result = writeLintRule(root, {
      system: "eslint",
      rule: "no-eval",
      severity: "error"
    });

    expect(result.after).toContain("// codarch:lint-rules:start");
    expect(result.after).toContain('"no-eval": "error"');
    expect(result.after).toContain('"no-console": "error"');
    expect(result.after).toMatch(/tseslint\.config\([\s\S]*codarch:lint-rules:start/);
  });

  it("actualiza el bloque en vez de duplicarlo", () => {
    const root = eslintRepo(
      [
        "export default [",
        "  { rules: { \"no-console\": \"error\" } }",
        "];",
        ""
      ].join("\n")
    );

    writeLintRule(root, { system: "eslint", rule: "no-eval", severity: "error" });
    writeLintRule(root, { system: "eslint", rule: "no-eval", severity: null });

    const config = fs.readFileSync(path.join(root, "eslint.config.js"), "utf8");
    expect(config.match(/codarch:lint-rules:start/g)).toHaveLength(1);
    expect(config).toContain('"no-eval": "off"');
  });

  it("se niega a tocar un export que es un objeto", () => {
    const root = eslintRepo("export default { rules: {} };\n");
    expect(() =>
      writeLintRule(root, { system: "eslint", rule: "no-var", severity: "error" })
    ).toThrow(/exporta un objeto/);
  });

  it("quita una regla explícita y la cubre con el bloque", () => {
    const root = eslintRepo(
      [
        "export default [",
        "  { rules: { \"no-explicit-any\": \"warn\", \"no-var\": \"error\" } }",
        "];",
        ""
      ].join("\n")
    );

    writeLintRule(root, {
      system: "eslint",
      rule: "no-explicit-any",
      severity: null
    });

    const config = fs.readFileSync(path.join(root, "eslint.config.js"), "utf8");
    expect(config).not.toContain('"no-explicit-any": "warn"');
    expect(config).toContain('"no-var": "error"');
    expect(config).toContain('"no-explicit-any": "off"');
  });
});

function biomeRepo(config: unknown): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-biome-write-"));
  roots.push(root);
  fs.writeFileSync(
    path.join(root, "biome.json"),
    JSON.stringify(config, null, 2),
    "utf8"
  );
  return root;
}

function readBiome(root: string): {
  linter?: { enabled?: boolean; rules?: Record<string, unknown> };
} {
  return JSON.parse(
    fs.readFileSync(path.join(root, "biome.json"), "utf8")
  ) as { linter?: { enabled?: boolean; rules?: Record<string, unknown> } };
}

describe("escribir una regla de Biome", () => {
  it("activa una regla en su grupo", () => {
    const root = biomeRepo({
      linter: { enabled: false, rules: { recommended: false } }
    });

    writeLintRule(root, {
      system: "biome",
      rule: "suspicious/noDoubleEquals",
      severity: "error"
    });

    const config = readBiome(root);
    expect(config.linter?.enabled).toBe(true);
    expect(config.linter?.rules).toEqual({
      recommended: false,
      suspicious: { noDoubleEquals: "error" }
    });
  });

  it("desactiva con off mientras las recomendadas sigan encendidas", () => {
    const root = biomeRepo({
      linter: {
        rules: {
          recommended: true,
          suspicious: { noDoubleEquals: "error", noDebugger: "warn" }
        }
      }
    });

    writeLintRule(root, {
      system: "biome",
      rule: "suspicious/noDoubleEquals",
      severity: null
    });

    expect(readBiome(root).linter?.rules).toEqual({
      recommended: true,
      suspicious: { noDoubleEquals: "off", noDebugger: "warn" }
    });
  });

  it("quita la entrada si no hay recomendadas", () => {
    const root = biomeRepo({
      linter: {
        rules: {
          recommended: false,
          suspicious: { noDoubleEquals: "error" }
        }
      }
    });

    writeLintRule(root, {
      system: "biome",
      rule: "suspicious/noDoubleEquals",
      severity: null
    });

    expect(readBiome(root).linter?.rules).toEqual({ recommended: false });
  });

  it("se niega a reescribir un jsonc", () => {
    const root = biomeRepo({ linter: { rules: {} } });
    fs.renameSync(
      path.join(root, "biome.json"),
      path.join(root, "biome.jsonc")
    );

    expect(() =>
      writeLintRule(root, {
        system: "biome",
        rule: "suspicious/noDoubleEquals",
        severity: "error"
      })
    ).toThrow(/jsonc/);
  });
});
