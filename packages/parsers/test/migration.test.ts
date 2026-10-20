import { describe, expect, it } from "vitest";
import {
  buildMigration,
  ffiKindForSpecifier,
  jsIsBridge,
  languageForPath,
  measureRustSource,
  rustIsBridge
} from "../src/migration";

describe("lente de migración", () => {
  it("clasifica extensiones por lenguaje", () => {
    expect(languageForPath("src/a.ts")).toBe("ts");
    expect(languageForPath("src/a.tsx")).toBe("ts");
    expect(languageForPath("src/a.mjs")).toBe("js");
    expect(languageForPath("crates/core/src/lib.rs")).toBe("rust");
    expect(languageForPath("pkg/math.wasm")).toBe("wasm");
    expect(languageForPath("pkg/addon.node")).toBe("node");
    expect(languageForPath("README.md")).toBeNull();
  });

  it("mide Rust ignorando comentarios y respetando strings", () => {
    const source = [
      "fn main() {",
      "    // comentario",
      "    let url = \"https://example.com\";",
      "    /* bloque",
      "       sigue */",
      "    let c = '\"';",
      "    let raw = r#\"a // b\"#;",
      "}"
    ].join("\n");

    expect(measureRustSource(source)).toEqual({ loc: 8, rloc: 5 });
  });

  it("detecta puentes napi y wasm_bindgen", () => {
    expect(rustIsBridge("#[napi]\npub fn add() {}" )).toBe(true);
    expect(rustIsBridge("use napi_derive::napi;")).toBe(true);
    expect(rustIsBridge("#[wasm_bindgen]\npub fn run() {}" )).toBe(true);
    expect(rustIsBridge("pub fn add(a: i32, b: i32) -> i32 { a + b }")).toBe(false);
  });

  it("detecta puentes desde TS/JS y artefactos nativos", () => {
    expect(jsIsBridge("import init from './math.wasm';", ["./math.wasm"])).toBe(true);
    expect(jsIsBridge("const addon = require('./addon.node');", ["./addon.node"])).toBe(true);
    expect(jsIsBridge("WebAssembly.instantiate(bytes);", [])).toBe(true);
    expect(jsIsBridge("import { add } from './domain';", ["./domain"])).toBe(false);

    expect(ffiKindForSpecifier("./math.wasm")).toBe("wasm");
    expect(ffiKindForSpecifier("./math.wasm?url")).toBe("wasm");
    expect(ffiKindForSpecifier("./addon.node")).toBe("native");
    expect(ffiKindForSpecifier("./domain")).toBeNull();
  });

  it("calcula deuda, estados y cruces", () => {
    const migration = buildMigration(
      [
        {
          relativePath: "src/app.ts",
          language: "ts",
          loc: 10,
          rloc: 8,
          maxComplexity: 3,
          fanIn: 2,
          bridge: true
        },
        {
          relativePath: "src/native/lib.rs",
          language: "rust",
          loc: 6,
          rloc: 6,
          maxComplexity: 0,
          fanIn: 0,
          bridge: false
        },
        {
          relativePath: "src/native/math.wasm",
          language: "wasm",
          loc: 0,
          rloc: 0,
          maxComplexity: 0,
          fanIn: 0,
          bridge: false
        }
      ],
      [{ from: "src/app.ts", to: "src/native/math.wasm", kind: "wasm" }]
    );

    expect(migration.nodes.get("src/app.ts")).toMatchObject({
      status: "bridge",
      debt: 12,
      crossings: 1
    });
    expect(migration.nodes.get("src/native/lib.rs")).toMatchObject({
      status: "rust",
      crossings: 0
    });
    expect(migration.nodes.get("src/native/math.wasm")).toMatchObject({
      status: "native",
      crossings: 1
    });
    expect(migration.summary).toMatchObject({
      files: 3,
      bridgeFiles: 1,
      ffiEdges: 1,
      ffiCrossings: 2,
      migrationDebt: 12,
      status: { js: 0, rust: 1, bridge: 1, native: 1 }
    });
    expect(migration.summary.languages).toMatchObject({
      ts: { files: 1, loc: 10, rloc: 8 },
      rust: { files: 1, loc: 6, rloc: 6 },
      wasm: { files: 1, loc: 0, rloc: 0 }
    });
  });
});
