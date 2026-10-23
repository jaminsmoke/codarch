import path from "node:path";
import { describe, expect, it } from "vitest";
import { rehypeDocLinks } from "../src/lib/rehype-doc-links.mjs";

const docs = path.resolve(import.meta.dirname, "../docs");

function enlace(href: string): any {
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
  it("lleva un documento relativo a su ruta de Starlight", () => {
    expect(resolver("index.md", "adr/roadmap.md")).toBe(
      "/codarch/docs/adr/roadmap/"
    );
    expect(resolver("adr/index.md", "0001-0010/0001-clean-room-con-ccjson.md")).toBe(
      "/codarch/docs/adr/0001-0010/0001-clean-room-con-ccjson/"
    );
  });

  it("conserva el ancla y resuelve las carpetas", () => {
    expect(resolver("index.md", "model.md#el-modelo")).toBe(
      "/codarch/docs/model/#el-modelo"
    );
    expect(
      resolver(
        "adr/0041-0050/0046-los-documentos-con-starlight.md",
        "../../guideline/entradilla.md#futuro"
      )
    ).toBe("/codarch/guia/#futuro");
  });

  it("añade la base a los enlaces internos absolutos", () => {
    expect(resolver("model.md", "/guia/")).toBe("/codarch/guia/");
  });

  it("manda al repo lo que no es un documento", () => {
    expect(resolver("model.md", "images/atlas.png")).toBe(
      "https://github.com/jaminsmoke/codarch/blob/main/apps/site/docs/images/atlas.png"
    );
    expect(resolver("design/map.md", "../../design/preview-riesgo.png")).toBe(
      "https://github.com/jaminsmoke/codarch/blob/main/apps/site/docs/design/preview-riesgo.png"
    );
    expect(resolver("model.md", "../README.md")).toBe(
      "https://github.com/jaminsmoke/codarch/blob/main/apps/site/docs/README.md"
    );
  });
});
