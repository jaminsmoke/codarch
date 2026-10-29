import { describe, expect, it } from "vitest";
import { runLint, type LintProcessRunner, type LintTool } from "../src/index";

const root = "/repo";

const eslint: LintTool = {
  name: "eslint",
  command: "npx eslint . --format json",
  format: "eslint-json"
};

const oxlint: LintTool = {
  name: "oxlint",
  command: "npx oxlint --format json .",
  format: "oxlint-json"
};

/** Un runner que devuelve lo que se le diga, por comando. */
function runner(
  answers: Record<string, { stdout?: string; stderr?: string; code?: number } | Error>
): LintProcessRunner {
  return async (command) => {
    const answer = answers[command];
    if (!answer) return { stdout: "", stderr: "", code: 0 };
    if (answer instanceof Error) throw answer;
    return {
      stdout: answer.stdout ?? "",
      stderr: answer.stderr ?? "",
      code: answer.code ?? 0
    };
  };
}

const eslintJson = JSON.stringify([
  {
    filePath: "/repo/src/a.ts",
    messages: [
      { ruleId: "no-var", severity: 2, message: "Unexpected var", line: 1, column: 1 },
      { ruleId: "no-debugger", severity: 1, message: "Unexpected debugger", line: 2, column: 1 }
    ]
  }
]);

describe("runLint", () => {
  it("lanza todas las herramientas y funde lo que midieron", async () => {
    const result = await runLint({
      root,
      tools: [eslint, oxlint],
      run: runner({
        [eslint.command]: { stdout: eslintJson, code: 1 },
        [oxlint.command]: {
          stdout: JSON.stringify({
            diagnostics: [
              {
                message: "Unexpected any",
                code: "typescript(no-explicit-any)",
                severity: "error",
                filename: "src/b.ts"
              }
            ]
          })
        }
      })
    });

    expect(result.runs.map((run) => [run.name, run.ok, run.code])).toEqual([
      ["eslint", true, 1],
      ["oxlint", true, 0]
    ]);
    expect(result.artifact?.meta.tools).toEqual(["eslint", "oxlint"]);
    expect(Object.keys(result.artifact?.files ?? {})).toEqual([
      "src/a.ts",
      "src/b.ts"
    ]);
    expect(result.artifact?.summary).toEqual({
      files: 2,
      errors: 2,
      warnings: 1,
      messages: 3
    });
  });

  it("una herramienta que revienta no impide medir las demás", async () => {
    const result = await runLint({
      root,
      tools: [eslint, oxlint],
      run: runner({
        [eslint.command]: { stdout: eslintJson },
        [oxlint.command]: new Error("no se encontró oxlint")
      })
    });

    expect(result.runs[1]).toEqual({
      name: "oxlint",
      ok: false,
      files: 0,
      messages: 0,
      error: "no se encontró oxlint"
    });
    expect(result.artifact?.meta.tools).toEqual(["eslint"]);
  });

  it("un JSON ilegible no entra en el artefacto, pero el código de salida se cuenta", async () => {
    const result = await runLint({
      root,
      tools: [eslint],
      run: runner({
        [eslint.command]: {
          stdout: "Segmentation fault",
          stderr: "eslint: boom",
          code: 2
        }
      })
    });

    expect(result.artifact).toBeNull();
    expect(result.runs[0]).toEqual({
      name: "eslint",
      ok: false,
      code: 2,
      files: 0,
      messages: 0,
      error: "la salida no es JSON (eslint: boom)"
    });
  });

  it("sin ninguna herramienta que mida no hay artefacto: sin medir no es limpio", async () => {
    const result = await runLint({
      root,
      tools: [eslint],
      run: runner({ [eslint.command]: { stdout: "  \n" } })
    });

    expect(result.artifact).toBeNull();
    expect(result.runs[0]?.error).toMatch(/no escribió JSON/);
  });

  it("los avisos de npx alrededor del JSON no lo estropean", async () => {
    const result = await runLint({
      root,
      tools: [eslint],
      run: runner({
        [eslint.command]: {
          stdout: `npm warn ignoring the setting\n${eslintJson}\nnpm notice done`,
          code: 1
        }
      })
    });

    expect(result.runs[0]?.ok).toBe(true);
    expect(result.artifact?.summary.messages).toBe(2);
  });

  it("la misma salida da el mismo artefacto", async () => {
    const once = await runLint({
      root,
      tools: [eslint],
      run: runner({ [eslint.command]: { stdout: eslintJson } })
    });
    const twice = await runLint({
      root,
      tools: [eslint],
      run: runner({ [eslint.command]: { stdout: eslintJson } })
    });

    expect(once.artifact).toEqual(twice.artifact);
    expect(once.artifact?.meta.checksum).toBe(twice.artifact?.meta.checksum);
  });
});
