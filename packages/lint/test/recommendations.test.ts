import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  detectProjectSignals,
  recommendationsForProject
} from "../src/index";

const roots: string[] = [];

function repo(pkg: unknown): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-signals-"));
  roots.push(root);
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify(pkg),
    "utf8"
  );
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("las recomendaciones por proyecto", () => {
  it("lee las señales de package.json", () => {
    const root = repo({
      dependencies: { react: "^19.0.0" },
      devDependencies: { vitest: "^5.0.0", typescript: "^5.9.0" }
    });
    const signals = detectProjectSignals(root);

    expect(signals.react).toBe(true);
    expect(signals.vitest).toBe(true);
    expect(signals.typescript).toBe(true);
    expect(signals.vue).toBe(false);
  });

  it("en este repo añade la regla de TypeScript sin duplicar las base", async () => {
    const signals = detectProjectSignals(process.cwd());
    expect(signals.typescript).toBe(true);

    const recommendations = await recommendationsForProject(process.cwd(), [
      "eslint"
    ]);
    const ids = recommendations.eslint?.map((rule) => rule.id) ?? [];

    expect(ids).toContain("no-eval");
    expect(ids).toContain("@typescript-eslint/no-explicit-any");
    expect(new Set(ids).size).toBe(ids.length);
  });
});
