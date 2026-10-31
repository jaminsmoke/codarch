import { describe, expect, it } from "vitest";
import {
  LintError,
  createLintArtifact,
  normalizeBiomeJson,
  normalizeCheckstyleXml,
  normalizeDotnetText,
  normalizeEslintJson,
  normalizeGoVetText,
  normalizeOxlintJson,
  normalizeRuffJson
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

describe("el normalizador de Biome", () => {
  const reporter = {
    summary: { errors: 1, warnings: 1 },
    diagnostics: [
      {
        category: "lint/suspicious/noDoubleEquals",
        severity: "error",
        description: "Use === instead of ==.",
        location: { path: { file: "/repo/src/a.ts" }, span: [40, 42] }
      },
      {
        category: "lint/style/useConst",
        severity: "warning",
        message: [
          {
            elements: [],
            content: "This let declares a variable that is only assigned once."
          }
        ],
        location: { path: { file: "src/a.ts" } }
      },
      {
        category: "lint/correctness/noUnusedImports",
        severity: "information",
        description: "fuera",
        location: { path: { file: "/outside/a.ts" } }
      }
    ]
  };

  it("quita el prefijo de producto y agrupa por fichero", () => {
    const files = normalizeBiomeJson(reporter, { root });

    expect(files).toHaveLength(1);
    expect(files[0]?.path).toBe("src/a.ts");
    expect(files[0]?.messages).toEqual([
      {
        rule: "suspicious/noDoubleEquals",
        severity: "error",
        message: "Use === instead of ==."
      },
      {
        rule: "style/useConst",
        severity: "warn",
        message: "This let declares a variable that is only assigned once."
      }
    ]);
  });

  it("no inventa línea ni columna: el span de Biome son bytes", () => {
    const [file] = normalizeBiomeJson(reporter, { root });

    expect(file?.messages[0]?.line).toBeUndefined();
    expect(file?.messages[0]?.column).toBeUndefined();
  });

  it("rechaza un JSON sin diagnósticos", () => {
    expect(() => normalizeBiomeJson({ errors: [] })).toThrow(LintError);
  });
});

describe("el normalizador de Ruff", () => {
  const findings = [
    {
      code: "F401",
      filename: "/repo/src/a.py",
      message: "`os` imported but unused",
      location: { row: 1, column: 8 },
      end_location: { row: 1, column: 10 }
    },
    {
      code: "E501",
      filename: "src/a.py",
      message: "Line too long (89 > 88)",
      location: { row: 4, column: 89 }
    },
    {
      code: "F821",
      filename: "lib/b.py",
      message: "Undefined name `x`",
      location: { row: 2, column: 1 }
    }
  ];

  it("agrupa por fichero, con su código y su sitio", () => {
    const files = normalizeRuffJson(findings, { root });

    expect(files.map((file) => file.path)).toEqual(["src/a.py", "lib/b.py"]);
    expect(files[0]?.messages).toEqual([
      {
        rule: "F401",
        severity: "error",
        line: 1,
        column: 8,
        message: "`os` imported but unused"
      },
      {
        rule: "E501",
        severity: "error",
        line: 4,
        column: 89,
        message: "Line too long (89 > 88)"
      }
    ]);
  });

  it("rechaza un JSON que no es una lista de hallazgos", () => {
    expect(() => normalizeRuffJson({ diagnostics: [] })).toThrow(LintError);
  });
});

describe("el normalizador de Checkstyle", () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<checkstyle version="10.12">
  <file name="/repo/src/A.java">
    <error line="10" column="5" severity="warning" message="&apos;if&apos; is empty." source="com.puppycrawl.tools.checkstyle.checks.coding.EmptyStatementCheck"/>
    <error line="3" severity="error" message="Line is longer than 80." source="com.puppycrawl.tools.checkstyle.checks.sizes.LineLengthCheck"/>
    <error line="4" severity="ignore" message="ignorado" source="x.EmptyStatementCheck"/>
  </file>
  <file name="/outside/B.java">
    <error line="1" severity="error" message="fuera" source="x.LineLengthCheck"/>
  </file>
  <file name="src/C.java"></file>
</checkstyle>`;

  it("lee ficheros y hallazgos, y quita el Check del nombre", () => {
    const files = normalizeCheckstyleXml(xml, { root });

    expect(files.map((file) => file.path)).toEqual(["src/A.java", "src/C.java"]);
    expect(files[0]?.messages).toEqual([
      {
        rule: "EmptyStatement",
        severity: "warn",
        line: 10,
        column: 5,
        message: "'if' is empty."
      },
      {
        rule: "LineLength",
        severity: "error",
        line: 3,
        message: "Line is longer than 80."
      }
    ]);
  });

  it("rechaza lo que no es su XML", () => {
    expect(() => normalizeCheckstyleXml("<html></html>")).toThrow(LintError);
    expect(normalizeCheckstyleXml('<checkstyle version="1"></checkstyle>')).toEqual(
      []
    );
  });
});

describe("el normalizador de go vet", () => {
  it("lee sus líneas y descarta cabeceras y errores del comando", () => {
    const files = normalizeGoVetText(
      `# ejemplo/pkg
./pkg/a.go:12:3: fmt.Printf call has arguments but no formatting directives
pkg/b.go:7: unreachable code
vet: ./pkg: build constraints exclude all Go files
`,
      { root }
    );

    expect(files.map((file) => file.path)).toEqual(["pkg/a.go", "pkg/b.go"]);
    expect(files[0]?.messages[0]).toEqual({
      rule: "go vet",
      severity: "error",
      line: 12,
      column: 3,
      message: "fmt.Printf call has arguments but no formatting directives"
    });
    expect(files[1]?.messages[0]).toEqual({
      rule: "go vet",
      severity: "error",
      line: 7,
      message: "unreachable code"
    });
  });
});

describe("el normalizador de .NET", () => {
  it("lee los diagnósticos de MSBuild con su código y su severidad", () => {
    const files = normalizeDotnetText(
      `/repo/src/A.cs(5,16): warning CA1822: Mark members as static [Demo.csproj]
/repo/src/A.cs(7,1): error CS0168: The variable is declared but never used
/runs/otra.cs(1,1): error NETSDK1045: fuera del repo [Demo.csproj]
`,
      { root }
    );

    expect(files.map((file) => file.path)).toEqual(["src/A.cs"]);
    expect(files[0]?.messages).toEqual([
      {
        rule: "CA1822",
        severity: "warn",
        line: 5,
        column: 16,
        message: "Mark members as static"
      },
      {
        rule: "CS0168",
        severity: "error",
        line: 7,
        column: 1,
        message: "The variable is declared but never used"
      }
    ]);
  });

  it("ignora las líneas que no son diagnósticos", () => {
    expect(
      normalizeDotnetText("Compilación correcta.\n  0 advertencias\n", { root })
    ).toEqual([]);
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
