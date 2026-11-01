import { describe, expect, it } from "vitest";
import type { RestFile } from "../src/rest";
import { buildRestLint } from "../src/rest-lint";

const files: RestFile[] = [
  {
    relativePath: "README.md",
    kind: "doc",
    bytes: 8,
    loc: 1,
    frontmatter: { status: "missing", keys: [] }
  },
  {
    relativePath: "docs/a.md",
    kind: "doc",
    bytes: 40,
    loc: 3,
    linkTargets: ["falta.md"],
    frontmatter: { status: "ok", keys: ["title"] }
  },
  { relativePath: "package.json", kind: "config", bytes: 20, loc: 1 }
];

describe("el lint del resto (ADR 0105)", () => {
  it("lleva el checksum del resto y solo juzga documentos", () => {
    const artifact = buildRestLint({ files, tree: "abc123" });

    expect(artifact.meta).toMatchObject({ tools: ["codarch"], tree: "abc123" });
    expect(artifact.files["docs/a.md"]?.messages[0]?.rule).toBe(
      "doc/broken-link"
    );
    expect(artifact.summary).toMatchObject({ errors: 1, messages: 1 });
    // El `package.json` no se mira: contarlo como medido diría que sí.
    expect(artifact.summary.measured).toBe(2);
  });

  it("el orden de entrada no cambia el artefacto ni su checksum", () => {
    const left = buildRestLint({ files, tree: "abc123" });
    const right = buildRestLint({ files: [...files].reverse(), tree: "abc123" });

    expect(left).toEqual(right);
    expect(left.meta.checksum).toBe(right.meta.checksum);
  });

  it("sin árbol medido no se inventa procedencia", () => {
    expect(buildRestLint({ files }).meta.tree).toBeUndefined();
  });
});
