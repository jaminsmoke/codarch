import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readFileDiff } from "../src/file-diff";

const tempRoots: string[] = [];

function tempRepo(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-file-diff-"));
  tempRoots.push(root);
  return root;
}

function git(root: string, args: string[]): void {
  execFileSync("git", args, { cwd: root, stdio: "ignore" });
}

/** Un repo con un commit y un `src/a.ts` de dos líneas. */
function committedRepo(): string {
  const root = tempRepo();
  git(root, ["init", "-q"]);
  git(root, ["config", "user.name", "Test"]);
  git(root, ["config", "user.email", "test@example.com"]);
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.writeFileSync(path.join(root, "src", "a.ts"), "export const a = 1;\n", "utf8");
  git(root, ["add", "-A"]);
  git(root, ["commit", "-qm", "base"]);
  return root;
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("readFileDiff", () => {
  it("un fichero modificado trae los dos números de línea", () => {
    const root = committedRepo();
    fs.writeFileSync(
      path.join(root, "src", "a.ts"),
      "export const a = 2;\nexport const b = 2;\n",
      "utf8"
    );

    const diff = readFileDiff(root, "src/a.ts");

    expect(diff).toMatchObject({ path: "src/a.ts", status: "changed", added: 2, removed: 1 });
    // Lo que se fue habla de la base; lo que llega, del head.
    const del = diff?.rows.find((row) => row.type === "del");
    const add = diff?.rows.find((row) => row.type === "add");
    expect(del).toEqual({ type: "del", text: "export const a = 1;", baseLine: 1, headLine: null });
    expect(add).toEqual({ type: "add", text: "export const a = 2;", baseLine: null, headLine: 1 });
  });

  it("las hunks dejan fuera el relleno y lo marcan con un hueco", () => {
    const root = committedRepo();
    const body = Array.from({ length: 40 }, (_, index) => `export const v${index} = ${index};`);
    fs.writeFileSync(path.join(root, "src", "long.ts"), `${body.join("\n")}\n`, "utf8");
    git(root, ["add", "-A"]);
    git(root, ["commit", "-qm", "long"]);
    const changed = [...body];
    changed[20] = "export const v20 = 99;";
    fs.writeFileSync(path.join(root, "src", "long.ts"), `${changed.join("\n")}\n`, "utf8");

    const diff = readFileDiff(root, "src/long.ts");

    // 40 líneas con un cambio en el centro: no se pintan las 40.
    expect(diff?.rows.length).toBeLessThan(40);
    expect(diff?.rows[0]?.type).toBe("gap");
    expect(diff?.truncated).toBe(false);
  });

  it("un fichero nuevo sale entero como añadido", () => {
    const root = committedRepo();
    fs.writeFileSync(path.join(root, "src", "nuevo.ts"), "export const n = 1;\n", "utf8");

    const diff = readFileDiff(root, "src/nuevo.ts");

    expect(diff).toMatchObject({ status: "added", added: 1, removed: 0 });
    expect(diff?.rows).toEqual([
      { type: "add", text: "export const n = 1;", baseLine: null, headLine: 1 }
    ]);
  });

  it("un fichero borrado sale entero como eliminado", () => {
    const root = committedRepo();
    fs.rmSync(path.join(root, "src", "a.ts"));

    const diff = readFileDiff(root, "src/a.ts");

    expect(diff).toMatchObject({ status: "removed", added: 0, removed: 1 });
    expect(diff?.rows).toEqual([
      { type: "del", text: "export const a = 1;", baseLine: 1, headLine: null }
    ]);
  });

  it("no lee fuera del repo ni lo que el análisis no mira", () => {
    const root = committedRepo();

    expect(readFileDiff(root, "../fuera.ts")).toBeNull();
    expect(readFileDiff(root, "node_modules/paquete/index.ts")).toBeNull();
    expect(readFileDiff(root, "README.md")).toBeNull();
    expect(readFileDiff(root, "src/no-existe.ts")).toBeNull();
  });

  it("dos lecturas del mismo árbol dan el mismo diff", () => {
    const root = committedRepo();
    fs.writeFileSync(path.join(root, "src", "a.ts"), "export const a = 3;\n", "utf8");

    expect(readFileDiff(root, "src/a.ts")).toEqual(readFileDiff(root, "src/a.ts"));
  });
});
