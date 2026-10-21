import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { TypeScriptParser } from "../src/ts/parser";
import { WasmTypeScriptParser } from "../src/ts/wasm-parser";

/**
 * El navegador y el CLI tienen que dar los mismos números.
 *
 * El parser WASM usa las mismas gramáticas que el nativo (el paquete
 * `tree-sitter-typescript` publica los `.wasm` de su misma versión), pero los
 * bindings no son idénticos: el nativo tipa un comentario dentro de un
 * `interface` como `interface_body` y el WASM como `comment`. Por eso la
 * medición detecta comentarios por texto.
 *
 * Este test es la red de seguridad: si las métricas se separan, el checksum
 * del navegador será distinto del CLI y habremos abierto dos verdades.
 */

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const GRAMMAR_ROOT = path.resolve(
  TEST_DIR,
  "../../../node_modules/tree-sitter-typescript"
);
const FIXTURES = path.resolve(TEST_DIR, "fixtures");

async function readGrammar(name: string): Promise<Uint8Array> {
  return new Uint8Array(fs.readFileSync(path.join(GRAMMAR_ROOT, name)));
}

describe("paridad entre el parser nativo y el WASM", () => {
  it("produce las mismas métricas e importaciones", async () => {
    const wasm = await WasmTypeScriptParser.create(
      await readGrammar("tree-sitter-typescript.wasm"),
      await readGrammar("tree-sitter-tsx.wasm")
    );
    const native = new TypeScriptParser();

    const files: string[] = [];
    const walk = (directory: string): void => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) files.push(full);
      }
    };
    walk(FIXTURES);
    expect(files.length).toBeGreaterThan(5);

    for (const file of files) {
      const source = fs.readFileSync(file, "utf8");
      const relative = path.relative(FIXTURES, file);
      const left = native.parse(source, relative);
      const right = wasm.parse(source, relative);
      expect(
        right.metrics,
        `métricas distintas en ${relative}`
      ).toEqual(left.metrics);
      expect(right.imports, `importaciones distintas en ${relative}`).toEqual(
        left.imports
      );
    }
  });

  it("no cuenta como código un comentario dentro de un interface", () => {
    const source = [
      "export interface Detalle {",
      "  /** Un comentario. */",
      "  raices: string;",
      "  otro: number;",
      "}",
      ""
    ].join("\n");
    const native = new TypeScriptParser().parse(source, "detalle.ts");
    // 4 líneas de código: la declaración, sus dos campos y la llave de cierre.
    // El comentario del interface no cuenta.
    expect(native.metrics.rloc).toBe(4);
    expect(native.metrics.loc).toBe(5);
  });
});
