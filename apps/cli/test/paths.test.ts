import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runAnalyze } from "../src/commands/analyze";
import { runDiff } from "../src/commands/diff";
import { runHistory } from "../src/commands/history";
import { runInspect } from "../src/commands/inspect";
import { readCodarchJson, runServe } from "../src/commands/serve";

/**
 * Una ruta mal escrita no se crea ni se sirve.
 *
 * Cada comando contestaba con su propio mensaje cuando el fichero o la carpeta
 * no estaban —o, peor, creaba la carpeta del `mkdir` recursivo—, así que aquí
 * se fija el contrato: motivo claro y código 1, sin tocar el disco.
 */

const tempRoots: string[] = [];

function tempDir(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-paths-"));
  tempRoots.push(root);
  return root;
}

function silence(): void {
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("rutas que no existen", () => {
  it("analyze no crea la carpeta que falta", () => {
    silence();
    const missing = path.join(tempDir(), "no-existe");

    expect(runAnalyze({ root: missing, help: false })).toBe(1);
    expect(fs.existsSync(missing)).toBe(false);
  });

  it("serve no arranca sobre una carpeta que falta", () => {
    silence();
    const missing = path.join(tempDir(), "no-existe");

    expect(
      runServe({
        root: missing,
        port: 4188,
        host: "127.0.0.1",
        watch: false,
        web: false,
        help: false
      })
    ).toBe(1);
  });

  it("history distingue una carpeta que falta de un historial vacío", () => {
    silence();
    const missing = path.join(tempDir(), "no-existe");

    expect(runHistory({ root: missing, json: false, help: false })).toBe(1);
  });
});

describe("una carpeta donde se espera un fichero", () => {
  it("inspect dice qué necesita en vez de un EISDIR", () => {
    silence();
    const folder = tempDir();
    const error = vi.spyOn(console, "error");

    expect(
      runInspect({ file: folder, json: false, top: 5, help: false })
    ).toBe(1);
    expect(error.mock.calls[0]?.[0]).toContain("necesita un fichero cc.json");
    expect(error.mock.calls[0]?.[0]).toContain("es una carpeta");
  });

  it("diff rechaza las carpetas como snapshots y no escribe reporte", () => {
    silence();
    const folder = tempDir();
    const error = vi.spyOn(console, "error");
    const report = path.join(folder, "report.json");

    expect(runDiff({ base: folder, head: folder, out: report, help: false })).toBe(
      1
    );
    expect(error.mock.calls[0]?.[0]).toContain("es una carpeta");
    // Un diff que no llega a comparar no deja un report.json a medias.
    expect(fs.existsSync(report)).toBe(false);
  });
});

describe("el HEAD que sirve serve (ADR 0072)", () => {
  it("lee head-report.json de .codarch y devuelve null si no existe", () => {
    const root = tempDir();
    const codarch = path.join(root, ".codarch");
    fs.mkdirSync(codarch);
    const report = { schemaVersion: "1.3", summary: { changedFiles: 1 } };
    fs.writeFileSync(path.join(codarch, "head-report.json"), JSON.stringify(report));

    expect(readCodarchJson(root, "head-report.json")).toEqual(report);
    // Sin el fichero, la ruta contesta 204: aquí, null.
    expect(readCodarchJson(tempDir(), "head-report.json")).toBeNull();
  });

  it("no toca report.json: el HEAD vive en su propio fichero", () => {
    const root = tempDir();
    const codarch = path.join(root, ".codarch");
    fs.mkdirSync(codarch);
    const served = { schemaVersion: "1.3", from: "serve" };
    fs.writeFileSync(path.join(codarch, "report.json"), JSON.stringify(served));
    fs.writeFileSync(path.join(codarch, "head-report.json"), JSON.stringify({ from: "head" }));

    expect(readCodarchJson(root, "report.json")).toEqual(served);
  });
});

describe("un repo de un lenguaje que el análisis no lee", () => {
  it("analyze avisa, falla y no dice «sin git»", () => {
    silence();
    const root = tempDir();
    // Ruby no está en la hornada de lenguajes (ADR 0090): sigue sin mapa.
    fs.writeFileSync(path.join(root, "app.rb"), "puts 'hola'\n", "utf8");
    const log = vi.spyOn(console, "log");
    const warning = vi.spyOn(console, "warn");

    // Un mapa vacío no es un análisis correcto: código 1.
    expect(runAnalyze({ root, help: false })).toBe(1);
    expect(
      warning.mock.calls.some(([message]) =>
        String(message).includes("el snapshot sale vacío")
      )
    ).toBe(true);
    const lines = log.mock.calls.map(([line]) => String(line)).join("\n");
    expect(lines).toContain("sin ficheros que analizar");
    expect(lines).not.toContain("sin git");
  });

  it("un repo solo de Python ya no sale vacío", () => {
    silence();
    const root = tempDir();
    fs.writeFileSync(path.join(root, "app.py"), "def saluda():\n  return 1\n", "utf8");
    const warning = vi.spyOn(console, "warn");

    expect(runAnalyze({ root, help: false })).toBe(0);
    expect(
      warning.mock.calls.some(([message]) =>
        String(message).includes("el snapshot sale vacío")
      )
    ).toBe(false);
  });
});
