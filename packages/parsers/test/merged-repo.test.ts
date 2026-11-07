import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { CcNode } from "@codarch/schema/browser";
import type { LintArtifact } from "@codarch/lint/browser";
import { scopeHealthMerged } from "@codarch/lint/browser";
import { NodeFileSystem } from "../src/node-fs";
import { buildRestSnapshot, measureRestFile, type RestFile } from "../src/rest";
import { buildRestLint } from "../src/rest-lint";
import { walkCodeAndRest } from "../src/walk";

const repoRoot = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");
const EXAMPLE =
  "apps/site/docs/desarrollo/adr/0081-0090/0087-el-fichero-entero-en-el-escenario.md";
const BROKEN_TARGET = "0011-0020/0018-estado-vista-en-la-url.md";

function snapshotFiles(node: CcNode, prefix: string, isRoot: boolean, acc: string[]): void {
  if (!isRoot && node.type === "File") {
    acc.push(prefix);
    return;
  }
  for (const child of node.children ?? []) {
    const next = isRoot ? child.name : `${prefix}/${child.name}`;
    snapshotFiles(child, next, false, acc);
  }
}

describe("el repo real, sin reescribir artefactos", () => {
  it("junta el enlace roto de verdad y no pierde los .md del mapa del resto", () => {
    const fileSystem = new NodeFileSystem(repoRoot);
    const walked = walkCodeAndRest(fileSystem);
    const warnings: string[] = [];
    const restFiles: RestFile[] = [];
    for (const file of walked.rest) {
      const measured = measureRestFile(fileSystem, file, warnings);
      if (measured) restFiles.push(measured);
    }
    const docs = buildRestLint({ files: restFiles, tree: "resto-de-prueba" });
    const code: LintArtifact = {
      schemaVersion: "1.2",
      meta: { checksum: "code", tools: ["eslint"], systems: [], tree: "codigo-de-prueba" },
      files: {},
      summary: { files: 0, errors: 0, warnings: 0, messages: 0, measured: 4 }
    };
    const codePaths = walked.code.map((file) => file.relativePath);
    const snapshot = { treeHash: "codigo-de-prueba", paths: codePaths };
    const project = scopeHealthMerged([code, docs], { kind: "project", path: "" }, snapshot);
    const folder = scopeHealthMerged(
      [code, docs],
      { kind: "folder", path: "apps/site/docs" },
      snapshot
    );
    const file = scopeHealthMerged(
      [code, docs],
      { kind: "file", path: EXAMPLE },
      snapshot
    );

    const broken = project.findings.filter((finding) => finding.ruleId === "doc/broken-link");
    const example = file.findings.filter((finding) => finding.ruleId === "doc/broken-link");
    expect(example.length).toBeGreaterThan(0);
    expect(example.every((finding) => finding.message.includes(BROKEN_TARGET))).toBe(true);
    expect(example[0]).toMatchObject({
      domain: "docs",
      tool: "codarch",
      inferred: false,
      anchor: { map: "rest", path: EXAMPLE }
    });
    expect(docs.meta.systems[0]?.rules?.map((rule) => rule.id)).toEqual(["doc/broken-link"]);
    expect(folder.findings.every((finding) => finding.path.startsWith("apps/site/docs/"))).toBe(
      true
    );
    expect(folder.counts.findings).toBe(
      folder.origins.reduce((total, origin) => total + origin.counts.findings, 0)
    );
    expect(project.counts).toEqual(
      project.origins.reduce(
        (total, origin) => ({
          errors: total.errors + origin.counts.errors,
          warnings: total.warnings + origin.counts.warnings,
          info: total.info + origin.counts.info,
          findings: total.findings + origin.counts.findings,
          filesWithFindings: total.filesWithFindings + origin.counts.filesWithFindings
        }),
        { errors: 0, warnings: 0, info: 0, findings: 0, filesWithFindings: 0 }
      )
    );
    expect(project.findings).toHaveLength(project.counts.findings);
    expect(broken.length).toBe(project.counts.findings);
    expect(project.origins.find((origin) => origin.domain === "code")?.coverage.state).toBe(
      "unknown"
    );
    expect(project.clean).toBe(false);

    const codeMarkdown = codePaths.filter((filePath) => filePath.endsWith(".md"));
    const restMarkdown = restFiles.filter(
      (entry) => entry.kind === "doc" && entry.relativePath.endsWith(".md")
    );
    const tree = buildRestSnapshot({ projectName: "codarch", files: restFiles });
    const nodes: string[] = [];
    const root = tree.files[0];
    if (root) snapshotFiles(root, "", true, nodes);
    const nodeMarkdown = new Set(nodes.filter((filePath) => filePath.endsWith(".md")));
    const missingFromMap = restMarkdown
      .map((entry) => entry.relativePath)
      .filter((filePath) => !nodeMarkdown.has(filePath));

    expect(codeMarkdown).toEqual([]);
    expect(nodeMarkdown.has(EXAMPLE)).toBe(true);
    expect(missingFromMap).toEqual([]);
    expect(restMarkdown.length).toBeGreaterThan(0);
  }, 120_000);
});
