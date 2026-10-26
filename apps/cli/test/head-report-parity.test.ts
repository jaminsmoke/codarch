import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { forgetHeadReport } from "@codarch/parsers";
import type { DiffReport } from "@codarch/metrics";
import { analyze } from "../../desktop/src/analyze-worker";
import { analyzeState, computeHeadReport } from "../src/commands/serve";

/**
 * Las dos plataformas sobre el mismo repo (ADR 0074).
 *
 * `codarch serve` y el escritorio comparten el flujo en `@codarch/parsers`,
 * pero cada uno lo envuelve a su manera: el servidor refresca y sirve el
 * reporte por HTTP, el proceso de análisis del escritorio lo devuelve con el
 * snapshot. Ya divergieron una vez con copias distintas del flujo; este test
 * fija que sobre el mismo árbol las dos contestan lo mismo.
 */

const tempRoots: string[] = [];

function git(cwd: string, args: string[]): void {
  execFileSync("git", args, { cwd, stdio: "ignore" });
}

function tempRepo(commit = true): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-parity-head-"));
  tempRoots.push(root);
  git(root, ["init", "-q"]);
  git(root, ["config", "user.name", "Test"]);
  git(root, ["config", "user.email", "test@example.com"]);
  fs.mkdirSync(path.join(root, "src"));
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "parity-head" }));
  fs.writeFileSync(path.join(root, "src", "a.ts"), "export const a = 1;\n");
  fs.writeFileSync(path.join(root, "src", "b.ts"), 'import { a } from "./a";\nexport const b = a;\n');
  if (commit) {
    git(root, ["add", "-A"]);
    git(root, ["commit", "-qm", "base"]);
  }
  return root;
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

/**
 * La secuencia real del servidor: refresca la raíz y sirve el reporte, que
 * `/data/head-report.json` devuelve tal cual.
 */
function fromServe(root: string): DiffReport | null {
  analyzeState(root, false);
  return computeHeadReport(root);
}

/** La secuencia real del escritorio: analiza y usa el reporte que vuelve. */
function fromDesktop(root: string): DiffReport | null {
  const response = analyze({ id: 1, root, force: true });
  if (!response.ok) throw new Error(response.error);
  return response.result.headReport;
}

function changedPaths(report: DiffReport | null): string[] {
  const files = report?.files;
  if (!files) return [];
  return [...files.added, ...files.changed, ...files.removed]
    .map((file) => file.path)
    .sort();
}

describe("reporte HEAD · serve y escritorio dicen lo mismo", () => {
  it("sobre el mismo árbol, el mismo reporte", () => {
    const root = tempRepo();
    // Una línea más cambia las métricas de a.ts.
    fs.writeFileSync(path.join(root, "src", "a.ts"), "export const a = 1;\nexport const c = 3;\n");

    const serve = fromServe(root);
    const desktop = fromDesktop(root);

    expect(desktop).not.toBeNull();
    expect(serve).toEqual(desktop);
    expect(changedPaths(serve)).toEqual(["src/a.ts"]);
  });

  it("tras un cambio nuevo, los dos se renuevan igual", () => {
    const root = tempRepo();
    fs.writeFileSync(path.join(root, "src", "a.ts"), "export const a = 1;\nexport const c = 3;\n");
    fromServe(root);

    // El segundo cambio llega con el reporte ya cacheado en las dos: ninguno
    // puede quedarse con el viejo.
    fs.writeFileSync(
      path.join(root, "src", "b.ts"),
      'import { a } from "./a";\nexport const b = a;\nexport const d = 4;\n'
    );

    const desktop = fromDesktop(root);
    const serve = fromServe(root);

    expect(serve).toEqual(desktop);
    expect(changedPaths(desktop)).toEqual(["src/a.ts", "src/b.ts"]);
  });

  it("los dos respetan el mismo alcance del .codarch.yml", () => {
    const root = tempRepo();
    fs.mkdirSync(path.join(root, "src", "skip"));
    fs.writeFileSync(path.join(root, "src", "skip", "x.ts"), "export const x = 1;\n");
    fs.writeFileSync(path.join(root, ".codarch.yml"), "version: 1\nignore:\n  - src/skip/**\n");
    fs.writeFileSync(path.join(root, "src", "a.ts"), "export const a = 1;\nexport const c = 3;\n");
    fs.appendFileSync(path.join(root, "src", "skip", "x.ts"), "export const y = 2;\n");

    const serve = fromServe(root);
    const desktop = fromDesktop(root);

    expect(serve).toEqual(desktop);
    // Lo que el mapa no cuenta, el reporte tampoco.
    expect(changedPaths(desktop)).not.toContain("src/skip/x.ts");
    expect(changedPaths(desktop)).toEqual(["src/a.ts"]);
  });

  it("sin commits, el servidor sirve el reporte que dejó el escritorio", () => {
    const root = tempRepo(false);
    // El escritorio no puede comparar sin HEAD, pero su fichero queda en disco.
    const fromFile = { source: "escritorio", files: { added: [], changed: [], removed: [] } };
    fs.mkdirSync(path.join(root, ".codarch"));
    fs.writeFileSync(path.join(root, ".codarch", "head-report.json"), JSON.stringify(fromFile));

    // El escritorio devuelve `null`: no hay contra qué comparar.
    expect(fromDesktop(root)).toBeNull();
    // El servidor, en cambio, no deja la pestaña vacía: sirve el respaldo.
    expect(computeHeadReport(root)).toEqual(fromFile);
  });

  it("el reporte no depende de quién lo pidió primero", () => {
    const root = tempRepo();
    fs.writeFileSync(path.join(root, "src", "a.ts"), "export const a = 1;\nexport const c = 3;\n");

    const desktopFirst = fromDesktop(root);
    const serveAfter = fromServe(root);
    expect(serveAfter).toEqual(desktopFirst);

    // Y en el orden contrario, con la caché caliente de la otra plataforma.
    forgetHeadReport(root);
    const serveFirst = fromServe(root);
    const desktopAfter = fromDesktop(root);
    expect(desktopAfter).toEqual(serveFirst);
  });
});
