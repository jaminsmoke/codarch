import path from "node:path";
import { describe, expect, it } from "vitest";
import { rehypeDocLinks } from "../src/lib/rehype-doc-links.mjs";

const docs = path.resolve(import.meta.dirname, "../docs");

/** Un enlace del markdown, con el texto que lo envuelve. */
interface Enlace {
  type: "element";
  tagName: "a";
  properties: { href: string };
  children: [{ type: "text"; value: string }];
}

/** El documento de prueba: la raíz con un solo enlace dentro. */
interface Documento {
  type: "root";
  children: [Enlace];
}

function enlace(href: string): Documento {
  return {
    type: "root",
    children: [
      {
        type: "element",
        tagName: "a",
        properties: { href },
        children: [{ type: "text", value: "x" }]
      }
    ]
  };
}

function resolver(desde: string, href: string): string {
  const tree = enlace(href);
  rehypeDocLinks({ docsRoot: docs, base: "/codarch" })(tree, {
    path: path.join(docs, desde)
  });
  return tree.children[0].properties.href;
}

describe("los enlaces del markdown", () => {
  it("lleva un documento relativo a la ruta de su zona", () => {
    expect(resolver("index.md", "usar/webapp.md")).toBe(
      "/codarch/docs/usar/webapp/"
    );
    expect(resolver("index.md", "desarrollo/roadmap.md")).toBe(
      "/codarch/desarrollo/roadmap/"
    );
    expect(
      resolver("desarrollo/adr/index.md", "0001-0010/0001-clean-room-con-ccjson.md")
    ).toBe("/codarch/desarrollo/adr/0001-0010/0001-clean-room-con-ccjson/");
    expect(resolver("desarrollo/model.md", "../usar/reglas.md")).toBe(
      "/codarch/docs/usar/reglas/"
    );
    expect(resolver("en/usar/mcp.md", "reglas.md")).toBe(
      "/codarch/en/docs/usar/reglas/"
    );
  });

  it("conserva el ancla y resuelve las carpetas", () => {
    expect(resolver("index.md", "desarrollo/model.md#el-modelo")).toBe(
      "/codarch/desarrollo/model/#el-modelo"
    );
    expect(
      resolver(
        "desarrollo/adr/0041-0050/0046-los-documentos-con-starlight.md",
        "../../guideline/entradilla.md#futuro"
      )
    ).toBe("/codarch/desarrollo/guia/#futuro");
  });

  it("añade la base a los enlaces internos absolutos", () => {
    expect(resolver("desarrollo/model.md", "/desarrollo/guia/")).toBe(
      "/codarch/desarrollo/guia/"
    );
    expect(resolver("en/desarrollo/model.md", "/docs/usar/mcp/")).toBe(
      "/codarch/en/docs/usar/mcp/"
    );
  });

  it("manda al repo lo que no es un documento", () => {
    expect(resolver("desarrollo/model.md", "../images/atlas.png")).toBe(
      "https://github.com/jaminsmoke/codarch/blob/main/apps/site/docs/images/atlas.png"
    );
    expect(resolver("desarrollo/model.md", "../../README.md")).toBe(
      "https://github.com/jaminsmoke/codarch/blob/main/apps/site/docs/README.md"
    );
  });
});
