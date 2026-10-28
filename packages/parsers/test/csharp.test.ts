import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { fileId, parseCcJson } from "@codarch/schema";
import { analyzeFiles } from "../src/analyze-core";
import { ParseCache } from "../src/cache";
import { MemoryFileSystem } from "../src/fs";
import { analyzeRepository } from "../src/analyze";
import { CSharpParser } from "../src/csharp/parser";
import { csharpImportTargets, isPlatformNamespace } from "../src/csharp/imports";
import { WasmCSharpParser } from "../src/csharp/wasm-parser";
import { NodeFileSystem } from "../src/node-fs";
import { serializeParseCache } from "../src/parse-cache-store";
import type { SourceParser } from "../src/types";

/**
 * C# de punta a punta (ADR 0090).
 *
 * C# no importa ficheros ni carpetas: importa **espacios de nombres**, y el
 * espacio de un fichero no se deduce de su ruta —lo declara él mismo— así que
 * el import no se puede resolver mientras se mide el fichero que lo escribe.
 * Se cierra al final, con lo que declaró cada uno.
 */

const SAMPLE = `using System;
using System.Collections.Generic;
using Acme.Billing;

namespace Acme.Billing;

public class Invoice
{
    private readonly int total;
    private string id = "x", note = "";

    public int Total => total;

    public Invoice(int total)
    {
        this.total = total;
    }

    public int Limit(int id)
    {
        if (id > 0 && id < 3)
        {
            return 1;
        }
        for (var i = 0; i < 3; i++)
        {
            _ = i;
        }
        switch (id)
        {
            case 1:
                return 1;
            default:
                return 0;
        }
    }

    public string Label(int id) => id > 0 ? "pos" : "neg";
}

public interface IStore
{
    void Save(Invoice invoice);
}

public enum Kind { A, B }

public record Money(int Cents);

public struct Point
{
    public int X;
}

public delegate void Handler(int value);
`;

const tempRoots: string[] = [];

function tempDir(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-csharp-"));
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

/**
 * Un repo C# con un espacio de nombres repartido en dos ficheros.
 *
 * `Invoice` usa el espacio del record, uno que el repo no declara y una
 * dependencia; `Store` importa su **propio** espacio, que en C# es lo normal, y
 * el del record.
 */
function csharpProject(): MemoryFileSystem {
  return new MemoryFileSystem([
    [
      "/src/Acme/Money/Money.cs",
      ["namespace Acme.Money;", "", "public record Money(int Cents);", ""].join(
        "\n"
      )
    ],
    [
      "/src/Acme/Billing/Invoice.cs",
      [
        "using System.Text;",
        "using Acme.Money;",
        "using Acme.Gone;",
        "using Newtonsoft.Json;",
        "",
        "namespace Acme.Billing;",
        "",
        "public class Invoice",
        "{",
        "    public Money Total { get; init; }",
        "}",
        ""
      ].join("\n")
    ],
    [
      "/src/Acme/Storage/Store.cs",
      [
        "using Acme.Storage;",
        "using Acme.Money;",
        "",
        "namespace Acme.Storage;",
        "",
        "public class Store",
        "{",
        "    public void Save(Money money) { }",
        "}",
        ""
      ].join("\n")
    ]
  ]);
}

function analyzeProject(
  parsers: SourceParser[] = [new CSharpParser()],
  fileSystem = csharpProject()
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
        "tree-sitter-c-sharp",
        "tree-sitter-c_sharp.wasm"
      )
    )
  );
}

