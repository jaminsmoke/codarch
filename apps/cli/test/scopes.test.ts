import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runAnalyze } from "../src/commands/analyze";
import { runScopes } from "../src/commands/scopes";
import { discoverScopes, readScopeRegister } from "../src/scopes";

/**
 * El padre lee hacia abajo: registra los `.codarch/` que tiene debajo y avisa
 * cuando la foto del hijo ya no cuenta lo que hay. Nunca escribe en el hijo
 * (ADR 0089).
 */

const tempRoots: string[] = [];

function tempDir(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-scopes-"));
  tempRoots.push(root);
  return root;
}

function write(file: string, content: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
}

/** Un monorepo pequeño: el hijo tiene su propio `.codarch/`. */
function fixture(): { parent: string; child: string } {
  const parent = tempDir();
  const child = path.join(parent, "apps", "desktop");
  write(path.join(parent, "src", "a.ts"), "export const a = 1;\n");
  write(path.join(child, "src", "b.ts"), "export const b = 2;\n");
  return { parent, child };
}

/** Silencia el análisis y devuelve lo que se imprimió, junto. */
function captured(run: () => number): { code: number; output: string } {
  const lines: string[] = [];
  const log = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    lines.push(args.map(String).join(" "));
  });
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  const code = run();
  log.mockRestore();
  return { code, output: lines.join("\n") };
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("el registro de alcances", () => {
  it("analizar el padre apunta el hijo con su checksum y sus ficheros", () => {
    const { parent, child } = fixture();
    captured(() => runAnalyze({ root: child, help: false, git: false }));
    const childSnapshot = JSON.parse(
      fs.readFileSync(path.join(child, ".codarch", "snapshot.cc.json"), "utf8")
    ) as { meta: { checksum: string } };

    const { output } = captured(() =>
      runAnalyze({ root: parent, help: false, git: false })
    );

    const register = readScopeRegister(path.join(parent, ".codarch"));
    expect(register.map((scope) => scope.path)).toEqual(["apps/desktop"]);
    expect(register[0]?.checksum).toBe(childSnapshot.meta.checksum);
    expect(register[0]?.files).toBe(1);
    expect(output).toContain("1 anidados");
  });

  it("no crea el registro si no hay ningún alcance debajo", () => {
    const { child } = fixture();
    captured(() => runAnalyze({ root: child, help: false, git: false }));
    expect(fs.existsSync(path.join(child, ".codarch", "scopes.json"))).toBe(false);
    expect(readScopeRegister(path.join(child, ".codarch"))).toEqual([]);
  });

  it("no mira el `.codarch/` de la propia raíz", () => {
    const { child } = fixture();
    captured(() => runAnalyze({ root: child, help: false, git: false }));
    expect(discoverScopes(child)).toEqual([]);
  });

  it("no cuenta un alcance dentro de una carpeta ignorada", () => {
    const { parent, child } = fixture();
    captured(() => runAnalyze({ root: child, help: false, git: false }));
    write(path.join(parent, ".gitignore"), "samples/\n");

    const ignored = path.join(parent, "samples", "demo");
    write(path.join(ignored, "src", "e.ts"), "export const e = 6;\n");
    captured(() => runAnalyze({ root: ignored, help: false, git: false }));

    // El padre no mira `samples/`, así que su `.codarch/` no es un alcance suyo.
    expect(discoverScopes(parent).map((scope) => scope.path)).toEqual([
      "apps/desktop"
    ]);
  });

  it("ignora snapshots ilegibles y no baja a node_modules", () => {
    const { parent, child } = fixture();
    captured(() => runAnalyze({ root: child, help: false, git: false }));
    write(
      path.join(parent, "node_modules", "pkg", ".codarch", "snapshot.cc.json"),
      "{ roto"
    );
    write(
      path.join(parent, "roto", ".codarch", "snapshot.cc.json"),
      JSON.stringify({ meta: { apiVersion: "2.0.0" } })
    );

    expect(discoverScopes(parent).map((scope) => scope.path)).toEqual([
      "apps/desktop"
    ]);
  });
});

describe("el listado de alcances", () => {
  it("enseña el alcance y su estado", () => {
    const { parent, child } = fixture();
    captured(() => runAnalyze({ root: child, help: false, git: false }));
    captured(() => runAnalyze({ root: parent, help: false, git: false }));

    const { code, output } = captured(() =>
      runScopes({ root: parent, json: false, help: false })
    );
    expect(code).toBe(0);
    expect(output).toContain("alcances anidados");
    expect(output).toContain("apps/desktop");
    expect(output).toContain("al día");
  });

  it("avisa cuando hay ficheros más nuevos que el snapshot del hijo", () => {
    const { parent, child } = fixture();
    captured(() => runAnalyze({ root: child, help: false, git: false }));
    captured(() => runAnalyze({ root: parent, help: false, git: false }));

    // Un fichero del hijo tocado después de su última foto.
    const file = path.join(child, "src", "b.ts");
    fs.writeFileSync(file, "export const b = 3;\n", "utf8");
    const later = new Date(Date.now() + 60_000);
    fs.utimesSync(file, later, later);

    const { output } = captured(() =>
      runScopes({ root: parent, json: false, help: false })
    );
    expect(output).toContain("ficheros más nuevos");
  });

  it("marca «se analizó otra vez» cuando el hijo tiene otro checksum", () => {
    const { parent, child } = fixture();
    captured(() => runAnalyze({ root: child, help: false, git: false }));
    captured(() => runAnalyze({ root: parent, help: false, git: false }));

    write(path.join(child, "src", "c.ts"), "export const c = 4;\n");
    captured(() => runAnalyze({ root: child, help: false, git: false }));

    const lines: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      lines.push(args.map(String).join(" "));
    });
    expect(runScopes({ root: parent, json: true, help: false })).toBe(0);
    vi.restoreAllMocks();

    const payload = JSON.parse(lines.join("\n")) as {
      scopes: Array<{ path: string; state: string; changed: boolean }>;
    };
    expect(payload.scopes[0]).toMatchObject({
      path: "apps/desktop",
      state: "se analizó otra vez",
      changed: true
    });
  });

  it("marca «nuevo» lo que el padre no había visto", () => {
    const { parent, child } = fixture();
    captured(() => runAnalyze({ root: child, help: false, git: false }));
    captured(() => runAnalyze({ root: parent, help: false, git: false }));

    const other = path.join(parent, "packages", "ui");
    write(path.join(other, "src", "d.ts"), "export const d = 5;\n");
    captured(() => runAnalyze({ root: other, help: false, git: false }));

    const lines: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      lines.push(args.map(String).join(" "));
    });
    expect(runScopes({ root: parent, json: true, help: false })).toBe(0);
    vi.restoreAllMocks();

    const payload = JSON.parse(lines.join("\n")) as {
      scopes: Array<{ path: string; state: string }>;
    };
    const nuevo = payload.scopes.find((scope) => scope.path === "packages/ui");
    expect(nuevo?.state).toBe("nuevo");
  });

  it("no confunde una carpeta que no existe con ningún alcance", () => {
    const missing = path.join(tempDir(), "no-existe");
    const { code } = captured(() =>
      runScopes({ root: missing, json: false, help: false })
    );
    expect(code).toBe(1);
  });
});
