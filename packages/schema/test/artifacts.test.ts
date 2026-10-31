import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  CODARCH_ENTRIES,
  CODARCH_KNOWN,
  CONFIG_FILE_NAMES,
  isCodarchEntry
} from "../src/artifacts";
import { codarchPath, findRepoConfig } from "../src/codarch-path";

const tempRoots: string[] = [];

function tempRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-artifacts-"));
  tempRoots.push(root);
  return root;
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("el registro de nombres", () => {
  it("no repite un nombre para dos papeles", () => {
    // Dos papeles con el mismo fichero es un nombre que miente: uno de los dos
    // escribiría encima del otro.
    const names = CODARCH_KNOWN;
    expect(new Set(names).size).toBe(names.length);
  });

  it("ningún nombre es una ruta", () => {
    for (const name of [...CODARCH_KNOWN, ...CONFIG_FILE_NAMES]) {
      expect(name).toBe(path.basename(name));
    }
  });

  it("la configuración no es una entrada de la carpeta", () => {
    // `.codarch.yml` se versiona y vive en la raíz: no se limpia con el estado.
    for (const name of CONFIG_FILE_NAMES) {
      expect(isCodarchEntry(name)).toBe(false);
    }
    expect(isCodarchEntry(CODARCH_ENTRIES.snapshot)).toBe(true);
  });
});

describe("la configuración del repo", () => {
  it("prefiere `.codarch.yml` cuando están los dos", () => {
    const root = tempRoot();
    fs.writeFileSync(path.join(root, ".codarch.yaml"), "version: 1\n");
    fs.writeFileSync(path.join(root, ".codarch.yml"), "version: 1\n");
    expect(findRepoConfig(root)).toBe(path.join(root, ".codarch.yml"));
  });

  it("encuentra `.codarch.yaml` cuando es el único", () => {
    const root = tempRoot();
    fs.writeFileSync(path.join(root, ".codarch.yaml"), "version: 1\n");
    expect(findRepoConfig(root)).toBe(path.join(root, ".codarch.yaml"));
  });

  it("sin configuración devuelve null", () => {
    expect(findRepoConfig(tempRoot())).toBeNull();
  });

  it("compone las rutas de la carpeta en un solo sitio", () => {
    expect(codarchPath("/repo", CODARCH_ENTRIES.report)).toBe(
      path.join("/repo", ".codarch", "report.json")
    );
  });
});
