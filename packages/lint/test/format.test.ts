import { describe, expect, it } from "vitest";
import {
  LINT_ARTIFACT_VERSION,
  LintError,
  canonicalLintPath,
  createLintArtifact,
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
      messages: 4
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
      messages: 0
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
    expect(() => canonicalLintPath("/etc/passwd")).toThrow(LintError);
    expect(() => canonicalLintPath("C:\\repo\\a.ts")).toThrow(LintError);
    expect(() => canonicalLintPath("../a.ts")).toThrow(LintError);
    expect(() => canonicalLintPath("")).toThrow(LintError);
  });
});
