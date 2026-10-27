import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ParseCache, analyzeRepository } from "@codarch/parsers";
import { runAnalyze } from "../src/commands/analyze";
import {
  loadDescendantParseCaches,
  parseCachePath,
  writeParseCache
} from "../src/parse-cache";
import { discoverScopePaths } from "../src/scopes";

/**
 * La caché de parseo de un alcance sirve para que el padre no reparseе lo que
 * ya está parseado, y para nada más: el `cc.json` y su checksum tienen que
 * salir idénticos con caché y sin ella (ADR 0089).
 */

const tempRoots: string[] = [];

function tempDir(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-parse-cache-"));
  tempRoots.push(root);
  return root;
}

function write(file: string, content: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
}

/** Un padre con dos ficheros y un hijo con dos más. */
function fixture(): { parent: string; child: string } {
  const parent = tempDir();
  const child = path.join(parent, "apps", "desktop");
  write(path.join(parent, "src", "a.ts"), "export const a = 1;\n");
  write(path.join(parent, "src", "b.ts"), "export const b = 2;\n");
  write(path.join(child, "src", "c.ts"), "export const c = 3;\n");
  write(path.join(child, "src", "d.ts"), "export const d = 4;\n");
  return { parent, child };
}

/** Analiza el padre con la caché de sus alcances de debajo, si la pide. */
function analyzeParent(parent: string, withChildren: boolean) {
  const cache = new ParseCache();
  let loaded = { scopes: 0, entries: 0 };
  if (withChildren) {
    loaded = loadDescendantParseCaches(cache, parent, discoverScopePaths(parent));
  }
  const result = analyzeRepository(parent, { git: false, cache });
  return { result, loaded };
}

function checksumOf(result: { snapshot: { meta: { checksum?: string } } }): string {
  return result.snapshot.meta.checksum ?? "";
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

describe("la caché de parseo por alcance", () => {
  it("el hijo la deja en su `.codarch/` y el padre reutiliza su parseo", () => {
    silence();
    const { parent, child } = fixture();
    expect(runAnalyze({ root: child, help: false, git: false })).toBe(0);
    expect(fs.existsSync(parseCachePath(path.join(child, ".codarch")))).toBe(true);

    const cold = analyzeParent(parent, false).result;
    const warm = analyzeParent(parent, true);

    expect(warm.loaded.scopes).toBe(1);
    expect(warm.loaded.entries).toBe(2);
    // Los dos ficheros del hijo salen de su caché; los del padre se parsean.
    expect(warm.result.cache.hits).toBe(2);
    expect(warm.result.cache.misses).toBe(2);
    expect(checksumOf(warm.result)).toBe(checksumOf(cold));
  });

  it("una caché de hijo desactualizada no se reutiliza y no cambia el resultado", () => {
    silence();
    const { parent, child } = fixture();
    expect(runAnalyze({ root: child, help: false, git: false })).toBe(0);

    // El fichero del hijo cambia sin volver a analizar el hijo: su caché
    // guarda otra versión, así que esa entrada no vale.
    write(path.join(child, "src", "c.ts"), "export const c = 30;\n");
    const result = analyzeParent(parent, true);

    expect(result.loaded.entries).toBe(2);
    expect(result.result.cache.misses).toBe(3);
    expect(checksumOf(result.result)).toBe(
      checksumOf(analyzeParent(parent, false).result)
    );
  });

  it("ignora una caché de otro formato, de otro parser o de otra raíz", () => {
    silence();
    const { parent, child } = fixture();
    expect(runAnalyze({ root: child, help: false, git: false })).toBe(0);

    const file = parseCachePath(path.join(child, ".codarch"));
    const payload = JSON.parse(fs.readFileSync(file, "utf8")) as {
      root: string;
    };
    payload.root = path.join(parent, "otra", "carpeta");
    fs.writeFileSync(file, JSON.stringify(payload), "utf8");

    const foreign = new ParseCache();
    expect(loadDescendantParseCaches(foreign, parent, discoverScopePaths(parent)))
      .toEqual({ scopes: 0, entries: 0 });

    const cold = analyzeParent(parent, false).result;
    const warm = analyzeParent(parent, true);
    expect(warm.loaded.entries).toBe(0);
    expect(checksumOf(warm.result)).toBe(checksumOf(cold));
  });

  it("el padre guarda su caché con su prefijo y no escribe en la del hijo", () => {
    silence();
    const { parent, child } = fixture();
    expect(runAnalyze({ root: child, help: false, git: false })).toBe(0);
    const childCacheBefore = fs.readFileSync(
      parseCachePath(path.join(child, ".codarch")),
      "utf8"
    );

    expect(runAnalyze({ root: parent, help: false, git: false })).toBe(0);

    const parentCache = JSON.parse(
      fs.readFileSync(parseCachePath(path.join(parent, ".codarch")), "utf8")
    ) as { entries: Record<string, unknown> };
    expect(Object.keys(parentCache.entries).sort()).toEqual([
      "apps/desktop/src/c.ts",
      "apps/desktop/src/d.ts",
      "src/a.ts",
      "src/b.ts"
    ]);
    // La del hijo es suya y sigue como estaba: no se reescribe hacia abajo.
    expect(
      fs.readFileSync(parseCachePath(path.join(child, ".codarch")), "utf8")
    ).toBe(childCacheBefore);
  });

  it("escribir la caché no cambia lo que se guarda en el snapshot", () => {
    silence();
    const { child } = fixture();
    const cache = new ParseCache();
    const result = analyzeRepository(child, { git: false, cache });
    const out = path.join(child, ".codarch");
    writeParseCache(out, child, cache);

    const written = JSON.parse(fs.readFileSync(parseCachePath(out), "utf8")) as {
      root: string;
      entries: Record<string, unknown>;
    };
    expect(written.root).toBe(path.resolve(child));
    expect(Object.keys(written.entries).sort()).toEqual([
      "src/c.ts",
      "src/d.ts"
    ]);
    expect(checksumOf(result)).toBe(
      checksumOf(analyzeRepository(child, { git: false }))
    );
  });
});
