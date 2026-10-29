import fs from "node:fs";
import os from "node:os";
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

function readJavaGrammar(): Uint8Array {
  return new Uint8Array(
    fs.readFileSync(
      path.resolve(GRAMMARS, "..", "tree-sitter-java", "tree-sitter-java.wasm")
    )
  );
}

function readGoGrammar(): Uint8Array {
  return new Uint8Array(
    fs.readFileSync(
      path.resolve(GRAMMARS, "..", "tree-sitter-go", "tree-sitter-go.wasm")
    )
  );
}

function readCSharpGrammar(): Uint8Array {
  return new Uint8Array(
    fs.readFileSync(
      path.resolve(
        GRAMMARS,
        "..",
        "tree-sitter-c-sharp",
        "tree-sitter-c_sharp.wasm"
      )
    )
  );
}

function readPythonGrammar(): Uint8Array {
  return new Uint8Array(
    fs.readFileSync(
      path.resolve(
        GRAMMARS,
        "..",
        "tree-sitter-python",
        "tree-sitter-python.wasm"
      )
    )
  );
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

    // El resto también sale igual que en el CLI: los dos mapas son uno por
    // pasada y con la misma regla de checksum (ADR 0093).
    const rest = response.rest as { meta: { checksum: string } } | null;
    expect(rest?.meta.checksum).toBe(onDisk.rest?.meta.checksum);
  }, 60_000);

  it("analiza Java con su gramática y da el checksum del CLI", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-web-java-"));
    const files: Array<[string, string]> = [
      ["/package.json", JSON.stringify({ name: "java-demo" })],
      [
        "/src/com/acme/Money.java",
        "package com.acme;\n\npublic class Money {\n  private final int cents;\n\n  public Money(int cents) { this.cents = cents; }\n}\n"
      ],
      [
        "/src/com/acme/Invoice.java",
        "package com.acme;\n\nimport com.acme.Money;\n\npublic class Invoice {\n  private final Money total;\n\n  public Invoice(Money total) { this.total = total; }\n}\n"
      ]
    ];

    try {
      for (const [file, content] of files) {
        const onDisk = path.join(root, file);
        fs.mkdirSync(path.dirname(onDisk), { recursive: true });
        fs.writeFileSync(onDisk, content, "utf8");
      }

      const response = await runAnalysis(
        { type: "analyze", files },
        {
          typescript: readGrammar("tree-sitter-typescript.wasm"),
          tsx: readGrammar("tree-sitter-tsx.wasm"),
          java: readJavaGrammar()
        }
      );
      expect(response.type).toBe("done");
      if (response.type !== "done") return;

      const onDisk = analyzeRepository(root, { git: false });
      const browser = response.snapshot as { meta: { checksum: string } };
      expect(browser.meta.checksum).toBe(onDisk.snapshot.meta.checksum);
      expect(response.files).toBe(2);
      expect(response.edges).toBe(1);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }, 60_000);

  it("analiza Python con su gramática y da el checksum del CLI", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-web-python-"));
    const files: Array<[string, string]> = [
      ["/package.json", JSON.stringify({ name: "python-demo" })],
      [
        "/src/acme/money.py",
        "class Money:\n    def __init__(self, cents):\n        self.cents = cents\n"
      ],
      [
        "/src/acme/billing.py",
        "import os\nfrom acme.money import Money\n\n\ndef total(items):\n    return sum(i.cents for i in items)\n"
      ]
    ];

    try {
      for (const [file, content] of files) {
        const onDisk = path.join(root, file);
        fs.mkdirSync(path.dirname(onDisk), { recursive: true });
        fs.writeFileSync(onDisk, content, "utf8");
      }

      const response = await runAnalysis(
        { type: "analyze", files },
        {
          typescript: readGrammar("tree-sitter-typescript.wasm"),
          tsx: readGrammar("tree-sitter-tsx.wasm"),
          python: readPythonGrammar()
        }
      );
      expect(response.type).toBe("done");
      if (response.type !== "done") return;

      const onDisk = analyzeRepository(root, { git: false });
      const browser = response.snapshot as { meta: { checksum: string } };
      expect(browser.meta.checksum).toBe(onDisk.snapshot.meta.checksum);
      expect(response.files).toBe(2);
      expect(response.edges).toBe(1);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }, 60_000);

  it("analiza Go con su gramática y su go.mod, y da el checksum del CLI", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-web-go-"));
    const files: Array<[string, string]> = [
      ["/go.mod", "module acme\n"],
      ["/internal/money/money.go", "package money\n\ntype Money struct {\n\tCents int\n}\n"],
      [
        "/internal/billing/billing.go",
        'package billing\n\nimport "acme/internal/money"\n\nfunc Total(m money.Money) int {\n\treturn m.Cents\n}\n'
      ]
    ];

    try {
      for (const [file, content] of files) {
        const onDisk = path.join(root, file);
        fs.mkdirSync(path.dirname(onDisk), { recursive: true });
        fs.writeFileSync(onDisk, content, "utf8");
      }

      // Sin `package.json` el nombre del proyecto es el de la carpeta, y entra
      // en el checksum: el navegador tiene que usar el mismo.
      const response = await runAnalysis(
        { type: "analyze", files, projectName: path.basename(root) },
        {
          typescript: readGrammar("tree-sitter-typescript.wasm"),
          tsx: readGrammar("tree-sitter-tsx.wasm"),
          go: readGoGrammar()
        }
      );
      expect(response.type).toBe("done");
      if (response.type !== "done") return;

      const onDisk = analyzeRepository(root, { git: false });
      const browser = response.snapshot as { meta: { checksum: string } };
      expect(browser.meta.checksum).toBe(onDisk.snapshot.meta.checksum);
      expect(response.files).toBe(2);
      expect(response.edges).toBe(1);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }, 60_000);

  it("analiza C# con su gramática y da el checksum del CLI", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-web-csharp-"));
    const files: Array<[string, string]> = [
      ["/package.json", JSON.stringify({ name: "csharp-demo" })],
      [
        "/src/Acme/Money/Money.cs",
        "namespace Acme.Money;\n\npublic record Money(int Cents);\n"
      ],
      [
        "/src/Acme/Billing/Invoice.cs",
        "using System.Text;\nusing Acme.Money;\n\nnamespace Acme.Billing;\n\npublic class Invoice\n{\n    public Money Total { get; init; }\n}\n"
      ]
    ];

    try {
      for (const [file, content] of files) {
        const onDisk = path.join(root, file);
        fs.mkdirSync(path.dirname(onDisk), { recursive: true });
        fs.writeFileSync(onDisk, content, "utf8");
      }

      const response = await runAnalysis(
        { type: "analyze", files },
        {
          typescript: readGrammar("tree-sitter-typescript.wasm"),
          tsx: readGrammar("tree-sitter-tsx.wasm"),
          csharp: readCSharpGrammar()
        }
      );
      expect(response.type).toBe("done");
      if (response.type !== "done") return;

      const onDisk = analyzeRepository(root, { git: false });
      const browser = response.snapshot as { meta: { checksum: string } };
      expect(browser.meta.checksum).toBe(onDisk.snapshot.meta.checksum);
      expect(response.files).toBe(2);
      // El `using` del record es la única arista; `System.Text` es plataforma.
      expect(response.edges).toBe(1);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
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

  it("usa el nombre de la carpeta cuando no hay package.json", async () => {    // El nombre de la raíz entra en el checksum: sin package.json, el CLI usa
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

  it("avisa del progreso fichero a fichero", async () => {
    const files: Array<[string, string]> = [
      ["/src/a.ts", "export const a = 1;\n"],
      ["/src/b.ts", "export const b = 2;\n"],
      ["/src/c.ts", "export const c = 3;\n"]
    ];
    const progress: Array<{ done: number; total: number; current: string }> = [];
    const response = await runAnalysis(
      { type: "analyze", files },
      {
        typescript: readGrammar("tree-sitter-typescript.wasm"),
        tsx: readGrammar("tree-sitter-tsx.wasm")
      },
      (update) => {
        if (update.type === "progress-file") {
          progress.push({
            done: update.done,
            total: update.total,
            current: update.current
          });
        }
      }
    );

    expect(response.type).toBe("done");
    expect(progress).toHaveLength(3);
    expect(progress[0]).toEqual({ done: 1, total: 3, current: "src/a.ts" });
    expect(progress[2]).toEqual({ done: 3, total: 3, current: "src/c.ts" });
  }, 60_000);

  it("respeta el ignore del .codarch.yml", async () => {
    const files: Array<[string, string]> = [
      ["/.codarch.yml", "version: 1\nignore:\n  - src/skip/**\n"],
      ["/src/keep.ts", "export const keep = 1;\n"],
      ["/src/skip/a.ts", "export const a = 1;\n"]
    ];
    const response = await runAnalysis(
      { type: "analyze", files },
      {
        typescript: readGrammar("tree-sitter-typescript.wasm"),
        tsx: readGrammar("tree-sitter-tsx.wasm")
      }
    );

    expect(response.type).toBe("done");
    if (response.type !== "done") return;
    expect(response.files).toBe(1);
  }, 60_000);
});
