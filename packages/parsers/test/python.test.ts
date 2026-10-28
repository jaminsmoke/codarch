import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { fileId, parseCcJson } from "@codarch/schema";
import { analyzeFiles } from "../src/analyze-core";
import { ParseCache } from "../src/cache";
import { MemoryFileSystem } from "../src/fs";
import { analyzeRepository } from "../src/analyze";
import { NodeFileSystem } from "../src/node-fs";
import { serializeParseCache } from "../src/parse-cache-store";
import { pythonImportTargets } from "../src/python/imports";
import { PythonParser } from "../src/python/parser";
import { WasmPythonParser } from "../src/python/wasm-parser";
import type { ParsedImport, SourceParser } from "../src/types";

/**
 * Python de punta a punta (ADR 0090): métricas, símbolos, miembros, imports
 * como aristas, relativos y `__init__.py`, y la misma respuesta en el parser
 * nativo y en el WASM.
 *
 * `cc.json` no cambia: un fichero `.py` es un nodo con sus métricas y sus
 * símbolos, sin estado de migración, porque la lente sigue siendo JS/TS → Rust.
 */

const SAMPLE = `"""Facturación."""
import os
import a.b.c as x
from . import helper
from .models import User
from acme.core import Money

LIMIT = 10


class Invoice:
    total = 0

    def __init__(self, total):
        self.total = total
        self.limit = LIMIT

    def compute(self, count):
        result = 0
        for i in range(count):
            result += 1 if i % 2 == 0 else 2
        if result > LIMIT and self.total:
            return result
        while result > 0:
            result -= 1
        try:
            pass
        except ValueError:
            pass
        match count:
            case 1:
                return 1
        return result


def top(a):
    def inner():
        return a
    return inner()
`;

const tempRoots: string[] = [];

function tempDir(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-python-"));
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

function imported(specifier: string, names?: string[]): ParsedImport {
  return {
    specifier,
    kind: "static",
    typeOnly: false,
    line: 1,
    ...(names ? { names } : {})
  };
}

/** Un repo Python sin `__init__.py`: el paquete es la carpeta, como en Python 3. */
function pythonProject(): MemoryFileSystem {
  return new MemoryFileSystem([
    [
      "/src/acme/money.py",
      "class Money:\n  def __init__(self, cents):\n    self.cents = cents\n"
    ],
    [
      "/src/acme/billing.py",
      [
        "import os",
        "import requests",
        "from acme.money import Money",
        "from acme import *",
        "from . import gone",
        "",
        "def total(items):",
        "  return sum(i.cents for i in items)",
        ""
      ].join("\n")
    ]
  ]);
}

function analyzeProject(
  parsers: SourceParser[] = [new PythonParser()],
  fileSystem = pythonProject()
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
        "tree-sitter-python",
        "tree-sitter-python.wasm"
      )
    )
  );
}

