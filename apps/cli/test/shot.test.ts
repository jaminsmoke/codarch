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
  meta: { projectName: "capturas", apiVersion: "2.1", checksum: "shot-tree" },
  files: [
    {
      id: "root",
      name: "root",
      type: "Folder",
      children: [
        { id: "a", name: "a.ts", type: "File" },
        { id: "b", name: "b.ts", type: "File" },
        { id: "c", name: "c.ts", type: "File" }
      ]
    }
  ],
  lenses: {
    metrics: {
      attributes: {
        a: { rloc: 100, complexity: 10, number_of_commits: 5 },
        // b queda por debajo del p95. Con dos ficheros el p95 es el menor,
        // los dos saturan a 1 y el término aditivo no puede cambiar el color.
        b: { rloc: 20, complexity: 2, number_of_commits: 1 },
        c: { rloc: 80, complexity: 8, number_of_commits: 4 }
      }
    }
  }
};

const dirty = createLintArtifact({
  tools: ["eslint"],
  // El mismo checksum que el snapshot. Sin él, fresh es null y el PNG no cambia.
  // Hacen falta hallazgos de sobra: tres errores se quedan en la misma banda de color.
  tree: "shot-tree",
  files: [
    {
      path: "b.ts",
      messages: Array.from({ length: 40 }, (_, index) => ({
        rule: "no-any",
        severity: "error" as const,
        message: `un any ${index}`
      }))
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

function lintAt(dir: string, name = "lint.repmod.json"): void {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), JSON.stringify(dirty), "utf8");
}

describe("codarch shot con lint", () => {
  it("lee `.codarch/lint.repmod.json` cuando el snapshot está en la raíz", () => {
    const root = scratch();
    const file = ccAt(path.join(root, "mapa.cc.json"));

    const plain = capture(file, "sin.png");
    lintAt(path.join(root, ".codarch"));
    const withLint = capture(file, "con.png");

    expect(withLint.equals(plain)).toBe(false);
  });

  it("lee el `lint.repmod.json` que está al lado de un snapshot dentro de `.codarch/`", () => {
    const root = scratch();
    const file = ccAt(path.join(root, ".codarch", "snapshot.cc.json"));

    const plain = capture(file, "sin.png");
    lintAt(path.join(root, ".codarch"));
    const withLint = capture(file, "con.png");

    expect(withLint.equals(plain)).toBe(false);
  });

  it("no lee un `lint.json` con el nombre anterior (ADR 0100)", () => {
    const root = scratch();
    const file = ccAt(path.join(root, "mapa.cc.json"));

    const plain = capture(file, "sin-viejo.png");
    lintAt(path.join(root, ".codarch"), "lint.json");
    const withLint = capture(file, "con-viejo.png");

    expect(withLint.equals(plain)).toBe(true);
  });

  it("ignora un artefacto que no entiende y pinta como si no hubiera lint", () => {
    const root = scratch();
    const file = ccAt(path.join(root, "mapa.cc.json"));

    const plain = capture(file, "sin.png");
    fs.mkdirSync(path.join(root, ".codarch"), { recursive: true });
    fs.writeFileSync(
      path.join(root, ".codarch", "lint.repmod.json"),
      JSON.stringify({ schemaVersion: "0.1", files: {} }),
      "utf8"
    );

    expect(capture(file, "roto.png").equals(plain)).toBe(true);
  });
});
