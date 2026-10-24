import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Un instalador sin `app-update.yml` no se actualiza solo. El CI lo comprueba
// después de empaquetar; aquí se prueba el comprobador con paquetes de mentira
// (ADR 0045).

const script = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "scripts",
  "check-desktop-package.mjs"
);

interface Paquete {
  update?: boolean;
  channel?: boolean;
  unpacked?: boolean;
}

function paquete({
  update = true,
  channel = true,
  unpacked = true
}: Paquete = {}): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-paquete-"));
  if (unpacked) {
    const resources = path.join(dir, "win-unpacked", "resources");
    fs.mkdirSync(resources, { recursive: true });
    if (update) {
      fs.writeFileSync(
        path.join(resources, "app-update.yml"),
        [
          "provider: github",
          "owner: jaminsmoke",
          "repo: codarch",
          "updaterCacheDirName: '@codarchdesktop-updater'",
          ""
        ].join("\n")
      );
    }
  }
  if (channel) {
    fs.writeFileSync(
      path.join(dir, "latest.yml"),
      "version: 0.0.0\npath: codarch-0.0.0-setup.exe\n"
    );
  }
  return dir;
}

function comprobar(dir: string): string {
  return execFileSync(process.execPath, [script, dir], { encoding: "utf8" });
}

describe("el paquete del escritorio", () => {
  it("acepta un instalador con sus metadatos de actualización", () => {
    const dir = paquete();
    try {
      expect(comprobar(dir)).toContain("ok ·");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rechaza el instalador que no puede actualizarse", () => {
    const dir = paquete({ update: false });
    try {
      expect(() => comprobar(dir)).toThrow(/app-update\.yml/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rechaza el paquete sin canal de actualización", () => {
    const dir = paquete({ channel: false });
    try {
      expect(() => comprobar(dir)).toThrow(/latest\*?\.yml/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rechaza una carpeta sin app desempaquetada", () => {
    const dir = paquete({ unpacked: false });
    try {
      expect(() => comprobar(dir)).toThrow(/desempaquetada/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
