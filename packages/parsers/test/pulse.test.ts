import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  AnalysisSession,
  ChangeGate,
  analyzeRepository,
  gitStatus
} from "../src/index";

// El pulso del live (ADR 0056): un aviso del vigilante no siempre es un cambio.
// Con git, `git status` dice qué difiere de HEAD y lo que git ignora no cuenta;
// sin git, manda la versión (tamaño:mtime) de lo que avisó el vigilante.

const tempRoots: string[] = [];

function tempRepo(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-pulse-"));
  tempRoots.push(root);
  fs.mkdirSync(path.join(root, "src"));
  fs.writeFileSync(path.join(root, "package.json"), '{"name":"pulse"}\n');
  fs.writeFileSync(path.join(root, "src", "a.ts"), "export const a = 1;\n");
  fs.writeFileSync(path.join(root, "src", "b.ts"), "export const b = 2;\n");
  return root;
}

function git(root: string, args: string[]): void {
  execFileSync("git", args, { cwd: root, stdio: "ignore" });
}

function initRepo(root: string): void {
  git(root, ["init", "-q"]);
  git(root, ["config", "user.name", "Test"]);
  git(root, ["config", "user.email", "test@example.com"]);
  git(root, ["add", "."]);
  git(root, ["commit", "-q", "-m", "primero"]);
}

