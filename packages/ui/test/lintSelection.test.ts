/**
 * La selección de la ficha es solo el lint de código.
 * La cobertura por origen del helper se prueba en packages/lint.
 */
import { describe, expect, it } from "vitest";
import { scopeHealth, type LintArtifact } from "@codarch/lint/browser";

describe("scopeHealth de un solo artefacto de código", () => {
  it("no lee mensajes que no están en ese artefacto", () => {
    const code: LintArtifact = {
      schemaVersion: "1.3",
      domain: "code",
      meta: { checksum: "c", tools: ["eslint"], systems: [] },
      files: {},
      summary: { files: 0, errors: 0, warnings: 0, messages: 0 }
    };
    expect(scopeHealth(code, { kind: "project", path: "" }).counts.findings).toBe(0);
  });
});
