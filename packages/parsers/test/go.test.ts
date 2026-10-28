import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { fileId, parseCcJson } from "@codarch/schema";
import { analyzeFiles } from "../src/analyze-core";
import { ParseCache } from "../src/cache";
import { MemoryFileSystem } from "../src/fs";
import { analyzeRepository } from "../src/analyze";
import { GoParser } from "../src/go/parser";
import { goImportTargets, readGoModule } from "../src/go/imports";
import { WasmGoParser } from "../src/go/wasm-parser";
import { NodeFileSystem } from "../src/node-fs";
import { serializeParseCache } from "../src/parse-cache-store";
import type { SourceParser } from "../src/types";

/**
 * Go de punta a punta (ADR 0090): métricas, símbolos, miembros, y un import que
 * son **varias** aristas porque Go importa paquetes y no ficheros.
 *
 * `cc.json` no cambia: un fichero `.go` es un nodo con sus métricas y sus
 * símbolos, sin estado de migración, porque la lente sigue siendo JS/TS → Rust.
 */

const SAMPLE = `package billing

import (
	"fmt"
	"acme/internal/money"
)

const Limit = 10
var a, b int = 1, 2

type Invoice struct {
	Total int
	Owner string
}

type Store interface {
	Save(inv Invoice) error
}

type ID int

func (s *Store) Get(id ID) (Invoice, error) {
	if id > 0 && id < 3 {
		return Invoice{}, nil
	}
	for i := 0; i < 3; i++ {
		_ = i
	}
	switch id {
	case 1:
		return Invoice{}, nil
	default:
		return Invoice{}, nil
	}
	select {
	case <-done:
	}
	return Invoice{}, fmt.Errorf("x")
}

func Free(x int) int {
	return x
}
`;

const tempRoots: string[] = [];

function tempDir(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-go-"));
  tempRoots.push(root);
  return root;
}