describe("el parser de C#", () => {
  it("mide métricas, símbolos, miembros e imports en un solo recorrido", () => {
    const result = new CSharpParser().parse(SAMPLE);

    // loc cuenta las 55 líneas; de ellas, once están en blanco.
    expect(result.metrics).toEqual({
      loc: 55,
      rloc: 44,
      functions: 3,
      maxComplexity: 5,
      maxFunctionLength: 18
    });

    expect(
      result.symbols?.map((symbol) => [symbol.name, symbol.kind, symbol.line])
    ).toEqual([
      ["Invoice", "class", 7],
      ["Invoice", "function", 14],
      ["Limit", "function", 19],
      ["Label", "function", 38],
      ["IStore", "interface", 41],
      // El método de una interfaz es una firma: cuenta como función y su
      // complejidad es 1, la del camino único.
      ["Save", "function", 43],
      ["Kind", "enum", 46],
      ["Money", "class", 48],
      ["Point", "class", 50],
      ["Handler", "type", 55]
    ]);
    // if, `&&`, for y el `case`; el `default` no abre camino.
    expect(result.symbols?.find((symbol) => symbol.name === "Limit")).toMatchObject({
      complexity: 5,
      lines: 18
    });
    // Una propiedad con cuerpo de expresión es complejidad de su método.
    expect(
      result.symbols?.find((symbol) => symbol.name === "Label")
    ).toMatchObject({ complexity: 2, lines: 1 });

    // Los campos del tipo, sus propiedades y los parámetros de un record.
    expect(result.members).toEqual([
      { owner: "Invoice", name: "total", line: 9, lines: 1, from: "field" },
      { owner: "Invoice", name: "id", line: 10, lines: 1, from: "field" },
      { owner: "Invoice", name: "note", line: 10, lines: 1, from: "field" },
      { owner: "Invoice", name: "Total", line: 12, lines: 1, from: "field" },
      { owner: "Money", name: "Cents", line: 48, lines: 1, from: "parameter" },
      { owner: "Point", name: "X", line: 52, lines: 1, from: "field" }
    ]);

    expect(result.imports.map((entry) => [entry.specifier, entry.line])).toEqual([
      ["System", 1],
      ["System.Collections.Generic", 2],
      ["Acme.Billing", 3]
    ]);
  });

  it("declara los espacios de nombres del fichero, anidados incluidos", () => {
    expect(new CSharpParser().parse(SAMPLE).namespaces).toEqual([
      "Acme.Billing"
    ]);

    const nested = new CSharpParser().parse(
      ["namespace Acme", "{", "    namespace Billing", "    {", "    }", "}", ""].join(
        "\n"
      )
    );
    expect(nested.namespaces).toEqual(["Acme", "Acme.Billing"]);
  });

  it("no publica superficie de exportación: en C# publica el modificador", () => {
    expect(new CSharpParser().parse(SAMPLE).exports).toBeUndefined();
  });

  it("un alias y un `using static` no son dependencias", () => {
    const result = new CSharpParser().parse(
      [
        "using static System.Math;",
        "using Json = System.Text.Json;",
        "using System.Text;",
        "",
        "namespace Acme;",
        ""
      ].join("\n")
    );
    expect(result.imports.map((entry) => entry.specifier)).toEqual([
      "System.Text"
    ]);
  });

  it("el hash del símbolo no cambia al renombrarlo", () => {
    const before = new CSharpParser().parse(
      "class A\n{\n    int Add(int x) { return x + 1; }\n}\n"
    );
    const after = new CSharpParser().parse(
      "class A\n{\n    int Sum(int x) { return x + 1; }\n}\n"
    );
    expect(after.symbols?.[1]?.hash).toBe(before.symbols?.[1]?.hash);
  });
});

describe("los imports de C#", () => {
  it("nombran un espacio de nombres, no una ruta", () => {
    expect(csharpImportTargets("Acme.Money")).toEqual({
      kind: "namespace",
      namespaces: ["Acme.Money"],
      builtin: false
    });
  });

  it("lo que trae el runtime es plataforma", () => {
    expect(csharpImportTargets("System.Text")).toMatchObject({ builtin: true });
    expect(csharpImportTargets("Microsoft.Extensions.Logging")).toMatchObject({
      builtin: true
    });
    expect(csharpImportTargets("Newtonsoft.Json")).toMatchObject({
      builtin: false
    });
    expect(isPlatformNamespace("Acme.System")).toBe(false);
  });
});

