import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createLintArtifact } from "@codarch/lint";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runShot } from "../src/commands/shot";

const temporary: string[] = [];

function scratch(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-shot-"));
  temporary.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of temporary.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
    vi.restoreAllMocks();
  }
});

const snapshot = {
  meta: { projectName: "capturas", apiVersion: "2.1" },
  files: [
    {
      id: "root",
      name: "root",
      type: "Folder",
      children: [
        { id: "a", name: "a.ts", type: "File" },
        { id: "b", name: "b.ts", type: "File" }
      ]
    }
  ],
  lenses: {
    metrics: {
      attributes: {
        a: { rloc: 100, complexity: 10, number_of_commits: 5 },
        b: { rloc: 50, complexity: 5, number_of_commits: 3 }
      }
    }
  }
};

const dirty = createLintArtifact({
  tools: ["eslint"],
  files: [
    {
      path: "b.ts",
      messages: [
        { rule: "no-any", severity: "error", message: "un `any`" },
        { rule: "no-any", severity: "error", message: "otro `any`" },
        { rule: "no-any", severity: "error", message: "y otro" }
      ]
    }
  ]
});

/** Escribe el snapshot donde se le diga y devuelve su ruta. */
function ccAt(file: string): string {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(snapshot)}\n`, "utf8");
  return file;
}

/** La captura de riesgo de un `cc.json`, por una ruta de salida propia. */
function capture(file: string, name: string): Buffer {
  const out = path.join(scratch(), name);
  vi.spyOn(console, "log").mockImplementation(() => {});
  expect(runShot({ file, color: "risk", out, json: true, help: false })).toBe(0);
  return fs.readFileSync(out);
}

function lintAt(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "lint.json"), JSON.stringify(dirty), "utf8");
}

describe("codarch shot con lint", () => {
  it("lee `.codarch/lint.json` cuando el snapshot está en la raíz", () => {
    const root = scratch();
    const file = ccAt(path.join(root, "mapa.cc.json"));

    const plain = capture(file, "sin.png");
    lintAt(path.join(root, ".codarch"));
    const withLint = capture(file, "con.png");

    expect(withLint.equals(plain)).toBe(false);
  });

  it("lee el `lint.json` que está al lado de un snapshot dentro de `.codarch/`", () => {
    const root = scratch();
    const file = ccAt(path.join(root, ".codarch", "snapshot.cc.json"));

    const plain = capture(file, "sin.png");
    lintAt(path.join(root, ".codarch"));
    const withLint = capture(file, "con.png");

    expect(withLint.equals(plain)).toBe(false);
  });

  it("ignora un artefacto que no entiende y pinta como si no hubiera lint", () => {
    const root = scratch();
    const file = ccAt(path.join(root, "mapa.cc.json"));

    const plain = capture(file, "sin.png");
    fs.mkdirSync(path.join(root, ".codarch"), { recursive: true });
    fs.writeFileSync(
      path.join(root, ".codarch", "lint.json"),
      JSON.stringify({ schemaVersion: "0.1", files: {} }),
      "utf8"
    );

    expect(capture(file, "roto.png").equals(plain)).toBe(true);
  });
});
