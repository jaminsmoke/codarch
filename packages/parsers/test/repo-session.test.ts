import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { analyzeRepo, headReportFor } from "../src/index";

const tempRoots: string[] = [];

function tempRepo(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-session-"));
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

function writeProject(root: string): void {
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({ name: "sesion-repo" }),
    "utf8"
  );
  fs.writeFileSync(path.join(root, "src", "a.ts"), "export const a = 1;\n", "utf8");
  fs.writeFileSync(path.join(root, "src", "b.ts"), "export const b = 2;\n", "utf8");
}

function commitAll(root: string, message: string): void {
  git(root, ["add", "."]);
  git(root, ["commit", "-q", "-m", message]);
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("analyzeRepo", () => {
  it("descarta el reporte HEAD anterior cuando hay análisis nuevo", () => {
    const root = tempRepo();
    initRepo(root);
    writeProject(root);
    commitAll(root, "primero");

    const first = analyzeRepo(root, { force: true });
    expect(first.kind).toBe("snapshot");
    if (first.kind !== "snapshot") return;

    // Sin cambios pendientes no hay nada que comparar.
    const empty = headReportFor(root);
    expect(empty?.files.changed ?? []).toHaveLength(0);

    // Una línea más cambia `rloc`: el diff lo ve.
    fs.writeFileSync(
      path.join(root, "src", "a.ts"),
      "export const a = 1;\nexport const doble = 2;\n",
      "utf8"
    );
    const second = analyzeRepo(root, { force: true });
    expect(second.kind).toBe("snapshot");
    if (second.kind !== "snapshot") return;

    const report = headReportFor(root);
    expect(report?.files.changed.map((file) => file.path)).toContain("src/a.ts");
    // Solo cambió ese fichero, y el reporte lo cuenta como tal.
    expect(report?.summary.changedFiles).toBe(1);
    expect(report?.summary.addedFiles).toBe(0);
    expect(report?.summary.removedFiles).toBe(0);
  });

  it("el reporte respeta el alcance del repo", () => {
    const root = tempRepo();
    initRepo(root);
    writeProject(root);
    fs.mkdirSync(path.join(root, "generado"));
    fs.writeFileSync(
      path.join(root, ".codarch.yml"),
      "version: 1\nignore:\n  - generado/**\n",
      "utf8"
    );
    commitAll(root, "primero");

    fs.writeFileSync(
      path.join(root, "generado", "grande.ts"),
      "export const a = 1;\nexport const b = 2;\n",
      "utf8"
    );
    analyzeRepo(root, { force: true });

    // Lo que el mapa no cuenta no puede salir como cambio en Cambios.
    const report = headReportFor(root);
    expect(report?.files.added).toHaveLength(0);
    expect(report?.files.changed).toHaveLength(0);
  });

  it("guarda el reporte hasta que el árbol cambia", () => {
    const root = tempRepo();
    initRepo(root);
    writeProject(root);
    commitAll(root, "primero");

    analyzeRepo(root, { force: true });
    const first = headReportFor(root);
    expect(first).not.toBeNull();
    // Misma llamada, mismo objeto: el export del HEAD no se repite.
    expect(headReportFor(root)).toBe(first);

    analyzeRepo(root, { force: true });
    expect(headReportFor(root)).not.toBe(first);
  });

  it("contesta unchanged cuando el pulso no trae nada nuevo", () => {
    const root = tempRepo();
    initRepo(root);
    writeProject(root);
    commitAll(root, "primero");

    const first = analyzeRepo(root);
    expect(first.kind).toBe("snapshot");

    const again = analyzeRepo(root);
    expect(again.kind).toBe("unchanged");

    // Un fichero tocado sí vuelve a analizar.
    fs.writeFileSync(path.join(root, "src", "b.ts"), "export const b = 3;\n", "utf8");
    const after = analyzeRepo(root, { hints: ["src/b.ts"] });
    expect(after.kind).toBe("snapshot");
    if (after.kind !== "snapshot") return;
    expect(after.files).toBe(2);
  });

  it("aplica el alcance del .codarch.yml y es determinista", () => {
    const root = tempRepo();
    initRepo(root);
    writeProject(root);
    fs.mkdirSync(path.join(root, "generado"));
    fs.writeFileSync(
      path.join(root, "generado", "grande.ts"),
      "export const generado = 1;\n",
      "utf8"
    );
    fs.writeFileSync(
      path.join(root, ".codarch.yml"),
      "version: 1\nignore:\n  - generado/**\n",
      "utf8"
    );
    commitAll(root, "primero");

    const first = analyzeRepo(root, { force: true });
    const second = analyzeRepo(root, { force: true });
    expect(first.kind).toBe("snapshot");
    expect(second.kind).toBe("snapshot");
    if (first.kind !== "snapshot" || second.kind !== "snapshot") return;

    expect(first.snapshot.meta.checksum).toBe(second.snapshot.meta.checksum);
    expect(first.files).toBe(2);
    // El alcance se leyó: nada de avisos por el `.codarch.yml`.
    expect(first.warnings).toEqual([]);
  });
});
