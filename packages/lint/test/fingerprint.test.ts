import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { lintConfigFingerprint, createLintArtifact, readLintArtifact } from "../src/index";
import type { LintSystem, LintTool } from "../src/index";

const roots: string[] = [];

function repo(config: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-fingerprint-"));
  roots.push(root);
  fs.writeFileSync(path.join(root, "eslint.config.js"), config, "utf8");
  return root;
}

const systems: LintSystem[] = [
  { name: "eslint", config: "eslint.config.js" }
];
const tools: LintTool[] = [
  { name: "eslint", command: "eslint .", format: "eslint-json" }
];

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("la huella de la config del lint", () => {
  it("es estable con la misma config y cambia si cambia el fichero", () => {
    const root = repo("export default [];\n");
    const first = lintConfigFingerprint(root, systems, tools);
    expect(lintConfigFingerprint(root, systems, tools)).toBe(first);

    fs.writeFileSync(
      path.join(root, "eslint.config.js"),
      "export default [{ rules: {} }];\n",
      "utf8"
    );
    expect(lintConfigFingerprint(root, systems, tools)).not.toBe(first);
  });

  it("incluye los comandos de las herramientas", () => {
    const root = repo("export default [];\n");
    const other: LintTool[] = [
      { name: "eslint", command: "eslint src", format: "eslint-json" }
    ];
    expect(lintConfigFingerprint(root, systems, tools)).not.toBe(
      lintConfigFingerprint(root, systems, other)
    );
  });

  it("el artefacto guarda la huella y la conserva al leer", () => {
    const artifact = createLintArtifact({
      tools: ["eslint"],
      config: "huella-1",
      files: []
    });
    const read = readLintArtifact(JSON.parse(JSON.stringify(artifact)));

    expect(artifact.meta.config).toBe("huella-1");
    expect(read?.meta.config).toBe("huella-1");
  });
});