describe("el parser de Python", () => {
  it("mide métricas, símbolos, miembros e imports en un solo recorrido", () => {
    const result = new PythonParser().parse(SAMPLE);

    // loc cuenta las 39 líneas; de ellas, siete están en blanco.
    expect(result.metrics).toEqual({
      loc: 39,
      rloc: 32,
      functions: 4,
      // for, ternario, if, `and`, while, except y el `case`.
      maxComplexity: 8,
      maxFunctionLength: 16
    });

    expect(
      result.symbols?.map((symbol) => [symbol.name, symbol.kind, symbol.line])
    ).toEqual([
      ["LIMIT", "variable", 8],
      ["Invoice", "class", 11],
      ["__init__", "function", 14],
      ["compute", "function", 18],
      ["top", "function", 36],
      ["inner", "function", 37]
    ]);
    expect(
      result.symbols?.find((symbol) => symbol.name === "compute")
    ).toMatchObject({ complexity: 8, lines: 16 });

    expect(result.members).toEqual([
      { owner: "Invoice", name: "total", line: 12, lines: 1, from: "field" },
      { owner: "Invoice", name: "limit", line: 16, lines: 1, from: "field" }
    ]);

    expect(
      result.imports.map((entry) => [entry.specifier, entry.line])
    ).toEqual([
      ["os", 2],
      ["a.b.c", 3],
      [".", 4],
      [".models", 5],
      ["acme.core", 6]
    ]);
    // Los nombres de un `from` viajan con el import: son los candidatos a
    // submódulo, y la ficha los enseña.
    expect(result.imports[2]).toMatchObject({ names: ["helper"] });
    expect(result.imports[3]).toMatchObject({ names: ["User"] });
  });

  it("no cuenta los comentarios como código", () => {
    const result = new PythonParser().parse(
      ["# uno", "x = 1  # dos", "", "# tres", "y = 2"].join("\n")
    );
    expect(result.metrics).toEqual({
      loc: 5,
      rloc: 2,
      functions: 0,
      maxComplexity: 0,
      maxFunctionLength: 0
    });
    expect(result.symbols?.map((symbol) => symbol.name)).toEqual(["x", "y"]);
  });

  it("no publica superficie de exportación: Python publica lo que no es privado", () => {
    expect(new PythonParser().parse(SAMPLE).exports).toBeUndefined();
  });

  it("el hash del símbolo no cambia al renombrarlo", () => {
    const before = new PythonParser().parse("def add(a):\n  return a + 1\n");
    const after = new PythonParser().parse(
      "def sumar(a):\n  return a + 1\n"
    );
    expect(after.symbols?.[0]?.hash).toBe(before.symbols?.[0]?.hash);
  });

  it("el hash no cambia al mover un comentario, pero sí al mover el cuerpo", () => {
    const plain = new PythonParser().parse("def f(a):\n  return a + 1\n");
    const commented = new PythonParser().parse(
      "def f(a):\n  # suma\n  return a + 1\n"
    );
    const changed = new PythonParser().parse("def f(a):\n  return a + 2\n");
    expect(commented.symbols?.[0]?.hash).toBe(plain.symbols?.[0]?.hash);
    expect(changed.symbols?.[0]?.hash).not.toBe(plain.symbols?.[0]?.hash);
  });
});

describe("los imports de Python", () => {
  it("un módulo es su ruta", () => {
    expect(pythonImportTargets(imported("acme.core"), "app/main.py")).toEqual({
      kind: "paths",
      paths: ["acme/core.py", "acme/core/__init__.py"]
    });
  });

  it("un `from` import prueba el submódulo y luego el módulo", () => {
    expect(
      pythonImportTargets(imported("acme.models", ["User"]), "app/main.py")
    ).toEqual({
      kind: "paths",
      paths: [
        "acme/models/User.py",
        "acme/models/User/__init__.py",
        "acme/models.py",
        "acme/models/__init__.py"
      ]
    });
  });

  it("un import relativo cuelga del paquete del fichero", () => {
    // `from . import helper` desde app/api/views.py.
    expect(pythonImportTargets(imported(".", ["helper"]), "app/api/views.py")).toEqual({
      kind: "paths",
      paths: [
        "app/api/helper.py",
        "app/api/helper/__init__.py",
        "app/api/__init__.py"
      ]
    });
    // `from ..services import mail` sube un nivel.
    expect(
      pythonImportTargets(imported("..services", ["mail"]), "app/api/views.py")
    ).toEqual({
      kind: "paths",
      paths: [
        "app/services/mail.py",
        "app/services/mail/__init__.py",
        "app/services.py",
        "app/services/__init__.py"
      ]
    });
  });

  it("la biblioteca estándar es builtin y `import *` no es una arista", () => {
    expect(pythonImportTargets(imported("os"), "main.py")).toEqual({
      kind: "external",
      builtin: true
    });
    expect(pythonImportTargets(imported("json.decoder"), "main.py")).toEqual({
      kind: "external",
      builtin: true
    });
    expect(pythonImportTargets(imported("acme.*"), "main.py")).toEqual({
      kind: "external",
      builtin: false
    });
    // `requests` no se decide aquí: puede ser un fichero del repositorio. Lo
    // que no es, es biblioteca estándar.
    expect(pythonImportTargets(imported("requests"), "main.py")).toEqual({
      kind: "paths",
      paths: ["requests.py", "requests/__init__.py"]
    });
  });
});

