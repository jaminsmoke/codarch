import { describe, expect, it } from "vitest";
import type { LintArtifact } from "@codarch/lint";
import { lintLivePayload } from "../src/commands/serve-live";

function artifact(
  over: Partial<LintArtifact> & Pick<LintArtifact, "files" | "summary">
): LintArtifact {
  return {
    schemaVersion: "1.2",
    meta: { checksum: "abc", tools: ["eslint"], systems: [] },
    ...over
  };
}

describe("el aviso de lint del live", () => {
  it("agrega los mensajes y no el summary declarado", () => {
    const payload = lintLivePayload(
      artifact({
        files: {
          "src/a.ts": {
            errors: 9,
            warnings: 9,
            messages: [
              { rule: "no-var", severity: "warn", message: "var" },
              { rule: "no-console", severity: "info", message: "console" }
            ]
          }
        },
        summary: { files: 9, errors: 9, warnings: 9, messages: 9, measured: 40 }
      })
    );

    expect(payload).toEqual({
      files: 1,
      errors: 0,
      warnings: 1,
      messages: 2
    });
  });
});
