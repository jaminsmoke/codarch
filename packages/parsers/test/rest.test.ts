import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { fileId } from "@codarch/schema";
import { analyzeRepository } from "../src/index";
import { MemoryFileSystem } from "../src/fs";
import {
  buildRestSnapshot,
  kindForPath,
  linkTargets,
  measureRestFile,
  type RestFile
} from "../src/rest";
import { walkCodeAndRest } from "../src/walk";

describe("el tipo de lo que no es código (ADR 0093)", () => {
  it("separa documentos, configuración, assets y el resto", () => {
    expect(kindForPath("apps/site/docs/usar/mcp.md")).toBe("doc");
    expect(kindForPath("LICENSE")).toBe("doc");
    expect(kindForPath("package.json")).toBe("config");
    expect(kindForPath(".codarch.yml")).toBe("config");
    expect(kindForPath("Dockerfile")).toBe("config");
    expect(kindForPath("package-lock.json")).toBe("asset");
    expect(kindForPath("apps/site/docs/images/atlas.png")).toBe("asset");
    expect(kindForPath("scripts/deploy.sh")).toBe("other");
  });

  it("no pierde nada: un fichero raro entra como `other`", () => {
    expect(kindForPath("notas.xyz")).toBe("other");
    expect(kindForPath("Makefile")).toBe("config");
  });
});

describe("walkCodeAndRest", () => {
  const fileSystem = new MemoryFileSystem([
    ["/src/a.ts", "export const a = 1;\n"],
    ["/README.md", "# Hola\n"],
    ["/docs/guia.md", "[Inicio](../README.md)\n"],
    ["/assets/logo.png", "png"],
    ["/.gitignore", "ignorado/\n"],
    ["/ignorado/nota.md", "# Fuera\n"]
  ]);

  it("reparte en una sola pasada y respeta el .gitignore", () => {
    const walked = walkCodeAndRest(fileSystem);

    expect(walked.code.map((file) => file.relativePath)).toEqual(["src/a.ts"]);
    expect(walked.rest.map((file) => file.relativePath)).toEqual([
      ".gitignore",
      "README.md",
      "assets/logo.png",
      "docs/guia.md"
    ]);
  });
});

describe("measureRestFile", () => {
  const fileSystem = new MemoryFileSystem([
    ["/README.md", "# Hola\n\nMundo\n"],
    ["/assets/logo.png", "png"],
    ["/scripts/deploy.sh", "#!/bin/sh\n"]
  ]);

  it("mide bytes y líneas de lo que es texto y no lee los binarios", () => {
    const readme = measureRestFile(fileSystem, walked("/README.md"), []);
    expect(readme).toEqual({
      relativePath: "README.md",
      kind: "doc",
      bytes: 14,
      loc: 3
    });

    // Sin `stat` en memoria, un binario pesa 0: no se lee para adivinarlo.
    const logo = measureRestFile(fileSystem, walked("/assets/logo.png"), []);
    expect(logo?.bytes).toBe(0);
  });

  it("cuenta las líneas igual con CRLF y con LF (ADR 0076)", () => {
    const windows = new MemoryFileSystem([["/nota.md", "a\r\nb\r\n"]]);
    const unix = new MemoryFileSystem([["/nota.md", "a\nb\n"]]);

    expect(measureRestFile(windows, walked("/nota.md"), [])?.loc).toBe(2);
    expect(measureRestFile(unix, walked("/nota.md"), [])?.loc).toBe(2);
  });
});

describe("linkTargets", () => {
  it("se queda con los enlaces a documentos", () => {
    const source = [
      "[Guía](docs/guia.md)",
      "[Otra](../otra.md#parte)",
      "![Captura](images/atlas.png)",
      "[Web](https://example.com/guia.md)",
      "[Ancla](#seccion)"
    ].join("\n");

    expect(linkTargets(source)).toEqual(["docs/guia.md", "../otra.md#parte"]);
  });
});

