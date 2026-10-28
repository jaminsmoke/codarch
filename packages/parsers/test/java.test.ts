import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { fileId, parseCcJson } from "@codarch/schema";
import { analyzeFiles } from "../src/analyze-core";
import { ParseCache } from "../src/cache";
import { MemoryFileSystem } from "../src/fs";
import { javaImportTargets } from "../src/java/imports";
import { JavaParser } from "../src/java/parser";
import { WasmJavaParser } from "../src/java/wasm-parser";
import { analyzeRepository } from "../src/analyze";
import { NodeFileSystem } from "../src/node-fs";
import { serializeParseCache } from "../src/parse-cache-store";
import type { SourceParser } from "../src/types";

/**
 * Java de punta a punta (ADR 0090): métricas, símbolos, miembros, imports como
 * aristas y la misma respuesta en el parser nativo y en el WASM.
 *
 * `cc.json` no cambia: un fichero `.java` es un nodo con sus métricas y sus
 * símbolos, sin estado de migración, porque la lente sigue siendo JS/TS → Rust.
 */

const SAMPLE = `package com.acme.billing;

import com.acme.core.Money;
import static com.acme.core.Money.ZERO;
import java.util.List;
import java.util.*;

public class Invoice {
  private static final int LIMIT = 10, OTHER = 20;
  private final Money total;

  public Invoice(Money total) { this.total = total; }

  public double compute(int count) {
    double result = 0;
    for (int i = 0; i < count; i++) { result += i % 2 == 0 ? 1 : 2; }
    if (result > LIMIT && total != null) { return result; }
    while (result > 0) result--;
    switch (count) {
      case 1: return 1;
      default: return result;
    }
  }
}

record Pair(int left, int right) { int sum() { return left + right; } }
enum State { OPEN, CLOSED }
interface Handler { void handle(); }
`;

const tempRoots: string[] = [];