function write(file: string, content: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

/** Un repo Go con módulo: un paquete de dos ficheros y un import roto. */
function goProject(): MemoryFileSystem {
  return new MemoryFileSystem([
    ["/go.mod", "module example.com/acme\n\ngo 1.22\n"],
    [
      "/internal/money/money.go",
      "package money\n\ntype Money struct {\n\tCents int\n}\n"
    ],
    [
      "/internal/money/tax.go",
      "package money\n\nconst Rate = 21\n"
    ],
    [
      "/internal/billing/billing.go",
      [
        "package billing",
        "",
        "import (",
        '\t"fmt"',
        '\t"example.com/acme/internal/money"',
        '\t"example.com/acme/internal/gone"',
        '\t"github.com/stretchr/testify/assert"',
        ")",
        "",
        "func Total(m money.Money) int {",
        "\treturn m.Cents",
        "}",
        ""
      ].join("\n")
    ]
  ]);
}

function analyzeProject(
  parsers: SourceParser[] = [new GoParser()],
  fileSystem = goProject()
) {
  return analyzeFiles({
    fileSystem,
    root: "/",
    projectName: "proyecto",
    parsers
  });
}

function grammarBytes(): Uint8Array {
  return new Uint8Array(
    fs.readFileSync(
      path.resolve(
        import.meta.dirname,
        "..",
        "..",
        "..",
        "node_modules",
        "tree-sitter-go",
        "tree-sitter-go.wasm"
      )
    )
  );
}

describe("el parser de Go", () => {
  it("mide métricas, símbolos, miembros e imports en un solo recorrido", () => {
    const result = new GoParser().parse(SAMPLE);

    // loc cuenta las 43 líneas; de ellas, siete están en blanco.
    expect(result.metrics).toEqual({
      loc: 43,
      rloc: 36,
      functions: 2,
      maxComplexity: 6,
      maxFunctionLength: 18
    });

    expect(
      result.symbols?.map((symbol) => [symbol.name, symbol.kind, symbol.line])
    ).toEqual([
      ["Limit", "variable", 8],
      ["a", "variable", 9],
      ["b", "variable", 9],
      ["Invoice", "class", 11],
      ["Store", "interface", 16],
      ["ID", "type", 20],
      ["Get", "function", 22],
      ["Free", "function", 41]
    ]);
    // if, `&&`, for, el `case` del switch y el del select.
    expect(result.symbols?.find((symbol) => symbol.name === "Get")).toMatchObject({
      complexity: 6,
      lines: 18
    });

    expect(result.members).toEqual([
      { owner: "Invoice", name: "Total", line: 12, lines: 1, from: "field" },
      { owner: "Invoice", name: "Owner", line: 13, lines: 1, from: "field" }
    ]);

    expect(
      result.imports.map((entry) => [entry.specifier, entry.line])
    ).toEqual([
      ["fmt", 4],
      ["acme/internal/money", 5]
    ]);
  });

  it("no publica superficie de exportación: en Go publica la mayúscula", () => {
    expect(new GoParser().parse(SAMPLE).exports).toBeUndefined();
  });

  it("el hash del símbolo no cambia al renombrarlo", () => {
    const before = new GoParser().parse(
      "package a\n\nfunc Add(x int) int {\n\treturn x + 1\n}\n"
    );
    const after = new GoParser().parse(
      "package a\n\nfunc Sum(x int) int {\n\treturn x + 1\n}\n"
    );
    expect(after.symbols?.[0]?.hash).toBe(before.symbols?.[0]?.hash);
  });
});

describe("los imports de Go", () => {
  it("con módulo, el import es una carpeta del repositorio", () => {
    expect(goImportTargets("example.com/acme/internal/billing", "example.com/acme"))
      .toEqual({
        kind: "package",
        directories: ["internal/billing"],
        extensions: [".go"],
        required: true
      });
    // El propio módulo es la carpeta raíz.
    expect(goImportTargets("example.com/acme", "example.com/acme")).toEqual({
      kind: "package",
      directories: [""],
      extensions: [".go"],
      required: true
    });
  });

  it("con módulo, lo que no es del módulo es de fuera", () => {
    // La biblioteca estándar no lleva punto en su primer segmento.
    expect(goImportTargets("fmt", "example.com/acme")).toEqual({
      kind: "external",
      builtin: true
    });
    expect(goImportTargets("net/http", "example.com/acme")).toEqual({
      kind: "external",
      builtin: true
    });
    expect(
      goImportTargets("github.com/stretchr/testify/assert", "example.com/acme")
    ).toEqual({ kind: "external", builtin: false });
  });

  it("sin go.mod se prueba el sufijo del import", () => {
    expect(goImportTargets("github.com/acme/x/internal/billing", null)).toEqual({
      kind: "package",
      directories: [
        "github.com/acme/x/internal/billing",
        "acme/x/internal/billing",
        "x/internal/billing",
        "internal/billing",
        "billing"
      ],
      extensions: [".go"],
      builtin: false
    });
  });

  it("lee el nombre del módulo del go.mod", () => {
    expect(readGoModule("module example.com/acme\n\ngo 1.22\n")).toBe(
      "example.com/acme"
    );
    expect(readGoModule('module "example.com/acme" // comentario\n')).toBe(
      "example.com/acme"
    );
    expect(readGoModule("\n  // sin módulo\n")).toBeNull();
    expect(readGoModule(null)).toBeNull();
  });
});

describe("el análisis de un proyecto Go", () => {
  it("un import de paquete deja una arista por fichero", () => {
    const result = analyzeProject();

    expect(result.files).toBe(3);
    // money.go y tax.go son el mismo paquete: el import depende de los dos.
    expect(result.edges).toBe(2);
    expect(result.migration.files).toBe(0);

    const cc = parseCcJson(result.snapshot);
    const billing = cc.lenses?.metrics?.attributes?.[
      fileId("internal/billing/billing.go")
    ];
    expect(billing).toMatchObject({ loc: 12, functions: 1, fanOut: 2 });
    expect(billing?.migrationDebt).toBeUndefined();
  });

  it("distingue paquete del módulo, import roto y dependencia", () => {
    const result = analyzeProject();

    expect(result.builtinImports).toBe(1);
    expect(result.externalImports).toBe(1);
    // `example.com/acme/internal/gone` es del módulo y la carpeta no está.
    expect(result.unresolvedImports).toBe(1);
    expect(result.unresolved[0]).toMatchObject({
      file: "internal/billing/billing.go",
      line: 6,
      specifier: "example.com/acme/internal/gone",
      reason: "no se encontró el paquete"
    });
  });

  it("es determinista: dos pasadas dan el mismo checksum", () => {
    expect(analyzeProject().snapshot.meta.checksum).toBe(
      analyzeProject().snapshot.meta.checksum
    );
  });

  it("`analyzeRepository` lo analiza sin decirle nada más", () => {
    const root = tempDir();
    write(path.join(root, "go.mod"), "module acme\n");
    write(path.join(root, "internal", "money", "money.go"), "package money\n\ntype Money struct{}\n");
    write(
      path.join(root, "internal", "billing", "billing.go"),
      'package billing\n\nimport "acme/internal/money"\n\nfunc Total() money.Money {\n\treturn money.Money{}\n}\n'
    );

    const first = analyzeRepository(root, { git: false });
    const second = analyzeRepository(root, { git: false });

    expect(first.files).toBe(2);
    expect(first.edges).toBe(1);
    expect(second.snapshot).toEqual(first.snapshot);
  });

  it("guarda el parseo firmado con el parser de Go y lo reutiliza", () => {
    const root = tempDir();
    write(path.join(root, "go.mod"), "module acme\n");
    write(path.join(root, "money", "money.go"), "package money\n\ntype Money struct{}\n");
    write(
      path.join(root, "billing", "billing.go"),
      'package billing\n\nimport "acme/money"\n\nfunc Total() money.Money {\n\treturn money.Money{}\n}\n'
    );

    const run = (cache: ParseCache) =>
      analyzeFiles({
        fileSystem: new NodeFileSystem(root),
        root: "/",
        projectName: "proyecto",
        parsers: [new GoParser()],
        cache
      });

    const first = new ParseCache();
    const cold = run(first);
    expect(cold.cache).toEqual({ hits: 0, misses: 2 });
    expect(serializeParseCache(root, first).parser).toBe("go");

    const cached = new ParseCache();
    for (const [relativePath, entry] of first.list()) {
      cached.set(relativePath, entry);
    }
    const warm = run(cached);
    expect(warm.cache).toEqual({ hits: 2, misses: 0 });
    expect(warm.snapshot.meta.checksum).toBe(cold.snapshot.meta.checksum);
  });
});

describe("el parser de Go en WASM", () => {
  it("da lo mismo que el nativo, fichero a fichero", async () => {
    const wasm = await WasmGoParser.create(grammarBytes());
    expect(wasm.parse(SAMPLE)).toEqual(new GoParser().parse(SAMPLE));
  });

  it("el snapshot del navegador tiene el checksum del CLI", async () => {
    const wasm = await WasmGoParser.create(grammarBytes());
    expect(analyzeProject([wasm]).snapshot).toEqual(analyzeProject().snapshot);
  });
});