describe("el análisis de un proyecto Python", () => {
  it("el import es una arista y el nodo no entra en la lente de migración", () => {
    const result = analyzeProject();

    expect(result.files).toBe(2);
    expect(result.edges).toBe(1);
    expect(result.migration.files).toBe(0);

    const cc = parseCcJson(result.snapshot);
    const billing = cc.lenses?.metrics?.attributes?.[fileId("src/acme/billing.py")];
    expect(billing).toMatchObject({ loc: 8, functions: 1, fanOut: 1 });
    expect(billing?.migrationDebt).toBeUndefined();
  });

  it("distingue dependencia, import roto y biblioteca estándar", () => {
    const result = analyzeProject();

    // `requests` es una dependencia y `from acme import *` apunta a un paquete.
    expect(result.externalImports).toBe(2);
    expect(result.builtinImports).toBe(1);
    // `from . import gone`: la carpeta del paquete está y el módulo no.
    expect(result.unresolvedImports).toBe(1);
    expect(result.unresolved[0]).toMatchObject({
      file: "src/acme/billing.py",
      line: 5,
      specifier: ".",
      reason: "no se encontró el fichero"
    });
  });

  it("es determinista: dos pasadas dan el mismo checksum", () => {
    expect(analyzeProject().snapshot.meta.checksum).toBe(
      analyzeProject().snapshot.meta.checksum
    );
  });

  it("`analyzeRepository` lo analiza sin decirle nada más", () => {
    const root = tempDir();
    write(
      path.join(root, "src", "acme", "money.py"),
      "class Money:\n  pass\n"
    );
    write(
      path.join(root, "src", "acme", "billing.py"),
      "from acme.money import Money\n\n\ndef total(items):\n  return sum(items)\n"
    );

    const first = analyzeRepository(root, { git: false });
    const second = analyzeRepository(root, { git: false });

    expect(first.files).toBe(2);
    expect(first.edges).toBe(1);
    expect(second.snapshot).toEqual(first.snapshot);
  });

  it("guarda el parseo firmado con el parser de Python y lo reutiliza", () => {
    const root = tempDir();
    write(path.join(root, "src", "acme", "money.py"), "class Money:\n  pass\n");
    write(
      path.join(root, "src", "acme", "billing.py"),
      "from acme.money import Money\n\n\ndef total(items):\n  return sum(items)\n"
    );

    const run = (cache: ParseCache) =>
      analyzeFiles({
        fileSystem: new NodeFileSystem(root),
        root: "/",
        projectName: "proyecto",
        parsers: [new PythonParser()],
        cache
      });

    const first = new ParseCache();
    const cold = run(first);
    expect(cold.cache).toEqual({ hits: 0, misses: 2 });
    expect(serializeParseCache(root, first).parser).toBe("python");

    const cached = new ParseCache();
    for (const [relativePath, entry] of first.list()) {
      cached.set(relativePath, entry);
    }
    const warm = run(cached);
    expect(warm.cache).toEqual({ hits: 2, misses: 0 });
    expect(warm.snapshot.meta.checksum).toBe(cold.snapshot.meta.checksum);
  });
});

describe("el parser de Python en WASM", () => {
  it("da lo mismo que el nativo, fichero a fichero", async () => {
    const wasm = await WasmPythonParser.create(grammarBytes());
    expect(wasm.parse(SAMPLE)).toEqual(new PythonParser().parse(SAMPLE));
  });

  it("el snapshot del navegador tiene el checksum del CLI", async () => {
    const wasm = await WasmPythonParser.create(grammarBytes());
    expect(analyzeProject([wasm]).snapshot).toEqual(analyzeProject().snapshot);
  });
});