describe("buildRestSnapshot", () => {
  const files: RestFile[] = [
    {
      relativePath: "docs/b.md",
      kind: "doc",
      bytes: 10,
      loc: 2,
      linkTargets: ["../README.md", "./a.md#parte"]
    },
    {
      relativePath: "docs/a.md",
      kind: "doc",
      bytes: 20,
      loc: 3,
      linkTargets: ["./b.md", "./b.md"]
    },
    {
      relativePath: "README.md",
      kind: "doc",
      bytes: 30,
      loc: 1,
      linkTargets: ["https://example.com", "docs/a.md"]
    },
    { relativePath: "package.json", kind: "config", bytes: 40, loc: 4 }
  ];

  it("es determinista y no depende del orden de entrada", () => {
    const first = buildRestSnapshot({ projectName: "demo", files });
    const second = buildRestSnapshot({
      projectName: "demo",
      files: [...files].reverse()
    });

    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(first.meta.checksum).toMatch(/^[0-9a-f]{32}$/);
    expect(second.meta.checksum).toBe(first.meta.checksum);
  });

  it("lleva el tamaño, las líneas y el tipo de cada fichero", () => {
    const cc = buildRestSnapshot({ projectName: "demo", files });

    expect(cc.lenses?.metrics?.attributes[fileId("docs/a.md")]).toEqual({
      bytes: 20,
      loc: 3
    });
    expect(cc.lenses?.rest?.nodes[fileId("docs/a.md")]).toEqual({
      kind: "doc",
      loc: 3
    });
    expect(cc.lenses?.rest?.nodes[fileId("package.json")]).toEqual({
      kind: "config",
      loc: 4
    });
  });

  it("enlaza documento con documento, con su peso, y no a sí mismo", () => {
    const cc = buildRestSnapshot({ projectName: "demo", files });
    const edges = (cc.lenses?.dependency?.edges ?? []).map((edge) => [
      edge.fromId,
      edge.toId,
      edge.attributes?.weight
    ]);

    expect(edges).toEqual([
      [fileId("README.md"), fileId("docs/a.md"), 1],
      [fileId("docs/a.md"), fileId("docs/b.md"), 2],
      [fileId("docs/b.md"), fileId("README.md"), 1],
      [fileId("docs/b.md"), fileId("docs/a.md"), 1]
    ]);
  });

  it("cambia su checksum cuando cambia un documento", () => {
    const before = buildRestSnapshot({ projectName: "demo", files });
    const after = buildRestSnapshot({
      projectName: "demo",
      files: files.map((file) =>
        file.relativePath === "README.md" ? { ...file, bytes: 31 } : file
      )
    });

    expect(after.meta.checksum).not.toBe(before.meta.checksum);
  });
});

describe("analyzeRepository y el resto", () => {
  it("lo devuelve, es determinista y no toca el checksum del código", () => {
    const root = project();
    try {
      const first = analyzeRepository(root, { git: false });
      const second = analyzeRepository(root, { git: false });

      if (!first.rest) throw new Error("falta el snapshot del resto");
      expect(first.rest.meta.checksum).toBe(second.rest?.meta.checksum);
      expect(first.restFiles).toBe(2);

      const restNodes = Object.values(first.rest.lenses?.rest?.nodes ?? {});
      expect(restNodes.length).toBe(2);
      expect(first.rest.lenses?.rest?.nodes[fileId("README.md")]?.kind).toBe("doc");
      expect(first.rest.lenses?.rest?.nodes[fileId("package.json")]?.kind).toBe(
        "config"
      );
      expect(first.rest.lenses?.rest?.nodes[fileId("src/a.ts")]).toBeUndefined();

      fs.writeFileSync(path.join(root, "README.md"), "# Demo\n\nOtra línea\n");
      const third = analyzeRepository(root, { git: false });

      expect(third.snapshot.meta.checksum).toBe(first.snapshot.meta.checksum);
      expect(third.rest?.meta.checksum).not.toBe(first.rest.meta.checksum);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("se puede apagar", () => {
    const root = project();
    try {
      const result = analyzeRepository(root, { git: false, rest: false });

      expect(result.rest).toBeNull();
      expect(result.restFiles).toBe(0);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

/** Un fichero del recorrido, con la ruta virtual que usa el análisis. */
function walked(absolutePath: string) {
  return {
    absolutePath,
    relativePath: absolutePath.replace(/^\//, "")
  };
}

/** Un proyecto pequeño en disco: código, un documento y un manifiesto. */
function project(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-rest-"));
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({ name: "rest-demo" })
  );
  fs.mkdirSync(path.join(root, "src"));
  fs.writeFileSync(path.join(root, "src", "a.ts"), "export const a = 1;\n");
  fs.writeFileSync(path.join(root, "README.md"), "# Demo\n");
  return root;
}
