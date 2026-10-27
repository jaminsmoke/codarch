import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { writeParseCachePayload } from "@codarch/parsers";
import { analyze } from "../src/analyze-worker";

const tempRoots: string[] = [];

function git(cwd: string, args: string[]): void {
  execFileSync("git", args, { cwd, stdio: "ignore" });
}

function tempRepo(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-worker-head-"));
  tempRoots.push(root);
  git(root, ["init", "-q"]);
  git(root, ["config", "user.name", "Test"]);
  git(root, ["config", "user.email", "test@example.com"]);
  fs.mkdirSync(path.join(root, "src"));
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "worker-head" }));
  fs.writeFileSync(path.join(root, "src", "a.ts"), "export const a = 1;\n");
  fs.writeFileSync(path.join(root, "src", "b.ts"), 'import { a } from "./a";\nexport const b = a;\n');
  git(root, ["add", "-A"]);
  git(root, ["commit", "-qm", "base"]);
  return root;
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("analyze (worker del escritorio) · reporte HEAD", () => {
  it("unchanged devuelve el último reporte HEAD, no null", () => {
    const root = tempRepo();
    // Una línea más cambia las métricas de a.ts (un valor distinto no las cambia).
    fs.writeFileSync(path.join(root, "src", "a.ts"), "export const a = 1;\nexport const c = 3;\n");

    // Primer análisis: calcula el HEAD y lo guarda.
    const first = analyze({ id: 1, root, force: true });
    expect(first.ok).toBe(true);
    if (!first.ok || first.result.kind !== "snapshot") throw new Error("sin snapshot");
    expect(first.result.headReport?.files.changed.map((f) => f.path)).toEqual(["src/a.ts"]);

    // Sin nada nuevo, refresh contesta unchanged, pero con el mismo reporte.
    const second = analyze({ id: 2, root, hints: [] });
    expect(second.ok).toBe(true);
    if (!second.ok) throw new Error("fallo");
    expect(second.result.kind).toBe("unchanged");
    if (second.result.kind !== "unchanged") throw new Error("no unchanged");
    expect(second.result.headReport?.files.changed.map((f) => f.path)).toEqual(["src/a.ts"]);
  });

  it("no escribe en `.codarch/` y deja la caché de parseo lista para guardar", async () => {
    const root = tempRepo();

    const first = analyze({ id: 1, root, force: true });
    expect(first.ok).toBe(true);
    if (!first.ok || first.result.kind !== "snapshot") {
      throw new Error("sin snapshot");
    }

    // El que analiza calcula la caché pero no toca `.codarch/`: escribir es
    // cosa del proceso principal (ADR 0050).
    expect(fs.existsSync(path.join(root, ".codarch"))).toBe(false);

    const payload = first.result.parseCache;
    expect(payload.root).toBe(path.resolve(root));
    expect(Object.keys(payload.entries).sort()).toEqual(["src/a.ts", "src/b.ts"]);

    // Guardarla —lo que hace el proceso principal— no cambia el mapa: el
    // primer análisis fue sin caché en disco, y este la tiene y la reutiliza.
    writeParseCachePayload(path.join(root, ".codarch"), payload);
    vi.resetModules();
    const fresh = await import("../src/analyze-worker");
    const again = fresh.analyze({ id: 2, root, force: true });
    if (!again.ok || again.result.kind !== "snapshot") {
      throw new Error("sin snapshot");
    }
    expect(again.result.snapshot.meta.checksum).toBe(
      first.result.snapshot.meta.checksum
    );
  }, 20_000);

  it("tras un cambio nuevo, el reporte HEAD se renueva", () => {
    const root = tempRepo();
    fs.writeFileSync(path.join(root, "src", "a.ts"), "export const a = 1;\nexport const c = 3;\n");
    analyze({ id: 1, root, force: true });

    // Un segundo cambio que altera métricas de b.ts: el reporte debe incluirlo.
    fs.writeFileSync(path.join(root, "src", "b.ts"), 'import { a } from "./a";\nexport const b = a;\nexport const d = 4;\n');
    const next = analyze({ id: 2, root, force: true });
    expect(next.ok).toBe(true);
    if (!next.ok || next.result.kind !== "snapshot") throw new Error("sin snapshot");
    const changed = next.result.headReport?.files.changed.map((f) => f.path).sort();
    expect(changed).toEqual(["src/a.ts", "src/b.ts"]);
  });
});
