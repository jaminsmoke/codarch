import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getStats, parseCcJson } from "@codarch/schema";
import { runAnalyze } from "../src/commands/analyze";

const tempRoots: string[] = [];

function tempRepo(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-analyze-"));
  tempRoots.push(root);
  for (const [name, content] of Object.entries(files)) {
    const file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content, "utf8");
  }
  return root;
}

function readSnapshot(root: string) {
  const raw = fs.readFileSync(
    path.join(root, "out", "snapshot.cc.json"),
    "utf8"
  );
  return parseCcJson(JSON.parse(raw));
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("alcance de analyze", () => {
  it("lee ignore del .codarch.yml y suma el --ignore puntual", () => {
    const root = tempRepo({
      ".codarch.yml": "version: 1\nignore:\n  - src/config-skip/**\n",
      "src/keep.ts": "export const keep = 1;\n",
      "src/config-skip/a.ts": "export const a = 1;\n",
      "src/cli-skip/b.ts": "export const b = 1;\n"
    });
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    const code = runAnalyze({
      root,
      out: path.join(root, "out"),
      ignore: ["src/cli-skip/**"],
      git: false,
      help: false
    });

    expect(code).toBe(0);
    expect(getStats(readSnapshot(root)).files).toBe(1);
  });

  it("con --no-config no aplica el alcance del YAML", () => {
    const root = tempRepo({
      ".codarch.yml": "version: 1\nignore:\n  - src/skip/**\n",
      "src/keep.ts": "export const keep = 1;\n",
      "src/skip/a.ts": "export const a = 1;\n"
    });
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    const code = runAnalyze({
      root,
      out: path.join(root, "out"),
      noConfig: true,
      git: false,
      help: false
    });

    expect(code).toBe(0);
    expect(getStats(readSnapshot(root)).files).toBe(2);
  });

  it("falla con un alcance inválido antes de analizar", () => {
    const root = tempRepo({
      ".codarch.yml": "version: 1\nignore: fixtures/**\n",
      "src/keep.ts": "export const keep = 1;\n"
    });
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const code = runAnalyze({
      root,
      out: path.join(root, "out"),
      git: false,
      help: false
    });

    expect(code).toBe(1);
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("configuración inválida")
    );
    expect(fs.existsSync(path.join(root, "out", "snapshot.cc.json"))).toBe(
      false
    );
  });
});