function tempDir(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-java-"));
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

/** Un repo Java pequeño: un paquete con dos clases y otro import que no está. */
function javaProject(): MemoryFileSystem {
  return new MemoryFileSystem([
    [
      "/src/main/java/com/acme/core/Money.java",
      "package com.acme.core;\n\npublic class Money {\n  public static final Money ZERO = new Money();\n}\n"
    ],
    [
      "/src/main/java/com/acme/billing/Invoice.java",
      [
        "package com.acme.billing;",
        "",
        "import com.acme.core.Money;",
        "import com.acme.core.Gone;",
        "import com.other.Thing;",
        "import java.util.List;",
        "import com.acme.core.*;",
        "",
        "public class Invoice {",
        "  private final Money total;",
        "",
        "  public Invoice(Money total) { this.total = total; }",
        "",
        "  public Money total() { return total; }",
        "}"
      ].join("\n")
    ]
  ]);
}

function analyzeProject(
  parsers: SourceParser[] = [new JavaParser()],
  fileSystem = javaProject()
) {
  return analyzeFiles({
    fileSystem,
    root: "/",
    projectName: "proyecto",
    parsers
  });
}

describe("el parser de Java", () => {
  it("mide métricas, símbolos, miembros e imports en un solo recorrido", () => {
    const result = new JavaParser().parse(SAMPLE);

    expect(result.metrics).toEqual({
      loc: 28,
      rloc: 23,
      functions: 3,
      maxComplexity: 8,
      maxFunctionLength: 10
    });

    expect(
      result.symbols?.map((symbol) => [symbol.name, symbol.kind, symbol.line])
    ).toEqual([
      ["Invoice", "class", 8],
      ["Invoice", "function", 12],
      ["compute", "function", 14],
      ["Pair", "class", 26],
      ["sum", "function", 26],
      ["State", "enum", 27],
      ["Handler", "interface", 28],
      ["handle", "function", 28]
    ]);
    // El método de la interfaz no tiene cuerpo: es símbolo, no métrica.
    expect(result.metrics.functions).toBe(3);
    expect(result.symbols?.find((symbol) => symbol.name === "compute")).toMatchObject({
      complexity: 8,
      lines: 10
    });

    expect(result.members).toEqual([
      { owner: "Invoice", name: "LIMIT", line: 9, lines: 1, from: "field" },
      { owner: "Invoice", name: "OTHER", line: 9, lines: 1, from: "field" },
      { owner: "Invoice", name: "total", line: 10, lines: 1, from: "field" },
      { owner: "Pair", name: "left", line: 26, lines: 1, from: "field" },
      { owner: "Pair", name: "right", line: 26, lines: 1, from: "field" }
    ]);

    expect(result.imports.map((imported) => [imported.specifier, imported.line])).toEqual([
      ["com.acme.core.Money", 3],
      ["com.acme.core.Money.ZERO", 4],
      ["java.util.List", 5],
      ["java.util.*", 6]
    ]);
  });

  it("no publica superficie de exportación: Java publica lo que declara", () => {
    expect(new JavaParser().parse(SAMPLE).exports).toBeUndefined();
  });

  it("el hash del símbolo no cambia al renombrarlo", () => {
    const before = new JavaParser().parse(
      "class A { int add(int a) { return a + 1; } }"
    );
    const after = new JavaParser().parse(
      "class B { int sum(int a) { return a + 1; } }"
    );
    expect(after.symbols?.[1]?.hash).toBe(before.symbols?.[1]?.hash);
  });
});

describe("los imports de Java", () => {
  it("una clase es su ruta y un miembro estático cae en su clase", () => {
    // El segundo candidato cubre la clase anidada y el miembro estático: si
    // `Money.java` existe, gana; si no, se prueba la clase que la contiene.
    expect(javaImportTargets("com.acme.core.Money")).toEqual({
      kind: "paths",
      paths: ["com/acme/core/Money.java", "com/acme/core.java"]
    });
    expect(javaImportTargets("com.acme.core.Money.ZERO")).toEqual({
      kind: "paths",
      paths: ["com/acme/core/Money/ZERO.java", "com/acme/core/Money.java"]
    });
  });

  it("la plataforma es builtin y un paquete entero es externo", () => {
    expect(javaImportTargets("java.util.List")).toEqual({
      kind: "external",
      builtin: true
    });
    expect(javaImportTargets("javax.swing.JFrame")).toEqual({
      kind: "external",
      builtin: true
    });
    expect(javaImportTargets("com.acme.core.*")).toEqual({
      kind: "external",
      builtin: false
    });
  });
});

describe("el análisis de un proyecto Java", () => {
  it("el import es una arista y el nodo no entra en la lente de migración", () => {
    const result = analyzeProject();

    expect(result.files).toBe(2);
    expect(result.edges).toBe(1);
    expect(result.migration.files).toBe(0);

    const cc = parseCcJson(result.snapshot);
    const invoice =
      cc.lenses?.metrics?.attributes?.[
        fileId("src/main/java/com/acme/billing/Invoice.java")
      ];
    expect(invoice).toMatchObject({ loc: 15, functions: 2, fanOut: 1 });
    expect(invoice?.migrationDebt).toBeUndefined();
  });

  it("distingue dependencia, import roto y paquete entero", () => {
    const result = analyzeProject();

    // com.other.Thing no está en el repo: dependencia. com.acme.core.* apunta a
    // un paquete y no crea arista. java.util.List es plataforma.
    expect(result.externalImports).toBe(2);
    expect(result.builtinImports).toBe(1);
    // com.acme.core.Gone: el paquete está y la clase no.
    expect(result.unresolvedImports).toBe(1);
    expect(result.unresolved[0]).toMatchObject({
      file: "src/main/java/com/acme/billing/Invoice.java",
      line: 4,
      specifier: "com.acme.core.Gone",
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
      path.join(root, "src", "main", "java", "com", "acme", "Money.java"),
      "package com.acme;\n\npublic class Money {}\n"
    );
    write(
      path.join(root, "src", "main", "java", "com", "acme", "Invoice.java"),
      "package com.acme;\n\nimport com.acme.Money;\n\npublic class Invoice {\n  private Money total;\n}\n"
    );

    const first = analyzeRepository(root, { git: false });
    const second = analyzeRepository(root, { git: false });

    expect(first.files).toBe(2);
    expect(first.edges).toBe(1);
    expect(second.snapshot).toEqual(first.snapshot);
  });

  it("guarda el parseo firmado con el parser de Java y lo reutiliza", () => {
    const root = tempDir();
    write(
      path.join(root, "src", "com", "acme", "Money.java"),
      "package com.acme;\n\npublic class Money {}\n"
    );
    write(
      path.join(root, "src", "com", "acme", "Invoice.java"),
      "package com.acme;\n\nimport com.acme.Money;\n\npublic class Invoice {\n  private Money total;\n}\n"
    );

    const run = (cache: ParseCache) => {
      const result = analyzeFiles({
        fileSystem: new NodeFileSystem(root),
        root: "/",
        projectName: "proyecto",
        parsers: [new JavaParser()],
        cache
      });
      return result;
    };

    const first = new ParseCache();
    const cold = run(first);
    expect(cold.cache).toEqual({ hits: 0, misses: 2 });
    expect(serializeParseCache(root, first).parser).toBe("java");

    const warm = run(new ParseCache());
    expect(warm.cache.misses).toBe(2);
    const hits = new ParseCache();
    for (const [relativePath, entry] of first.list()) {
      hits.set(relativePath, entry);
    }
    const cached = run(hits);
    expect(cached.cache).toEqual({ hits: 2, misses: 0 });
    expect(cached.snapshot.meta.checksum).toBe(cold.snapshot.meta.checksum);
  });
});

describe("el parser de Java en WASM", () => {
  it("da lo mismo que el nativo, fichero a fichero", async () => {
    const bytes = fs.readFileSync(
      path.resolve(
        import.meta.dirname,
        "..",
        "..",
        "..",
        "node_modules",
        "tree-sitter-java",
        "tree-sitter-java.wasm"
      )
    );
    const wasm = await WasmJavaParser.create(bytes);

    expect(wasm.parse(SAMPLE)).toEqual(new JavaParser().parse(SAMPLE));
  });

  it("el snapshot del navegador tiene el checksum del CLI", async () => {
    const bytes = fs.readFileSync(
      path.resolve(
        import.meta.dirname,
        "..",
        "..",
        "..",
        "node_modules",
        "tree-sitter-java",
        "tree-sitter-java.wasm"
      )
    );
    const wasm = await WasmJavaParser.create(bytes);

    expect(analyzeProject([wasm]).snapshot).toEqual(analyzeProject().snapshot);
  });
});