/** Escribe y mueve la fecha: una versión nueva aunque pese lo mismo. */
function escribir(file: string, content: string): void {
  fs.writeFileSync(file, content, "utf8");
  const later = new Date(Date.now() + 2000);
  fs.utimesSync(file, later, later);
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("gitStatus", () => {
  it("lista modificados, altas, bajas y renombrados con su commit", () => {
    const root = tempRepo();
    initRepo(root);

    escribir(path.join(root, "src", "a.ts"), "export const a = 2;\n");
    escribir(path.join(root, "src", "c.ts"), "export const c = 3;\n");
    fs.rmSync(path.join(root, "src", "b.ts"));
    git(root, ["mv", "src/a.ts", "src/aa.ts"]);

    const status = gitStatus(root);
    expect(status.available).toBe(true);
    expect(status.head).toMatch(/^[0-9a-f]{40}$/);
    const byPath = new Map(status.changes.map((change) => [change.path, change.kind]));
    expect(byPath.get("src/aa.ts")).toBe("renamed");
    expect(byPath.get("src/a.ts")).toBe("deleted");
    expect(byPath.get("src/b.ts")).toBe("deleted");
    expect(byPath.get("src/c.ts")).toBe("untracked");
  });

  it("se declara no disponible fuera de un repositorio", () => {
    const root = tempRepo();
    const status = gitStatus(root);
    expect(status.available).toBe(false);
    expect(status.changes).toEqual([]);
    expect(status.warnings.join("\n")).toContain("estado de git");
  });
});

describe("el pulso con git", () => {
  it("no se repite cuando nada ha cambiado", () => {
    const root = tempRepo();
    initRepo(root);
    const gate = new ChangeGate();

    expect(gate.check(root).fresh).toBe(true);
    expect(gate.check(root).fresh).toBe(false);
    expect(gate.check(root).fresh).toBe(false);
  });

  it("analiza un guardado y no un `git add`", () => {
    const root = tempRepo();
    initRepo(root);
    const gate = new ChangeGate();
    gate.check(root);

    escribir(path.join(root, "src", "a.ts"), "export const a = 20;\n");
    expect(gate.check(root).fresh).toBe(true);

    // El índice cambia, el contenido no: el mapa no vería nada distinto.
    git(root, ["add", "."]);
    expect(gate.check(root).fresh).toBe(false);
  });

  it("analiza un commit, que no toca el árbol de trabajo", () => {
    const root = tempRepo();
    initRepo(root);
    const gate = new ChangeGate();
    gate.check(root);

    escribir(path.join(root, "src", "a.ts"), "export const a = 30;\n");
    git(root, ["add", "."]);
    git(root, ["commit", "-q", "-m", "segundo"]);

    const pulse = gate.check(root);
    expect(pulse.fresh).toBe(true);
    expect(pulse.source).toBe("git");
  });

  it("sigue viendo una carpeta que el repo padre ignora", () => {
    const root = tempRepo();
    fs.writeFileSync(path.join(root, ".gitignore"), "generado/\n");
    initRepo(root);
    // Una carpeta dentro del repo pero ignorada: git no dice nada de ella, y
    // aun así se analiza y se guarda. Su aviso tiene que contar.
    const generado = path.join(root, "generado");
    fs.mkdirSync(generado);
    fs.writeFileSync(path.join(generado, "a.ts"), "export const a = 1;\n");

    const gate = new ChangeGate();
    expect(gate.check(generado).fresh).toBe(true);
    expect(gate.check(generado).fresh).toBe(false);

    escribir(path.join(generado, "a.ts"), "export const a = 2;\n");
    expect(gate.check(generado, ["a.ts"]).fresh).toBe(true);
    expect(gate.check(generado, ["a.ts"]).fresh).toBe(false);
  });

  it("no se despierta con lo que git ignora", () => {
    const root = tempRepo();
    fs.writeFileSync(path.join(root, ".gitignore"), "dist/\n");
    initRepo(root);
    const gate = new ChangeGate();
    gate.check(root);

    fs.mkdirSync(path.join(root, "dist"));
    fs.writeFileSync(path.join(root, "dist", "app.js"), "console.log(1);\n");

    expect(gate.check(root).fresh).toBe(false);
  });
});

describe("el pulso sin git", () => {
  it("compara la versión de lo que avisó el vigilante", () => {
    const root = tempRepo();
    const gate = new ChangeGate();

    escribir(path.join(root, "src", "a.ts"), "export const a = 4;\n");
    expect(gate.check(root, [path.join("src", "a.ts")]).fresh).toBe(true);
    expect(gate.check(root, [path.join("src", "a.ts")]).fresh).toBe(false);

    escribir(path.join(root, "src", "a.ts"), "export const a = 5;\n");
    expect(gate.check(root, [path.join("src", "a.ts")]).fresh).toBe(true);
  });

  it("no hace nada con un aviso de una carpeta que no se analiza", () => {
    const root = tempRepo();
    const gate = new ChangeGate();
    expect(
      gate.check(root, [path.join("node_modules", "x", "index.js")]).fresh
    ).toBe(false);
  });

  it("analiza un alta que no estaba en la lista anterior", () => {
    const root = tempRepo();
    const gate = new ChangeGate();
    escribir(path.join(root, "src", "nuevo.ts"), "export const n = 1;\n");
    expect(gate.check(root, [path.join("src", "nuevo.ts")]).fresh).toBe(true);
  });
});

describe("la sesión de análisis", () => {
  it("no analiza si el pulso no trae nada y es idéntica a un análisis completo", () => {
    const root = tempRepo();
    initRepo(root);
    const session = new AnalysisSession(root, { git: true });

    const primero = session.analyze();
    expect(session.refresh()).toBeNull();

    // Una función nueva: cambia el snapshot de verdad (símbolos y métricas).
    escribir(
      path.join(root, "src", "a.ts"),
      "export function a(value: number) {\n  return value > 0 ? value : -value;\n}\n"
    );
    const segundo = session.refresh();
    expect(segundo).not.toBeNull();
    expect(segundo?.snapshot).toEqual(
      analyzeRepository(root, { git: true }).snapshot
    );
    expect(segundo?.snapshot.meta.checksum).not.toBe(
      primero.snapshot.meta.checksum
    );
    expect(session.checksum).toBe(segundo?.snapshot.meta.checksum);
  });

  it("sin git usa las pistas del vigilante", () => {
    const root = tempRepo();
    const session = new AnalysisSession(root, { git: false });
    session.analyze();

    // Sin pistas no hay nada que comparar: no se analiza.
    expect(session.refresh()).toBeNull();

    escribir(path.join(root, "src", "a.ts"), "export const a = 7;\n");
    expect(session.refresh([path.join("src", "a.ts")])).not.toBeNull();
    expect(session.refresh([path.join("src", "a.ts")])).toBeNull();
  });
});
