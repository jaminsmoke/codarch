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
      messages: 3,
      // Solo ESLint enumera. oxlint guarda el hallazgo y no aporta medidos.
      measured: 1
    });
    expect(result.artifact?.coverage?.tools.eslint).toMatchObject({
      outcome: "enumerated",
      eligiblePaths: null
    });
    expect(result.artifact?.coverage?.tools.oxlint?.outcome).toBe("unknown");
  });

  it("ESLint guarda el fichero limpio en la cobertura y no en files", async () => {
    const result = await runLint({
      root,
      tools: [eslint],
      run: runner({
        [eslint.command]: {
          stdout: JSON.stringify([
            { filePath: "/repo/src/a.ts", messages: [] },
            {
              filePath: "/repo/src/b.ts",
              messages: [
                { ruleId: "no-var", severity: 2, message: "Unexpected var", line: 1, column: 1 }
              ]
            }
          ]),
          code: 1
        }
      })
    });

    expect(Object.keys(result.artifact?.files ?? {})).toEqual(["src/b.ts"]);
    expect(result.artifact?.summary.measured).toBe(2);
    expect(result.artifact?.coverage?.tools.eslint).toEqual({
      outcome: "enumerated",
      measuredPaths: ["src/a.ts", "src/b.ts"],
      eligiblePaths: null
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
    expect(result.artifact?.coverage?.tools.oxlint).toMatchObject({
      outcome: "missing"
    });
    expect(result.artifact?.coverage?.tools.eslint?.outcome).toBe("enumerated");
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
    expect(result.runs[0]?.error).toMatch(/no escribió nada/);
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

  it("lee también el JSON de Biome y el de Ruff", async () => {
    const biome: LintTool = {
      name: "biome",
      command: "biome lint",
      format: "biome-json"
    };
    const ruff: LintTool = {
      name: "ruff",
      command: "ruff check",
      format: "ruff-json"
    };

    const result = await runLint({
      root,
      tools: [biome, ruff],
      run: runner({
        [biome.command]: {
          stdout: JSON.stringify({
            diagnostics: [
              {
                category: "lint/suspicious/noDoubleEquals",
                severity: "error",
                description: "Use === instead of ==.",
                location: { path: { file: "src/a.ts" } }
              }
            ]
          }),
          code: 1
        },
        [ruff.command]: {
          stdout: JSON.stringify([
            {
              code: "F401",
              filename: "lib/b.py",
              message: "`os` imported but unused",
              location: { row: 1, column: 8 }
            }
          ]),
          code: 1
        }
      })
    });

    expect(result.artifact?.meta.tools).toEqual(["biome", "ruff"]);
    expect(Object.keys(result.artifact?.files ?? {})).toEqual([
      "lib/b.py",
      "src/a.ts"
    ]);
    expect(result.artifact?.summary).toEqual({
      files: 2,
      errors: 2,
      warnings: 0,
      messages: 2
    });
    expect(result.artifact?.summary.measured).toBeUndefined();
    expect(result.artifact?.coverage?.tools.biome?.outcome).toBe("unknown");
    expect(result.artifact?.coverage?.tools.ruff?.outcome).toBe("unknown");
  });

  it("lee el XML de Checkstyle", async () => {
    const checkstyle: LintTool = {
      name: "checkstyle",
      command: "checkstyle -c checkstyle.xml -f xml .",
      format: "checkstyle-xml"
    };

    const result = await runLint({
      root,
      tools: [checkstyle],
      run: runner({
        [checkstyle.command]: {
          stdout: `<?xml version="1.0" encoding="UTF-8"?>
<checkstyle version="10.12">
  <file name="/repo/src/A.java">
    <error line="2" column="1" severity="error" message="Mal formato." source="com.puppycrawl.tools.checkstyle.checks.sizes.LineLengthCheck"/>
  </file>
</checkstyle>`,
          code: 1
        }
      })
    });

    expect(result.artifact?.files["src/A.java"]?.messages).toEqual([
      { rule: "LineLength", severity: "error", line: 2, column: 1, message: "Mal formato." }
    ]);
    expect(result.artifact?.coverage?.tools.checkstyle).toMatchObject({
      outcome: "enumerated",
      measuredPaths: ["src/A.java"],
      eligiblePaths: null
    });
    expect(result.artifact?.summary).toEqual({
      files: 1,
      errors: 1,
      warnings: 0,
      messages: 1,
      measured: 1
    });
  });

  it("lee el texto de go vet y el de dotnet", async () => {
    const goVet: LintTool = {
      name: "go-vet",
      command: "go vet ./... 2>&1",
      format: "govet-text"
    };
    const dotnet: LintTool = {
      name: "dotnet",
      command: "dotnet format Demo.csproj analyzers",
      format: "dotnet-text"
    };

    const result = await runLint({
      root,
      tools: [goVet, dotnet],
      run: runner({
        [goVet.command]: {
          stdout: "pkg/a.go:3:1: algo\n",
          code: 1
        },
        [dotnet.command]: {
          stdout:
            "/repo/src/A.cs(2,4): warning CA1822: marcarlo [Demo.csproj]\n",
          code: 2
        }
      })
    });

    expect(result.artifact?.files["pkg/a.go"]?.messages[0]).toEqual({
      rule: "go vet",
      severity: "error",
      line: 3,
      column: 1,
      message: "algo"
    });
    expect(result.artifact?.files["src/A.cs"]?.messages[0]).toEqual({
      rule: "CA1822",
      severity: "warn",
      line: 2,
      column: 4,
      message: "marcarlo"
    });
  });

  it("firma el árbol medido y cuenta los ficheros limpios como medidos", async () => {
    const result = await runLint({
      root,
      tools: [eslint],
      tree: "0c74d0ac80a995135ecff96096be41a5",
      run: runner({
        [eslint.command]: {
          stdout: JSON.stringify([
            {
              filePath: "/repo/src/a.ts",
              messages: [
                { ruleId: "no-var", severity: 2, message: "Unexpected var", line: 1 }
              ]
            },
            // Un fichero que ESLint miró y no encontró nada: no entra en
            // `files`, pero sí en la cobertura (ADR 0098).
            { filePath: "/repo/src/b.ts", messages: [] }
          ])
        }
      })
    });

    expect(result.artifact?.meta.tree).toBe(
      "0c74d0ac80a995135ecff96096be41a5"
    );
    expect(result.artifact?.summary).toMatchObject({ files: 1, measured: 2 });
  });

  it("sin árbol, el artefacto no lo inventa", async () => {
    const result = await runLint({
      root,
      tools: [eslint],
      run: runner({ [eslint.command]: { stdout: eslintJson } })
    });

    expect(result.artifact?.meta.tree).toBeUndefined();
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
