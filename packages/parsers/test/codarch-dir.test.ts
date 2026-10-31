import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { sweepCodarch } from "../src/codarch-dir";

const tempRoots: string[] = [];

function tempRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-dir-"));
  tempRoots.push(root);
  return root;
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("la limpieza de .codarch", () => {
  it("conserva lo del producto y borra lo demás", () => {
    const root = tempRoot();
    const codarch = path.join(root, ".codarch");
    fs.mkdirSync(path.join(codarch, "shots"), { recursive: true });
    fs.mkdirSync(path.join(codarch, "backup"), { recursive: true });
    for (const name of [
      "snapshot.cc.json",
      "rest.cc.json",
      "report.json",
      "head-report.json",
      "lint.repmod.json",
      "lint-cache.json",
      "chains.json",
      "scopes.json",
      "parse-cache.json",
      "preferences.json"
    ]) {
      fs.writeFileSync(path.join(codarch, name), "{}");
    }
    fs.writeFileSync(path.join(codarch, "shots", "map-1.png"), "png");
    fs.writeFileSync(path.join(codarch, "backup", "viejo.json"), "{}");
    fs.writeFileSync(path.join(codarch, "lint.json"), "{}");

    expect(sweepCodarch(root)).toEqual(["backup", "lint.json"]);

    expect(fs.readdirSync(codarch).sort()).toEqual([
      "chains.json",
      "head-report.json",
      "lint-cache.json",
      "lint.repmod.json",
      "parse-cache.json",
      "preferences.json",
      "report.json",
      "rest.cc.json",
      "scopes.json",
      "shots",
      "snapshot.cc.json"
    ]);
    // Lo que no es una entrada conocida se va con su contenido, y lo que sí lo
    // es se queda con el suyo.
    expect(fs.existsSync(path.join(codarch, "shots", "map-1.png"))).toBe(true);
  });

  it("no crea la carpeta para dejarla vacía", () => {
    const root = tempRoot();
    expect(sweepCodarch(root)).toEqual([]);
    expect(fs.existsSync(path.join(root, ".codarch"))).toBe(false);
  });

  it("devuelve los nombres ordenados, para que el aviso sea estable", () => {
    const root = tempRoot();
    const codarch = path.join(root, ".codarch");
    fs.mkdirSync(codarch, { recursive: true });
    for (const name of ["zeta.txt", "alfa.txt", "Mapa.html"]) {
      fs.writeFileSync(path.join(codarch, name), "");
    }
    expect(sweepCodarch(root)).toEqual(["Mapa.html", "alfa.txt", "zeta.txt"]);
  });
});
