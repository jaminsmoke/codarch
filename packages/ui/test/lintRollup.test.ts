import { describe, expect, it } from "vitest";
import type { LintArtifact, LintMessage } from "@codarch/lint/browser";
import { lintBarMark, lintTotals, withinFolder } from "../src/lintRollup";

/** Un mensaje de relleno con la severidad pedida. */
function messages(errors: number, warnings: number): LintMessage[] {
  return [
    ...Array.from({ length: errors }, () => ({
      rule: "no-console",
      severity: "error" as const,
      message: "Unexpected console"
    })),
    ...Array.from({ length: warnings }, () => ({
      rule: "no-var",
      severity: "warn" as const,
      message: "Unexpected var"
    }))
  ];
}

/** Un artefacto con los ficheros y sus hallazgos. */
function artifact(
  files: Record<string, { errors: number; warnings: number }>
): LintArtifact {
  const parsed: LintArtifact["files"] = {};
  let errors = 0;
  let warnings = 0;
  for (const [path, entry] of Object.entries(files)) {
    const fileMessages = messages(entry.errors, entry.warnings);
    parsed[path] = { ...entry, messages: fileMessages };
    errors += entry.errors;
    warnings += entry.warnings;
  }
  return {
    schemaVersion: "1.2",
    meta: {
      checksum: "abc",
      tools: ["eslint"],
      systems: [{ name: "eslint", config: "eslint.config.js" }]
    },
    files: parsed,
    summary: {
      files: Object.keys(files).length,
      errors,
      warnings,
      messages: errors + warnings
    }
  };
}

const lint = artifact({
  "apps/web/src/main.ts": { errors: 2, warnings: 1 },
  "packages/ui/src/panel.ts": { errors: 0, warnings: 4 },
  "packages/ui2/src/other.ts": { errors: 1, warnings: 0 },
  "packages/clean/src/ok.ts": { errors: 0, warnings: 0 }
});

describe("la deuda de lint de una carpeta", () => {
  it("suma el proyecto entero con la raíz vacía", () => {
    expect(lintTotals(lint)).toEqual({
      errors: 3,
      warnings: 5,
      info: 0,
      findings: 8,
      files: 3,
      score: 4.25
    });
  });

  it("suma solo lo que cuelga de la carpeta", () => {
    expect(lintTotals(lint, "packages/ui")).toEqual({
      errors: 0,
      warnings: 4,
      info: 0,
      findings: 4,
      files: 1,
      score: 1
    });
  });

  it("la barra cuenta: packages/ui no contiene packages/ui2", () => {
    expect(withinFolder("packages/ui", "packages/ui/src/panel.ts")).toBe(true);
    expect(withinFolder("packages/ui", "packages/ui2/src/other.ts")).toBe(false);
  });

  it("sin artefacto no hay ceros: es «sin medir»", () => {
    expect(lintTotals(null)).toBeNull();
  });

  it("un artefacto limpio suma cero, no «sin medir»", () => {
    expect(lintTotals(lint, "packages/clean")).toEqual({
      errors: 0,
      warnings: 0,
      info: 0,
      findings: 0,
      files: 0,
      score: 0
    });
  });
});


describe("lintBarMark", () => {
  it("sin medir o limpio no marca; la peor severidad pone la etiqueta", () => {
    expect(lintBarMark(null)).toBeNull();
    expect(lintBarMark(lintTotals(artifact({}), ""))).toBeNull();
    const dirty = lintTotals(
      artifact({ "a.ts": { errors: 2, warnings: 1 } }),
      "a.ts"
    );
    expect(lintBarMark(dirty, "reglas")).toEqual({
      severity: "error",
      label: "2 errores de reglas"
    });
    expect(lintBarMark(dirty)).toEqual({
      severity: "error",
      label: "2 errores de lint"
    });
    const warns = lintTotals(
      artifact({ "b.ts": { errors: 0, warnings: 1 } }),
      "b.ts"
    );
    expect(lintBarMark(warns)).toEqual({
      severity: "warn",
      label: "1 aviso de lint"
    });
  });
});
