import { describe, expect, it } from "vitest";
import type { LintArtifact } from "@codarch/lint/browser";
import { lintTotals, withinFolder } from "../src/lintRollup";

/** Un artefacto con los ficheros y sus hallazgos. */
function artifact(
  files: Record<string, { errors: number; warnings: number }>
): LintArtifact {
  const parsed: LintArtifact["files"] = {};
  let errors = 0;
  let warnings = 0;
  for (const [path, entry] of Object.entries(files)) {
    parsed[path] = { ...entry, messages: [] };
    errors += entry.errors;
    warnings += entry.warnings;
  }
  return {
    schemaVersion: "1.0",
    meta: { checksum: "abc", tools: ["eslint"] },
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
      files: 3,
      score: 4.25
    });
  });

  it("suma solo lo que cuelga de la carpeta", () => {
    expect(lintTotals(lint, "packages/ui")).toEqual({
      errors: 0,
      warnings: 4,
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
      files: 0,
      score: 0
    });
  });
});
