import { describe, expect, it } from "vitest";
import { REST_LINT_FILE } from "@codarch/schema/browser";
import {
  LINT_FILE,
  LINT_ARTIFACT_VERSION,
  LintError,
  canonicalLintPath,
  createLintArtifact,
  lintTotals,
  readLintArtifact,
  type LintFileResult,
  type LintMessage
} from "../src/index";

function message(over: Partial<LintMessage> = {}): LintMessage {
  return {
    rule: "no-unused-vars",
    severity: "warn",
    line: 1,
    column: 5,
    message: "la variable no se usa",
    ...over
  };
}

function file(path: string, messages: LintMessage[]): LintFileResult {
  return { path, messages };
}

describe("el artefacto del lint", () => {
  it("ordena ficheros y mensajes, y cuenta por severidad", () => {
    const artifact = createLintArtifact({
      tools: ["oxlint", "eslint", "eslint", " "],
      files: [
        file("src/b.ts", [
          message({ line: 9, rule: "no-debugger" }),
          message({ line: 2, severity: "error", rule: "no-var" })
        ]),
        file("./src/a.ts", [
          message({ line: 3, severity: "info", rule: "no-console" })
        ]),
        file("src/a.ts", [message({ line: 1, severity: "error" })])
      ]
    });

    expect(Object.keys(artifact.files)).toEqual(["src/a.ts", "src/b.ts"]);
    expect(artifact.meta.tools).toEqual(["eslint", "oxlint"]);
    expect(artifact.summary).toEqual({
      files: 2,
      errors: 2,
      warnings: 1,
      messages: 4,
      // Lo canónico: `./src/a.ts` y `src/a.ts` son el mismo fichero medido.
      measured: 2
    });
    expect(artifact.files["src/a.ts"]?.errors).toBe(1);
    expect(artifact.files["src/a.ts"]?.warnings).toBe(0);
    expect(artifact.files["src/a.ts"]?.messages).toHaveLength(2);
    expect(
      artifact.files["src/a.ts"]?.messages.map((entry) => entry.line)
    ).toEqual([1, 3]);
    expect(artifact.schemaVersion).toBe(LINT_ARTIFACT_VERSION);
  });

  it("el orden de entrada no cambia ni el artefacto ni el checksum", () => {
    const files = [
      file("src/a.ts", [message({ line: 2 }), message({ line: 1 })]),
      file("src/b.ts", [message({ severity: "error", rule: "no-var" })])
    ];
    const left = createLintArtifact({ tools: ["eslint", "oxlint"], files });
    const right = createLintArtifact({
      tools: ["oxlint", "eslint"],
      files: [
        { path: "src/b.ts", messages: [message({ rule: "no-var", severity: "error" })] },
        {
          path: "src/a.ts",
          messages: [message({ line: 1 }), message({ line: 2 })]
        }
      ]
    });

    expect(left).toEqual(right);
    expect(left.meta.checksum).toBe(right.meta.checksum);
  });

  it("el mismo mensaje de dos herramientas se cuenta una vez", () => {
    const artifact = createLintArtifact({
      tools: ["eslint", "oxlint"],
      files: [
        file("src/a.ts", [message({ rule: "no-debugger", line: 3 })]),
        file("src/a.ts", [message({ rule: "no-debugger", line: 3 })])
      ]
    });

    expect(artifact.files["src/a.ts"]?.messages).toHaveLength(1);
    expect(artifact.summary.warnings).toBe(1);
  });

  it("un mensaje distinto cambia el checksum", () => {
    const base = createLintArtifact({
      tools: ["eslint"],
      files: [file("src/a.ts", [message()])]
    });
    const changed = createLintArtifact({
      tools: ["eslint"],
      files: [file("src/a.ts", [message({ message: "otro texto" })])]
    });

    expect(base.meta.checksum).not.toBe(changed.meta.checksum);
  });

  it("un lint sin mensajes sigue siendo un artefacto", () => {
    const artifact = createLintArtifact({ tools: ["eslint"], files: [] });

    expect(artifact.files).toEqual({});
    expect(artifact.summary).toEqual({
      files: 0,
      errors: 0,
      warnings: 0,
      messages: 0,
      measured: 0
    });
    expect(artifact.meta.checksum).toMatch(/^[0-9a-f]{32}$/);
  });

  it("se lee igual que se escribe", () => {
    const written = createLintArtifact({
      tools: ["eslint"],
      files: [file("src/a.ts", [message()])]
    });

    expect(readLintArtifact(JSON.parse(JSON.stringify(written)))).toEqual(
      written
    );
    // Un aviso mal formado no es del esquema: no invalida el artefacto.
    expect(readLintArtifact({ ...written, diagnostics: "no" })).toEqual(written);
  });

  it("un artefacto 1.0 se lee y sus herramientas pasan a sistemas sin config", () => {
    const legacy = {
      schemaVersion: "1.0",
      meta: { checksum: "abc", tools: ["oxlint", "eslint"] },
      files: {},
      summary: { files: 0, errors: 0, warnings: 0, messages: 0 }
    };

    expect(readLintArtifact(legacy)).toEqual({
      schemaVersion: LINT_ARTIFACT_VERSION,
      meta: {
        checksum: "abc",
        tools: ["oxlint", "eslint"],
        systems: [
          { name: "eslint", config: null },
          { name: "oxlint", config: null }
        ]
      },
      files: {},
      summary: { files: 0, errors: 0, warnings: 0, messages: 0 }
    });
  });

  it("un sistema con reglas se ordena y viaja en el checksum", () => {
    const artifact = createLintArtifact({
      tools: ["eslint"],
      systems: [
        {
          name: "eslint",
          config: "eslint.config.js",
          rules: [
            { id: "no-var", severity: "warn" },
            { id: "no-console", severity: "error" }
          ]
        }
      ],
      files: []
    });

    expect(artifact.meta.systems[0]?.rules?.map((rule) => rule.id)).toEqual([
      "no-console",
      "no-var"
    ]);
    expect(
      createLintArtifact({
        tools: ["eslint"],
        systems: [{ name: "eslint", config: "eslint.config.js" }],
        files: []
      }).meta.checksum
    ).not.toBe(artifact.meta.checksum);
  });

  it("un artefacto 1.1 se sigue leyendo, sin cobertura ni árbol", () => {
    const previous = {
      schemaVersion: "1.1",
      meta: { checksum: "abc", tools: ["eslint"], systems: [] },
      files: {},
      summary: { files: 0, errors: 0, warnings: 0, messages: 0 }
    };

    const read = readLintArtifact(previous);
    expect(read?.schemaVersion).toBe(LINT_ARTIFACT_VERSION);
    expect(read?.summary.measured).toBeUndefined();
    expect(read?.meta.tree).toBeUndefined();
  });

  it("dice cuántos ficheros midió y de qué árbol", () => {
    const artifact = createLintArtifact({
      tools: ["eslint"],
      tree: "0c74d0ac80a995135ecff96096be41a5",
      files: [
        // Un fichero limpio: no aparece en `files`, pero se midió.
        file("src/a.ts", []),
        file("src/b.ts", [message()])
      ]
    });

    expect(artifact.meta.tree).toBe("0c74d0ac80a995135ecff96096be41a5");
    expect(artifact.summary).toMatchObject({ files: 1, measured: 2 });
    expect(readLintArtifact(JSON.parse(JSON.stringify(artifact)))).toEqual(
      artifact
    );
  });

  it("una procedencia rota invalida el artefacto", () => {
    const artifact = createLintArtifact({ tools: ["eslint"], files: [] });

    expect(
      readLintArtifact({ ...artifact, meta: { ...artifact.meta, tree: 7 } })
    ).toBeNull();
    expect(
      readLintArtifact({
        ...artifact,
        summary: { ...artifact.summary, measured: -1 }
      })
    ).toBeNull();
  });

  it("un fichero que no es un artefacto de esta versión no es lint", () => {
    const artifact = createLintArtifact({ tools: ["eslint"], files: [] });

    expect(readLintArtifact(null)).toBeNull();
    expect(readLintArtifact([])).toBeNull();
    expect(readLintArtifact({ ...artifact, schemaVersion: "0.9" })).toBeNull();
    expect(readLintArtifact({ ...artifact, meta: { tools: [] } })).toBeNull();
    expect(readLintArtifact({ ...artifact, files: { "a.ts": [] } })).toBeNull();
    expect(readLintArtifact({ ...artifact, summary: {} })).toBeNull();
  });

  it("un mensaje roto invalida el artefacto entero", () => {
    const artifact = createLintArtifact({
      tools: ["eslint"],
      files: [file("src/a.ts", [message()])]
    });
    const broken = structuredClone(artifact) as unknown as {
      files: Record<string, { messages: unknown[] }>;
    };
    broken.files["src/a.ts"]?.messages.push({ rule: "x", severity: "fatal" });

    expect(readLintArtifact(broken)).toBeNull();
  });

  it("canoniza rutas y rechaza las que no son del repo", () => {
    expect(canonicalLintPath(".\\src\\a.ts")).toBe("src/a.ts");
    expect(canonicalLintPath("./src//a.ts")).toBe("src/a.ts");
    expect(canonicalLintPath("src/./a.ts/")).toBe("src/a.ts");
    expect(canonicalLintPath("Src/Foo.ts")).toBe("Src/Foo.ts");
    const nfd = "src/Cafe\u0301.ts";
    const nfc = "src/Caf\u00e9.ts";
    expect(nfd).not.toBe(nfc);
    expect(canonicalLintPath(nfd)).toBe(nfc);
    expect(() => canonicalLintPath("/etc/passwd")).toThrow(LintError);
    expect(() => canonicalLintPath("C:\\repo\\a.ts")).toThrow(LintError);
    expect(() => canonicalLintPath("../a.ts")).toThrow(LintError);
    expect(() => canonicalLintPath("src/../a.ts")).toThrow(LintError);
    expect(() => canonicalLintPath("")).toThrow(LintError);
  });

  it("al leer, una ruta NFD es la NFC y lintTotals la encuentra ahí", () => {
    const nfd = "src/Cafe\u0301.ts";
    const nfc = "src/Caf\u00e9.ts";
    const raw = {
      schemaVersion: "1.2",
      meta: { checksum: "abc", tools: ["eslint"], systems: [] },
      files: {
        [nfd]: {
          errors: 9,
          warnings: 9,
          messages: [message()]
        }
      },
      summary: { files: 9, errors: 9, warnings: 9, messages: 9 }
    };

    const read = readLintArtifact(raw);
    expect(Object.keys(read?.files ?? {})).toEqual([nfc]);
    expect(read?.files[nfd]).toBeUndefined();
    expect(read?.diagnostics).toBeUndefined();
    expect(read?.files[nfc]).toMatchObject({ errors: 0, warnings: 1 });
    expect(lintTotals(read)).toEqual({
      errors: 0,
      warnings: 1,
      info: 0,
      findings: 1,
      files: 1
    });
    expect(lintTotals(read, nfc)?.warnings).toBe(1);
    expect(readLintArtifact(JSON.parse(JSON.stringify(read)))).toEqual(read);
  });

  it("canoniza barras, ./ y // al leer, y conserva las mayúsculas", () => {
    const raw = {
      schemaVersion: "1.2",
      meta: { checksum: "abc", tools: ["eslint"], systems: [] },
      files: {
        ".\\src\\\\b.ts": {
          errors: 0,
          warnings: 1,
          messages: [message({ message: "barra" })]
        },
        "Src/Foo.ts": {
          errors: 1,
          warnings: 0,
          messages: [message({ severity: "error", message: "mayuscula" })]
        },
        "src/foo.ts": {
          errors: 0,
          warnings: 1,
          messages: [message({ message: "minuscula" })]
        }
      },
      summary: { files: 3, errors: 1, warnings: 2, messages: 3 }
    };

    const read = readLintArtifact(raw);
    expect(Object.keys(read?.files ?? {})).toEqual([
      "Src/Foo.ts",
      "src/b.ts",
      "src/foo.ts"
    ]);
    expect(read?.diagnostics).toBeUndefined();
    expect(lintTotals(read, "Src/Foo.ts")?.errors).toBe(1);
    expect(lintTotals(read, "src/foo.ts")?.errors).toBe(0);
    expect(readLintArtifact(JSON.parse(JSON.stringify(read)))).toEqual(read);
  });

  it("avisa si dos claves distintas caen en la misma ruta y no las funde en silencio", () => {
    const nfd = "src/Cafe\u0301.ts";
    const nfc = "src/Caf\u00e9.ts";
    const written = createLintArtifact({
      tools: ["eslint"],
      files: [
        file(nfd, [message({ message: "uno" })]),
        file(nfc, [message({ message: "dos", severity: "error" })])
      ]
    });
    // Al escribir, la misma ruta es un fichero: se funde y no hay aviso.
    expect(Object.keys(written.files)).toEqual([nfc]);
    expect(written.files[nfc]?.messages).toHaveLength(2);
    expect(written.diagnostics).toBeUndefined();

    const raw = {
      schemaVersion: "1.2",
      meta: { checksum: "abc", tools: ["eslint"], systems: [] },
      files: {
        "./src/a.ts": {
          errors: 9,
          warnings: 9,
          messages: [message({ message: "punto" })]
        },
        "src//a.ts": {
          errors: 9,
          warnings: 9,
          messages: [message({ message: "barra", severity: "error" })]
        },
        [nfd]: {
          errors: 9,
          warnings: 9,
          messages: [message({ message: "nfd" })]
        },
        [nfc]: {
          errors: 9,
          warnings: 9,
          messages: [message({ message: "nfc", severity: "info" })]
        }
      },
      summary: { files: 9, errors: 9, warnings: 9, messages: 9, measured: 8 }
    };

    const read = readLintArtifact(raw);
    expect(read?.diagnostics).toEqual([
      {
        kind: "path-collision",
        path: nfc,
        keys: [nfd, nfc]
      },
      {
        kind: "path-collision",
        path: "src/a.ts",
        keys: ["./src/a.ts", "src//a.ts"]
      }
    ]);
    expect(Object.keys(read?.files ?? {})).toEqual([nfc, "src/a.ts"]);
    expect(read?.files["src/a.ts"]?.messages.map((entry) => entry.message)).toEqual([
      "punto",
      "barra"
    ]);
    expect(read?.files["src/a.ts"]).toMatchObject({ errors: 1, warnings: 1 });
    expect(read?.files[nfc]?.messages).toHaveLength(2);
    expect(read?.summary).toEqual({
      files: 2,
      errors: 1,
      warnings: 2,
      messages: 4,
      measured: 8
    });
    expect(readLintArtifact(JSON.parse(JSON.stringify(read)))).toEqual(read);
  });

  it("una ruta __proto__ sigue siendo un fichero con hallazgos", () => {
    const written = createLintArtifact({
      tools: ["eslint"],
      files: [file("__proto__", [message()])]
    });
    expect(Object.hasOwn(written.files, "__proto__")).toBe(true);
    expect(written.files["__proto__"]).toMatchObject({ errors: 0, warnings: 1 });
    expect(written.summary).toMatchObject({ files: 1, warnings: 1, messages: 1 });

    const raw = {
      schemaVersion: "1.2",
      meta: { checksum: "abc", tools: ["eslint"], systems: [] },
      files: {
        ["__proto__"]: {
          errors: 9,
          warnings: 9,
          messages: [message()]
        }
      },
      summary: { files: 9, errors: 9, warnings: 9, messages: 9 }
    };
    const read = readLintArtifact(raw);
    expect(Object.hasOwn(read?.files ?? {}, "__proto__")).toBe(true);
    expect(read?.files["__proto__"]).toMatchObject({ errors: 0, warnings: 1 });
    expect(read?.summary).toMatchObject({ files: 1, warnings: 1, messages: 1 });
  });

  it("une los mensajes de una colisión sin depender del spread", () => {
    const first = Array.from({ length: 40 }, (_, index) =>
      message({ message: `a-${index}`, line: index + 1 })
    );
    const second = Array.from({ length: 40 }, (_, index) =>
      message({ message: `b-${index}`, line: index + 1, severity: "error" })
    );
    const read = readLintArtifact({
      schemaVersion: "1.2",
      meta: { checksum: "abc", tools: ["eslint"], systems: [] },
      files: {
        "./src/a.ts": { errors: 0, warnings: 40, messages: first },
        "src/a.ts": { errors: 40, warnings: 0, messages: second }
      },
      summary: { files: 2, errors: 40, warnings: 40, messages: 80 }
    });

    expect(read?.files["src/a.ts"]?.messages).toHaveLength(80);
    expect(read?.summary.messages).toBe(80);
    expect(read?.diagnostics?.[0]?.keys).toEqual(["./src/a.ts", "src/a.ts"]);
  });

  it("un aviso de colisión cuyas claves no canonizan a la ruta no se conserva", () => {
    const written = createLintArtifact({
      tools: ["eslint"],
      files: [file("src/a.ts", [message()])]
    });
    const forged = readLintArtifact({
      ...written,
      diagnostics: [
        { kind: "path-collision", path: "src/a.ts", keys: ["src/a.ts", "src/a.ts"] },
        { kind: "path-collision", path: "src/a.ts", keys: ["src/b.ts", "src/a.ts"] },
        {
          kind: "path-collision",
          path: "src/a.ts",
          keys: ["./src/a.ts", "src/a.ts"]
        }
      ]
    });

    expect(forged?.diagnostics).toEqual([
      { kind: "path-collision", path: "src/a.ts", keys: ["./src/a.ts", "src/a.ts"] }
    ]);
  });

  it("el checksum leído es el del fichero, aunque las cuentas se regeneren", () => {
    const read = readLintArtifact({
      schemaVersion: "1.2",
      meta: { checksum: "del-escritor", tools: ["eslint"], systems: [] },
      files: {
        "src/a.ts": { errors: 9, warnings: 9, messages: [message()] }
      },
      summary: { files: 9, errors: 9, warnings: 9, messages: 9 }
    });

    expect(read?.meta.checksum).toBe("del-escritor");
    expect(read?.summary.warnings).toBe(1);
  });

  it("una ruta absoluta o con .. no es un artefacto, y el lector no lanza", () => {
    const base = {
      schemaVersion: "1.2",
      meta: { checksum: "abc", tools: ["eslint"], systems: [] },
      summary: { files: 1, errors: 0, warnings: 1, messages: 1 }
    };
    const fileBody = {
      errors: 0,
      warnings: 1,
      messages: [message()]
    };

    expect(
      readLintArtifact({ ...base, files: { "../a.ts": fileBody } })
    ).toBeNull();
    expect(
      readLintArtifact({ ...base, files: { "/etc/passwd": fileBody } })
    ).toBeNull();
    expect(
      readLintArtifact({ ...base, files: { "C:/repo/a.ts": fileBody } })
    ).toBeNull();
  });

  it("regenera las cuentas desde los mensajes cuando el resumen declara 9/9", () => {
    const raw = {
      schemaVersion: "1.2",
      meta: { checksum: "abc", tools: ["eslint"], systems: [] },
      files: {
        "src/a.ts": {
          errors: 9,
          warnings: 9,
          messages: [message()]
        }
      },
      summary: { files: 9, errors: 9, warnings: 9, messages: 9, measured: 12 }
    };

    const read = readLintArtifact(raw);
    expect(read?.files["src/a.ts"]).toMatchObject({ errors: 0, warnings: 1 });
    expect(read?.files["src/a.ts"]?.messages).toHaveLength(1);
    // `measured` es la cobertura global: no se reconstruye desde los mensajes.
    expect(read?.summary).toEqual({
      files: 1,
      errors: 0,
      warnings: 1,
      messages: 1,
      measured: 12
    });
    expect(readLintArtifact(JSON.parse(JSON.stringify(read)))).toEqual(read);
  });

  it("un info es hallazgo y fichero, y no es error ni aviso", () => {
    const raw = {
      schemaVersion: "1.2",
      meta: { checksum: "abc", tools: ["eslint"], systems: [] },
      files: {
        "src/b.ts": {
          errors: 9,
          warnings: 9,
          messages: [message({ severity: "info", rule: "no-console" })]
        },
        "src/a.ts": { errors: 4, warnings: 4, messages: [] }
      },
      summary: { files: 9, errors: 9, warnings: 9, messages: 9 }
    };

    const read = readLintArtifact(raw);
    // Sin mensajes no hay hallazgo: la clave declarada no se conserva.
    expect(read?.files["src/a.ts"]).toBeUndefined();
    expect(Object.keys(read?.files ?? {})).toEqual(["src/b.ts"]);
    expect(read?.files["src/b.ts"]).toMatchObject({ errors: 0, warnings: 0 });
    expect(read?.summary).toEqual({
      files: 1,
      errors: 0,
      warnings: 0,
      messages: 1
    });
    expect(readLintArtifact(JSON.parse(JSON.stringify(read)))).toEqual(read);
  });

  it("un 1.0 y un 1.1 con cuentas desviadas se leen y la segunda lectura no cambia", () => {
    const files = {
      "src/a.ts": {
        errors: 9,
        warnings: 9,
        messages: [message()]
      }
    };
    const legacy = {
      schemaVersion: "1.0",
      meta: { checksum: "abc", tools: ["oxlint", "eslint"] },
      files,
      summary: { files: 9, errors: 9, warnings: 9, messages: 9 }
    };
    const previous = {
      schemaVersion: "1.1",
      meta: {
        checksum: "abc",
        tools: ["eslint"],
        systems: [{ name: "eslint", config: null }]
      },
      files,
      summary: { files: 9, errors: 9, warnings: 9, messages: 9 }
    };

    const readLegacy = readLintArtifact(legacy);
    const readPrevious = readLintArtifact(previous);
    expect(readLegacy?.schemaVersion).toBe(LINT_ARTIFACT_VERSION);
    expect(readLegacy?.summary).toEqual({
      files: 1,
      errors: 0,
      warnings: 1,
      messages: 1
    });
    expect(readLegacy?.summary.measured).toBeUndefined();
    expect(readLegacy?.meta.systems.map((system) => system.name)).toEqual([
      "eslint",
      "oxlint"
    ]);
    expect(readLegacy?.meta.checksum).toBe("abc");
    expect(readPrevious?.summary.measured).toBeUndefined();
    expect(readPrevious?.meta.tree).toBeUndefined();
    expect(readPrevious?.files["src/a.ts"]?.warnings).toBe(1);
    expect(readLintArtifact(JSON.parse(JSON.stringify(readLegacy)))).toEqual(
      readLegacy
    );
    expect(readLintArtifact(JSON.parse(JSON.stringify(readPrevious)))).toEqual(
      readPrevious
    );
  });

  it("se llama como un módulo del reporte, no como un cc.json", () => {
    // ADR 0100: `cc.json` es un formato que se abre fuera, y el lint no lo es.
    expect(LINT_FILE).toBe("lint.repmod.json");
    expect(REST_LINT_FILE).toBe("lint-rest.repmod.json");
    expect(LINT_FILE.endsWith(".cc.json")).toBe(false);
  });
});
