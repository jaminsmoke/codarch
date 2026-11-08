import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createLintArtifact } from "@codarch/lint";
import { afterEach, describe, expect, it } from "vitest";
import {
  ArchitectureStore,
  McpDataError,
  loadArchitectureStore
} from "../src/store";
import { explainModule, getLintReport } from "../src/tools";
import { SNAPSHOT } from "./fixtures";

describe("el lint del proyecto", () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  const ARTIFACT = createLintArtifact({
    tools: ["eslint", "ruff"],
    systems: [
      {
        name: "eslint",
        config: "eslint.config.js",
        rules: [
          { id: "no-console", severity: "warn" },
          { id: "no-var", severity: "error" }
        ]
      },
      {
        name: "ruff",
        config: "ruff.toml",
        rules: [{ id: "E101", severity: "error" }],
        note: "corre el `ruff` del PATH"
      }
    ],
    files: [
      {
        path: "src/a.ts",
        messages: [
          { rule: "no-console", severity: "warn", line: 3, message: "no console" },
          { rule: "no-var", severity: "error", line: 9, column: 5, message: "usa let" }
        ]
      },
      {
        path: "src/domain/c.ts",
        messages: [
          { rule: "no-console", severity: "warn", line: 1, message: "no console" }
        ]
      }
    ]
  });

  /** Un repo temporal con su snapshot y, si toca, su artefacto de lint. */
  function lintStore(artifact: unknown = ARTIFACT, name = "lint.repmod.json"): ArchitectureStore {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-mcp-lint-"));
    roots.push(root);
    const directory = path.join(root, ".codarch");
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(
      path.join(directory, "snapshot.cc.json"),
      JSON.stringify(SNAPSHOT),
      "utf8"
    );
    if (artifact !== null) {
      fs.writeFileSync(
        path.join(directory, name),
        JSON.stringify(artifact),
        "utf8"
      );
    }
    return loadArchitectureStore({ root });
  }

  it("ve los hallazgos en la ruta canónica", () => {
    const nfd = "src/Cafe\u0301.ts";
    const nfc = "src/Caf\u00e9.ts";
    const store = lintStore({
      schemaVersion: "1.2",
      meta: { checksum: "abc", tools: ["eslint"], systems: [] },
      files: {
        "./src/a.ts": {
          errors: 9,
          warnings: 9,
          messages: [
            { rule: "no-console", severity: "warn", line: 3, message: "no console" }
          ]
        },
        [nfd]: {
          errors: 0,
          warnings: 0,
          messages: [{ rule: "no-var", severity: "info", message: "cafe" }]
        },
        "src/A.ts": {
          errors: 1,
          warnings: 0,
          messages: [{ rule: "no-var", severity: "error", message: "mayuscula" }]
        }
      },
      summary: { files: 9, errors: 9, warnings: 9, messages: 9 }
    });

    const report = getLintReport(store);
    expect(report.findings.map((finding) => finding.path).sort()).toEqual(
      [nfc, "src/A.ts", "src/a.ts"].sort()
    );
    expect(
      report.findings.every(
        (finding) =>
          finding.path === finding.path.normalize("NFC") &&
          !finding.path.includes("\\") &&
          !finding.path.startsWith("./")
      )
    ).toBe(true);
    // `./src/a.ts` es `src/a.ts`. `src/A.ts` es otro fichero.
    expect(explainModule(store, { path: "src/a.ts" }).lint).toMatchObject({
      errors: 0,
      warnings: 1,
      findings: 1,
      files: 1
    });
  });

  it("explain_module trae lint del ámbito; null si no se midió", () => {
    const withLint = lintStore();
    const file = explainModule(withLint, { path: "src/a.ts" });
    const folder = explainModule(withLint, { path: "src" });
    const domain = explainModule(withLint, { path: "src/domain" });
    expect(file.lint).toEqual({
      errors: 1,
      warnings: 1,
      info: 0,
      findings: 2,
      files: 1
    });
    expect(folder.lint).toEqual({
      errors: 1,
      warnings: 2,
      info: 0,
      findings: 3,
      files: 2
    });
    expect(domain.lint).toEqual({
      errors: 0,
      warnings: 1,
      info: 0,
      findings: 1,
      files: 1
    });

    const without = lintStore(null);
    expect(explainModule(without, { path: "src/a.ts" }).lint).toBeNull();
    expect(explainModule(without, { path: "src/a.ts" }).scopeHealth).toBeNull();
    expect(explainModule(without, { path: "src" }).lint).toBeNull();
    expect(file.scopeHealth?.counts).toMatchObject({
      errors: 1,
      warnings: 1,
      findings: 2,
      filesWithFindings: 1
    });
    expect(file.scopeHealth?.messages).toHaveLength(2);
  });

  it("lee los sistemas, sus reglas activas y los hallazgos", () => {
    const report = getLintReport(lintStore());

    expect(report.available).toBe(true);
    expect(report.file).toBe(".codarch/lint.repmod.json");
    expect(report.tools).toEqual(["eslint", "ruff"]);
    expect(report.systems).toEqual([
      {
        name: "eslint",
        config: "eslint.config.js",
        rules: [
          { id: "no-console", severity: "warn" },
          { id: "no-var", severity: "error" }
        ]
      },
      {
        name: "ruff",
        config: "ruff.toml",
        rules: [{ id: "E101", severity: "error" }],
        note: "corre el `ruff` del PATH"
      }
    ]);
    expect(report.summary).toEqual({
      files: 2,
      errors: 1,
      warnings: 2,
      messages: 3
    });
    expect(report.config?.tools).toEqual(["eslint", "ruff"]);
    expect(report.health?.counts).toMatchObject({
      errors: 1,
      warnings: 2,
      findings: 3,
      filesWithFindings: 2
    });
    expect(report.affectedFiles.map((file) => file.path)).toEqual([
      "src/a.ts",
      "src/domain/c.ts"
    ]);
    expect(report.scope).toBe("");
    expect(report.total).toBe(3);
    expect(report.files).toBe(2);
    // La misma cuenta que la UI y el CLI: gana la regla con más errores.
    expect(report.rules).toEqual([
      { rule: "no-var", errors: 1, warnings: 0, findings: 1 },
      { rule: "no-console", errors: 0, warnings: 2, findings: 2 }
    ]);
    // Los errores primero; dentro de cada severidad, por ruta y línea.
    expect(report.findings.map((finding) => [finding.path, finding.rule])).toEqual([
      ["src/a.ts", "no-var"],
      ["src/a.ts", "no-console"],
      ["src/domain/c.ts", "no-console"]
    ]);
    expect(report.findings[0]).toMatchObject({ line: 9, column: 5 });
  });

  it("acota por carpeta, por regla y por severidad", () => {
    const store = lintStore();

    const folder = getLintReport(store, { path: "src/domain" });
    expect(folder.scope).toBe("src/domain");
    expect(folder.total).toBe(1);
    expect(folder.findings[0]?.path).toBe("src/domain/c.ts");

    const file = getLintReport(store, { path: "src/a.ts", severity: "warn" });
    expect(file.total).toBe(1);
    expect(file.findings[0]?.rule).toBe("no-console");

    const rule = getLintReport(store, { rule: "no-var", limit: 1 });
    expect(rule.total).toBe(1);
    expect(rule.rules).toEqual([
      { rule: "no-var", errors: 1, warnings: 0, findings: 1 }
    ]);

    expect(() => getLintReport(store, { path: "src/nope.ts" })).toThrow(McpDataError);
  });

  it("el resumen sale de los mensajes, no de las cuentas declaradas", () => {
    // Un artefacto de fuera con el resumen desincronizado: el MCP no lo copia.
    const broken = structuredClone(ARTIFACT) as typeof ARTIFACT;
    broken.summary = {
      files: 9,
      errors: 99,
      warnings: 0,
      messages: 99,
      measured: 99
    };
    broken.coverage = {
      tools: {
        eslint: {
          outcome: "enumerated",
          measuredPaths: ["src/a.ts", "src/domain/c.ts"],
          eligiblePaths: null
        },
        ruff: {
          outcome: "unknown",
          eligiblePaths: null,
          reasons: [{ code: "unknown-eligibility" }]
        }
      }
    };

    const report = getLintReport(lintStore(broken));
    expect(report.summary).toEqual({
      files: 2,
      errors: 1,
      warnings: 2,
      messages: 3,
      // Sale de la enumeración de ESLint, no del 99 declarado.
      measured: 2
    });
    expect(report.health?.coverage.state).toBe("partial");
  });

  it("recorta los hallazgos sin perder el total", () => {
    const report = getLintReport(lintStore(), { limit: 1 });

    expect(report.findings).toHaveLength(1);
    expect(report.total).toBe(3);
  });

  it("sin artefacto dice que no se midió, y el nombre anterior no cuenta", () => {
    expect(getLintReport(lintStore(ARTIFACT, "lint.json")).available).toBe(
      false
    );

    const missing = getLintReport(lintStore(null));
    expect(missing.available).toBe(false);
    expect(missing.file).toBeNull();
    expect(missing.total).toBe(0);
    expect(missing.reason).toContain("codarch analyze");
  });

  it("sin árbol el lint no mueve el riesgo y no rellena con cero", () => {
    const withLint = lintStore();
    const without = lintStore(null);
    // El artefacto de la prueba no trae meta.tree. fresh es null: la deuda no
    // entra, y un fichero ausente del mapa de hallazgos no pasa a valer 0.
    expect(withLint.files.map((file) => file.risk)).toEqual(
      without.files.map((file) => file.risk)
    );
  });

});
