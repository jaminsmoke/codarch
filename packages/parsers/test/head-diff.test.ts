import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { fileId } from "@codarch/schema";
import { compareWorkingTreeWithHead } from "../src/head-diff";

const tempRoots: string[] = [];

function tempRepo(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-head-diff-"));
  tempRoots.push(root);
  return root;
}

function git(root: string, args: string[]): void {
  execFileSync("git", args, { cwd: root, stdio: "ignore" });
}

function initRepo(root: string): void {
  git(root, ["init", "-q"]);
  git(root, ["config", "user.name", "Test"]);
  git(root, ["config", "user.email", "test@example.com"]);
}

function writeProject(root: string, aSource: string): void {
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({ name: "head-diff-repo" }),
    "utf8"
  );
  fs.writeFileSync(path.join(root, "src", "a.ts"), aSource, "utf8");
  fs.writeFileSync(
    path.join(root, "src", "b.ts"),
    'import { a } from "./a";\nexport const b = a;\n',
    "utf8"
  );
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("compareWorkingTreeWithHead", () => {
  it("devuelve null cuando el directorio no tiene commits", () => {
    const root = tempRepo();
    initRepo(root);
    writeProject(root, "export const a = 1;\n");

    expect(compareWorkingTreeWithHead(root)).toBeNull();
  });

  it("sin cambios sin commitear, base y head tienen el mismo checksum", () => {
    const root = tempRepo();
    initRepo(root);
    writeProject(root, "export const a = 1;\n");
    git(root, ["add", "-A"]);
    git(root, ["commit", "-qm", "base"]);

    const pair = compareWorkingTreeWithHead(root);

    expect(pair).not.toBeNull();
    expect(pair?.head.meta.checksum).toBe(pair?.base.meta.checksum);
    expect(pair?.base.meta.projectName).toBe(pair?.head.meta.projectName);
  });

  it("un cambio sin commitear aparece como distinto entre base y head", () => {
    const root = tempRepo();
    initRepo(root);
    writeProject(root, "export const a = 1;\n");
    git(root, ["add", "-A"]);
    git(root, ["commit", "-qm", "base"]);
    // Un cambio que no está en el commit: el base lo ignora, el head lo ve.
    fs.writeFileSync(
      path.join(root, "src", "b.ts"),
      'import { a } from "./a";\nexport const b = a + 1;\nexport const c = 2;\n',
      "utf8"
    );

    const pair = compareWorkingTreeWithHead(root);

    expect(pair?.head.meta.checksum).not.toBe(pair?.base.meta.checksum);
  });

  it("el churn es el mismo en base y head: el fichero sin tocar no marca ruido", () => {
    const root = tempRepo();
    initRepo(root);
    writeProject(root, "export const a = 1;\n");
    git(root, ["add", "-A"]);
    git(root, ["commit", "-qm", "base"]);
    // Solo a.ts cambia sin commitear; b.ts es idéntico en los dos lados.
    fs.writeFileSync(path.join(root, "src", "a.ts"), "export const a = 2;\n", "utf8");

    const pair = compareWorkingTreeWithHead(root);
    expect(pair).not.toBeNull();

    const bId = fileId("src/b.ts");
    const baseB = pair?.base.lenses?.metrics?.attributes?.[bId];
    const headB = pair?.head.lenses?.metrics?.attributes?.[bId];
    expect(baseB).toMatchObject({ number_of_commits: 1, number_of_authors: 1 });
    expect(headB).toEqual(baseB);
  });
});
