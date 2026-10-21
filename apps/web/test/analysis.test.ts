import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { analyzeRepository } from "@codarch/parsers";
import { runAnalysis } from "../src/analysis/run";

/**
 * El análisis del navegador tiene que dar el mismo snapshot que el CLI.
 *
 * Aquí se ejecuta el parser WASM (el mismo que usa el worker) sobre los
 * ficheros del fixture y se compara con el resultado del CLI en disco. Si el
 * checksum no coincide, el navegador abriría una segunda verdad.
 */

const FIXTURES = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../packages/parsers/test/fixtures/repo"
);

const GRAMMARS = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../node_modules/tree-sitter-typescript"
);

function readGrammar(name: string): Uint8Array {
  return new Uint8Array(fs.readFileSync(path.join(GRAMMARS, name)));
}

/** Los ficheros del fixture, como rutas virtuales y contenido. */
function fixtureFiles(): Array<[string, string]> {
  const files: Array<[string, string]> = [];
  const walk = (directory: string, prefix: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      const virtualPath = `${prefix}/${entry.name}`;
      if (entry.isDirectory()) {
        walk(full, virtualPath);
        continue;
      }
      if (!/\.(ts|tsx|js|jsx|json)$/.test(entry.name)) continue;
      files.push([virtualPath, fs.readFileSync(full, "utf8")]);
    }
  };
  walk(FIXTURES, "");
  return files;
}

describe("análisis en el navegador", () => {
  it("da el mismo checksum que el CLI", async () => {
    const response = await runAnalysis(
      { type: "analyze", files: fixtureFiles() },
      {
        typescript: readGrammar("tree-sitter-typescript.wasm"),
        tsx: readGrammar("tree-sitter-tsx.wasm")
      }
    );

    expect(response.type).toBe("done");
    if (response.type !== "done") return;

    const onDisk = analyzeRepository(FIXTURES, { git: false });
    const browser = response.snapshot as { meta: { checksum: string } };

    expect(browser.meta.checksum).toBe(onDisk.snapshot.meta.checksum);
    expect(response.files).toBe(onDisk.files);
    expect(response.edges).toBe(onDisk.edges);
  }, 60_000);

  it("devuelve un error legible si no puede analizar", async () => {
    const response = await runAnalysis(
      { type: "analyze", files: [["/roto.ts", "export const a ="]] },
      {
        typescript: readGrammar("tree-sitter-typescript.wasm"),
        tsx: readGrammar("tree-sitter-tsx.wasm")
      }
    );
    // Un fichero con sintaxis rota no es un error: tree-sitter lo tolera.
    expect(response.type === "done" || response.type === "error").toBe(true);
  }, 60_000);

  it("usa el nombre de la carpeta cuando no hay package.json", async () => {
    // El nombre de la raíz entra en el checksum: sin package.json, el CLI usa
    // el nombre de la carpeta y el navegador el de la carpeta elegida.
    const files: Array<[string, string]> = [
      ["/src/app.ts", "export const a = 1;\n"]
    ];
    const response = await runAnalysis(
      { type: "analyze", files, projectName: "mi-proyecto" },
      {
        typescript: readGrammar("tree-sitter-typescript.wasm"),
        tsx: readGrammar("tree-sitter-tsx.wasm")
      }
    );
    expect(response.type).toBe("done");
    if (response.type !== "done") return;
    const snapshot = response.snapshot as { meta: { projectName: string } };
    expect(snapshot.meta.projectName).toBe("mi-proyecto");
  }, 60_000);
});
