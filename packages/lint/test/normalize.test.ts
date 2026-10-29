import { describe, expect, it } from "vitest";
import {
  LintError,
  createLintArtifact,
  normalizeEslintJson,
  normalizeOxlintJson
} from "../src/index";

const root = "/repo";

describe("el normalizador de ESLint", () => {
  it("traduce ficheros, severidades y reglas a rutas relativas", () => {
    const files = normalizeEslintJson(
      [
        {
          filePath: "/repo/src/a.ts",
          messages: [
            {
              ruleId: "no-var",
              severity: 2,
              message: "Unexpected var",
              line: 1,
              column: 1
            },
            {
              ruleId: "@typescript-eslint/no-unused-vars",
              severity: 1,
              message: "'x' is unused",
              line: 2,
              column: 5
            }
          ]
        },
        {
          filePath: "/repo/src/b.ts",
          messages: [
            { ruleId: null, severity: 2, message: "Parsing error", line: 3 }
          ]
        }
      ],
      { root }
    );

    expect(files.map((file) => file.path)).toEqual(["src/a.ts", "src/b.ts"]);
    expect(files[0]?.messages).toEqual([
      {
        rule: "no-var",
        severity: "error",
        line: 1,
        column: 1,
        message: "Unexpected var"
      },
      {
        rule: "@typescript-eslint/no-unused-vars",
        severity: "warn",
        line: 2,
        column: 5,
        message: "'x' is unused"
      }
    ]);
    expect(files[1]?.messages[0]?.rule).toBe("(parser)");
  });

  it("descarta lo que cae fuera del repo o no lleva ruta", () => {
    const files = normalizeEslintJson(
      [
        { filePath: "/outside/a.ts", messages: [{ message: "x", severity: 2 }] },
        { filePath: "", messages: [{ message: "x", severity: 2 }] },
        { messages: [{ message: "x", severity: 2 }] }
      ],
      { root }
    );

    expect(files).toEqual([]);
  });

  it("sin raíz, una ruta absoluta no entra en el artefacto", () => {
    const files = normalizeEslintJson([
      {
        filePath: "/repo/src/a.ts",
        messages: [{ ruleId: "no-var", severity: 2, message: "x", line: 1 }]
      }
    ]);

    expect(files).toEqual([]);
  });

  it("rechaza un JSON que no es una lista de ficheros", () => {
    expect(() => normalizeEslintJson({ files: [] })).toThrow(LintError);
  });
});

describe("el normalizador de oxlint", () => {
  const diagnostics = {
    diagnostics: [
      {
        message: "`debugger` statement is not allowed",
        code: "eslint(no-debugger)",
        severity: "warning",
        filename: "src/a.ts",
        labels: [{ span: { line: 2, column: 1 } }]
      },
      {
        message: "Unexpected any",
        code: "typescript(no-explicit-any)",
        severity: "error",
        filename: "src/a.ts",
        labels: []
      }
    ]
  };

  it("agrupa por fichero y quita el envoltorio de la regla", () => {
    const files = normalizeOxlintJson(diagnostics, { root });

    expect(files).toHaveLength(1);
    expect(files[0]?.path).toBe("src/a.ts");
    expect(files[0]?.messages).toEqual([
      {
        rule: "no-debugger",
        severity: "warn",
        line: 2,
        column: 1,
        message: "`debugger` statement is not allowed"
      },
      {
        rule: "no-explicit-any",
        severity: "error",
        message: "Unexpected any"
      }
    ]);
  });

  it("acepta la lista suelta y una severidad de consejo cuenta como info", () => {
    const files = normalizeOxlintJson(
      [
        {
          message: "Aviso raro",
          code: "no-extra-semi",
          severity: "advice",
          filename: "src/a.ts"
        }
      ],
      { root }
    );

    expect(files[0]?.messages[0]?.severity).toBe("info");
  });

  it("rechaza un JSON sin diagnósticos", () => {
    expect(() => normalizeOxlintJson({ errors: [] })).toThrow(LintError);
  });
});

describe("de las herramientas al artefacto", () => {
  it("dos pasadas de la misma salida dan el mismo artefacto", () => {
    const raw = [
      {
        filePath: "/repo/src/a.ts",
        messages: [
          { ruleId: "no-var", severity: 2, message: "x", line: 4 },
          { ruleId: "no-var", severity: 2, message: "x", line: 1 }
        ]
      }
    ];

    const left = createLintArtifact({
      tools: ["eslint"],
      files: normalizeEslintJson(raw, { root })
    });
    const right = createLintArtifact({
      tools: ["eslint"],
      files: normalizeEslintJson(structuredClone(raw), { root })
    });

    expect(left).toEqual(right);
    expect(left.meta.checksum).toBe(right.meta.checksum);
  });
});
