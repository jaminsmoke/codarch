import { describe, expect, it } from "vitest";
import {
  DOC_RULES,
  docsFindings,
  readFrontmatter,
  type DocsRulesFile
} from "../src/index";

function doc(path: string, over: Partial<DocsRulesFile> = {}): DocsRulesFile {
  return { path, kind: "doc", ...over };
}

function messagesOf(
  result: ReturnType<typeof docsFindings>,
  path: string
): ReturnType<typeof docsFindings>[number]["messages"] {
  return result.find((file) => file.path === path)?.messages ?? [];
}

describe("las reglas del resto", () => {
  it("un enlace roto señala el destino, no un fichero que no está", () => {
    const result = docsFindings({
      files: [
        doc("README.md", { links: ["docs/guia.md"] }),
        doc("docs/guia.md", {
          links: [
            "../README.md",
            "https://ejemplo.com/x",
            "#instalar",
            "/docs/otra",
            "falta.md",
            "anexo.md#parte"
          ]
        }),
        doc("docs/anexo.md")
      ]
    });

    const messages = messagesOf(result, "docs/guia.md");
    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual({
      rule: DOC_RULES.brokenLink,
      severity: "error",
      message: "el enlace «falta.md» no llega a ningún fichero del árbol"
    });
    // Los externos, las anclas y las rutas del sitio no se juzgan.
    expect(messagesOf(result, "README.md")).toEqual([]);
  });

  it("un documento al que no llega nadie se dice, salvo que sea una entrada", () => {
    const result = docsFindings({
      files: [
        doc("README.md"),
        doc("docs/a.md", { links: ["b.md"] }),
        doc("docs/b.md")
      ],
      config: { entries: ["README.md"] }
    });

    expect(messagesOf(result, "docs/a.md")).toEqual([
      {
        rule: DOC_RULES.orphan,
        severity: "info",
        message: "ningún documento enlaza a este"
      }
    ]);
    expect(messagesOf(result, "README.md")).toEqual([]);
    expect(messagesOf(result, "docs/b.md")).toEqual([]);
  });

  it("sin entradas declaradas no se habla de huérfanos", () => {
    // Un README raíz nunca recibe enlaces: avisar sería ruido desde el primer
    // análisis (ADR 0105, alternativas descartadas).
    const result = docsFindings({ files: [doc("README.md"), doc("LICENSE.md")] });

    expect(result.flatMap((file) => file.messages)).toEqual([]);
  });

  it("el frontmatter se juzga solo donde un glob lo pide", () => {
    const result = docsFindings({
      files: [
        doc("docs/guia.md", { text: "---\ntitle: Guía\n---\n\nHola\n" }),
        doc("docs/sin.md", { text: "# Sin frontmatter\n" }),
        doc("docs/roto.md", { text: "---\ntitle: sin cerrar\n" }),
        doc("docs/mudo.md"),
        doc("otro/x.md", { text: "nada que ver\n" })
      ],
      config: {
        frontmatter: [
          { files: "docs/**/*.md", required: ["title", "description"] }
        ]
      }
    });

    expect(messagesOf(result, "docs/guia.md")).toEqual([
      {
        rule: DOC_RULES.frontmatter,
        severity: "error",
        message: "el frontmatter no declara «description»"
      }
    ]);
    expect(messagesOf(result, "docs/sin.md")[0]?.message).toBe(
      "no tiene frontmatter"
    );
    expect(messagesOf(result, "docs/roto.md")[0]?.message).toBe(
      "el frontmatter no se puede leer"
    );
    // Sin texto no se juzga, y fuera del glob tampoco.
    expect(messagesOf(result, "docs/mudo.md")).toEqual([]);
    expect(messagesOf(result, "otro/x.md")).toEqual([]);
  });

  it("las gemelas se buscan por la ruta, en las dos direcciones", () => {
    const result = docsFindings({
      files: [
        doc("docs/guia.md"),
        doc("docs/en/guia.md"),
        doc("docs/solo.md"),
        doc("docs/en/otra.md")
      ],
      config: { twins: [{ from: "docs", to: "docs/en" }] }
    });

    expect(messagesOf(result, "docs/guia.md")).toEqual([]);
    expect(messagesOf(result, "docs/en/guia.md")).toEqual([]);
    expect(messagesOf(result, "docs/solo.md")).toEqual([
      {
        rule: DOC_RULES.twinMissing,
        severity: "warn",
        message: "no tiene gemela en «docs/en/solo.md»"
      }
    ]);
    expect(messagesOf(result, "docs/en/otra.md")).toEqual([
      {
        rule: DOC_RULES.twinMissing,
        severity: "warn",
        message: "no tiene gemela en «docs/otra.md»"
      }
    ]);
  });

  it("la severidad se puede cambiar y el orden de entrada no cambia nada", () => {
    const files = [
      doc("docs/a.md"),
      doc("docs/b.md", { links: ["a.md"] }),
      doc("docs/c.md", { links: ["falta.md"] })
    ];
    const config = { entries: ["README.md"], severity: { "doc/orphan": "error" } } as const;

    const left = docsFindings({ files, config: { ...config, severity: { ...config.severity } } });
    const right = docsFindings({
      files: [...files].reverse(),
      config: { ...config, severity: { ...config.severity } }
    });

    expect(left).toEqual(right);
    // `b` enlaza a `a`, así que el que no recibe enlaces es `b`.
    expect(messagesOf(left, "docs/b.md")[0]?.severity).toBe("error");
    // Los ficheros limpios también vuelven: son la cobertura de la medida.
    expect(left.map((file) => file.path)).toEqual([
      "docs/a.md",
      "docs/b.md",
      "docs/c.md"
    ]);
    expect(messagesOf(left, "docs/a.md")).toEqual([]);
    expect(messagesOf(left, "docs/c.md")[0]?.rule).toBe(DOC_RULES.brokenLink);
  });
});

describe("la lectura del frontmatter", () => {
  it("distingue sin bloque, bloque cerrado y bloque roto", () => {
    expect(readFrontmatter("# Hola\n")).toEqual({ status: "missing", keys: [] });
    expect(readFrontmatter("---\ntitle: Uno\n---\n")).toEqual({
      status: "ok",
      keys: ["title"]
    });
    expect(readFrontmatter("---\ntitle: Uno\n")).toEqual({
      status: "broken",
      keys: []
    });
  });

  it("solo cuenta las claves de primer nivel, en su orden", () => {
    const head = readFrontmatter(
      "---\r\ntitle: Uno\r\ndescription: Dos\r\nsidebar:\r\n  label: Tres\r\n  order: 4\r\n---\r\n"
    );

    expect(head.keys).toEqual(["title", "description", "sidebar"]);
  });
});