describe("el análisis de un proyecto C#", () => {
  it("un `using` deja una arista por fichero que declara el espacio", () => {
    const result = analyzeProject();

    expect(result.files).toBe(3);
    expect(result.edges).toBe(2);
    expect(result.migration.files).toBe(0);

    const cc = parseCcJson(result.snapshot);
    const invoice =
      cc.lenses?.metrics?.attributes?.[fileId("src/Acme/Billing/Invoice.cs")];
    expect(invoice).toMatchObject({ loc: 11, functions: 0, fanOut: 1 });
    expect(invoice?.migrationDebt).toBeUndefined();
  });

  it("distingue espacio del repo, import roto y dependencia", () => {
    const result = analyzeProject();

    // `System.Text` es plataforma; `Newtonsoft.Json` es de fuera.
    expect(result.builtinImports).toBe(1);
    expect(result.externalImports).toBe(1);
    // `Acme.Gone`: la raíz `Acme` sí está en el repo, el espacio no.
    expect(result.unresolvedImports).toBe(1);
    expect(result.unresolved[0]).toMatchObject({
      file: "src/Acme/Billing/Invoice.cs",
      line: 3,
      specifier: "Acme.Gone",
      reason: "no se encontró el espacio de nombres"
    });
  });

  it("un fichero que importa su propio espacio no se enlaza consigo mismo", () => {
    const result = analyzeProject();
    const cc = parseCcJson(result.snapshot);
    const store =
      cc.lenses?.metrics?.attributes?.[fileId("src/Acme/Storage/Store.cs")];

    // `using Acme.Storage;` en un fichero de `Acme.Storage` es lo normal: no es
    // una arista, ni un import roto, ni una dependencia de fuera.
    expect(store).toMatchObject({ fanIn: 0, fanOut: 1 });
    expect(result.unresolvedImports).toBe(1);
    expect(result.cycles).toEqual([]);
  });

  it("importar un espacio compartido enlaza con sus hermanos, no consigo mismo", () => {
    const result = analyzeFiles({
      fileSystem: new MemoryFileSystem([
        [
          "/Acme/A.cs",
          "namespace Acme.Billing;\n\npublic class A\n{\n}\n"
        ],
        [
          "/Acme/B.cs",
          "using Acme.Billing;\n\nnamespace Acme.Billing;\n\npublic class B\n{\n}\n"
        ]
      ]),
      root: "/",
      projectName: "proyecto",
      parsers: [new CSharpParser()]
    });

    // Una sola arista: B → A. El `using` del espacio propio llega al hermano
    // que lo declara, y a B no le llega a sí mismo (si no, sería un ciclo).
    expect(result.edges).toBe(1);
    expect(result.cycles).toEqual([]);

    const cc = parseCcJson(result.snapshot);
    expect(cc.lenses?.metrics?.attributes?.[fileId("Acme/A.cs")]).toMatchObject({
      fanIn: 1
    });
    expect(cc.lenses?.metrics?.attributes?.[fileId("Acme/B.cs")]).toMatchObject({
      fanOut: 1
    });
  });

  it("conserva aristas y recuentos al mezclar espacios locales y externos", () => {
    const entries: [string, string][] = [
      ["/A.cs", "namespace Acme.Shared; public class A {}"],
      ["/B.cs", "namespace Acme.Shared; public class B {}"],
      ["/Consumer.cs", [
        "using Acme.Shared;",
        "using Acme.Missing;",
        "using System.Text;",
        "using Newtonsoft.Json;",
        "namespace Acme.Client; public class Consumer {}"
      ].join("\n")],
      ["/Solo.cs", "using Acme.Solo;\nnamespace Acme.Solo; public class Solo {}"]
    ];
    const run = (files: [string, string][]) => analyzeFiles({
      fileSystem: new MemoryFileSystem(files),
      root: "/",
      projectName: "proyecto",
      parsers: [new CSharpParser()]
    });
    const result = run(entries);
    const cc = parseCcJson(result.snapshot);
    const edges = cc.lenses?.dependency?.edges ?? [];
    expect(edges.map((edge) => [edge.fromId, edge.toId])).toEqual([
      [fileId("Consumer.cs"), fileId("A.cs")],
      [fileId("Consumer.cs"), fileId("B.cs")]
    ]);
    expect(result).toMatchObject({ edges: 2, builtinImports: 1, externalImports: 1, unresolvedImports: 1 });
    expect(cc.lenses?.metrics?.attributes?.[fileId("Consumer.cs")]).toMatchObject({
      fanOut: 2, builtinImports: 1, externalImports: 1, unresolvedImports: 1
    });
    expect(cc.lenses?.metrics?.attributes?.[fileId("Solo.cs")]).toMatchObject({ fanOut: 0, unresolvedImports: 0 });
    expect(run([...entries].reverse()).snapshot).toEqual(result.snapshot);
  });

  it("es determinista: dos pasadas dan el mismo checksum", () => {
    expect(analyzeProject().snapshot.meta.checksum).toBe(
      analyzeProject().snapshot.meta.checksum
    );
  });

  it("`analyzeRepository` lo analiza sin decirle nada más", () => {
    const root = tempDir();
    write(
      path.join(root, "src", "Acme", "Money", "Money.cs"),
      "namespace Acme.Money;\n\npublic record Money(int Cents);\n"
    );
    write(
      path.join(root, "src", "Acme", "Billing", "Invoice.cs"),
      "using Acme.Money;\n\nnamespace Acme.Billing;\n\npublic class Invoice\n{\n    public Money Total { get; init; }\n}\n"
    );

    const first = analyzeRepository(root, { git: false });
    const second = analyzeRepository(root, { git: false });

    expect(first.files).toBe(2);
    expect(first.edges).toBe(1);
    expect(second.snapshot).toEqual(first.snapshot);
  });

  it("guarda el parseo firmado con el parser de C# y lo reutiliza", () => {
    const root = tempDir();
    write(
      path.join(root, "src", "Money.cs"),
      "namespace Acme.Money;\n\npublic record Money(int Cents);\n"
    );
    write(
      path.join(root, "src", "Invoice.cs"),
      "using Acme.Money;\n\nnamespace Acme.Billing;\n\npublic class Invoice\n{\n}\n"
    );

    const run = (cache: ParseCache) =>
      analyzeFiles({
        fileSystem: new NodeFileSystem(root),
        root: "/",
        projectName: "proyecto",
        parsers: [new CSharpParser()],
        cache
      });

    const first = new ParseCache();
    const cold = run(first);
    expect(cold.cache).toEqual({ hits: 0, misses: 2 });
    expect(serializeParseCache(root, first).parser).toBe("csharp");

    const cached = new ParseCache();
    for (const [relativePath, entry] of first.list()) {
      cached.set(relativePath, entry);
    }
    const warm = run(cached);
    expect(warm.cache).toEqual({ hits: 2, misses: 0 });
    expect(warm.snapshot.meta.checksum).toBe(cold.snapshot.meta.checksum);
  });
});

describe("el parser de C# en WASM", () => {
  it("da lo mismo que el nativo, fichero a fichero", async () => {
    const wasm = await WasmCSharpParser.create(grammarBytes());
    expect(wasm.parse(SAMPLE)).toEqual(new CSharpParser().parse(SAMPLE));
  });

  it("el snapshot del navegador tiene el checksum del CLI", async () => {
    const wasm = await WasmCSharpParser.create(grammarBytes());
    expect(analyzeProject([wasm]).snapshot).toEqual(analyzeProject().snapshot);
  });
});
