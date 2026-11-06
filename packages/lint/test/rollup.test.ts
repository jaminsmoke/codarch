import { describe, expect, it } from "vitest";
import type { LintArtifact, LintMessage } from "../src/format";
import {
  lintRuleCounts,
  lintRules,
  lintTotals,
  withinLintFolder,
  worstLintSeverity
} from "../src/rollup";

function artifact(
  files: Record<string, LintMessage[]>
): LintArtifact {
  const parsed: LintArtifact["files"] = {};
  let errors = 0;
  let warnings = 0;
  let messages = 0;
  for (const [path, list] of Object.entries(files)) {
    const entryErrors = list.filter((item) => item.severity === "error").length;
    const entryWarnings = list.filter((item) => item.severity === "warn").length;
    parsed[path] = { errors: entryErrors, warnings: entryWarnings, messages: list };
    errors += entryErrors;
    warnings += entryWarnings;
    messages += list.length;
  }
  return {
    schemaVersion: "1.2",
    meta: { checksum: "abc", tools: ["eslint"], systems: [] },
    files: parsed,
    summary: { files: Object.keys(files).length, errors, warnings, messages }
  };
}

const lint = artifact({
  "src/a.ts": [
    { rule: "no-var", severity: "error", message: "var" },
    { rule: "no-console", severity: "warn", message: "console" }
  ],
  "src/domain/b.ts": [
    { rule: "security/detect-eval", severity: "info", message: "eval" }
  ],
  "src/infra/c.ts": [
    { rule: "no-var", severity: "error", message: "var" }
  ]
});

describe("el contador de lint compartido", () => {
  it("suma errores, avisos e info, y los hallazgos son la suma de los tres", () => {
    expect(lintTotals(lint)).toEqual({
      errors: 2,
      warnings: 1,
      info: 1,
      findings: 4,
      files: 3
    });
  });

  it("cuenta los mensajes, no las cuentas que declara el fichero", () => {
    const drifted: LintArtifact = {
      ...lint,
      files: {
        "src/a.ts": {
          errors: 9,
          warnings: 9,
          messages: [{ rule: "no-var", severity: "warn", message: "var" }]
        }
      },
      summary: { files: 1, errors: 9, warnings: 9, messages: 1 }
    };

    // Si el artefacto trae cifras que no cuadran con sus mensajes, manda el
    // mensaje: Métricas y Reglas no pueden leer números distintos.
    expect(lintTotals(drifted)).toEqual({
      errors: 0,
      warnings: 1,
      info: 0,
      findings: 1,
      files: 1
    });
  });

  it("acota por carpeta y cuenta la barra", () => {
    expect(withinLintFolder("src", "src/a.ts")).toBe(true);
    expect(withinLintFolder("src", "src2/a.ts")).toBe(false);
    const composed = "caf\u00e9";
    const decomposed = "cafe\u0301";
    expect(withinLintFolder(decomposed, `${composed}/a.ts`)).toBe(true);
    expect(withinLintFolder(composed, `${decomposed}2/a.ts`)).toBe(false);
    expect(lintTotals(lint, "src/domain")).toEqual({
      errors: 0,
      warnings: 0,
      info: 1,
      findings: 1,
      files: 1
    });
  });

  it("sin artefacto es «sin medir», no cero", () => {
    expect(lintTotals(null)).toBeNull();
    expect(lintRules(null)).toEqual([]);
  });

  it("cuenta cada regla y ordena por errores, avisos y hallazgos", () => {
    expect(lintRules(lint)).toEqual([
      { rule: "no-var", errors: 2, warnings: 0, findings: 2 },
      { rule: "no-console", errors: 0, warnings: 1, findings: 1 },
      { rule: "security/detect-eval", errors: 0, warnings: 0, findings: 1 }
    ]);
  });

  it("en un fichero, solo su regla; un info no es error ni aviso", () => {
    expect(lintRules(lint, "src/domain/b.ts")).toEqual([
      { rule: "security/detect-eval", errors: 0, warnings: 0, findings: 1 }
    ]);
    expect(
      lintRuleCounts([{ rule: "a11y", severity: "info" }])
    ).toEqual([{ rule: "a11y", errors: 0, warnings: 0, findings: 1 }]);
  });

  it("no depende del orden de entrada", () => {
    expect(
      lintRuleCounts([
        { rule: "b", severity: "warn" },
        { rule: "a", severity: "warn" }
      ])
    ).toEqual([
      { rule: "a", errors: 0, warnings: 1, findings: 1 },
      { rule: "b", errors: 0, warnings: 1, findings: 1 }
    ]);
  });

  it("la peor severidad: error, aviso, info; limpio es null", () => {
    expect(worstLintSeverity({ errors: 1, warnings: 9, info: 9 })).toBe("error");
    expect(worstLintSeverity({ errors: 0, warnings: 1, info: 9 })).toBe("warn");
    expect(worstLintSeverity({ errors: 0, warnings: 0, info: 1 })).toBe("info");
    expect(worstLintSeverity({ errors: 0, warnings: 0, info: 0 })).toBeNull();
  });

});
