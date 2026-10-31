import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { RenderFile, RenderModel } from "@codarch/render/browser";
import type { CcRestKind } from "@codarch/schema/browser";
import { KIND_LABEL } from "../src/labels";
import { RestKinds } from "../src/panels/RestKinds";

function file(path: string, kind: CcRestKind): RenderFile {
  return {
    index: 0,
    nodeId: path,
    path,
    name: path.split("/").pop() ?? path,
    kind
  } as unknown as RenderFile;
}

function markup(kinds: Array<[string, CcRestKind]>): string {
  return renderToStaticMarkup(
    createElement(RestKinds, {
      model: {
        files: kinds.map(([path, kind]) => file(path, kind))
      } as unknown as RenderModel
    })
  );
}

describe("los estratos del resto (M64)", () => {
  it("reparte por tipo con su cuenta y su leyenda", () => {
    const html = markup([
      ["README.md", "doc"],
      ["docs/guia.md", "doc"],
      ["tsconfig.json", "config"],
      ["logo.png", "asset"]
    ]);

    expect(html).toContain("Estratos");
    expect(html).toContain(KIND_LABEL.doc);
    expect(html).toContain(KIND_LABEL.config);
    expect(html).toContain(KIND_LABEL.asset);
    expect(html).toContain('title="Documentos: 2 ficheros"');
    expect(html).toContain('collapsible-count">3');
  });

  it("no inventa tipos sin ficheros y no pinta nada sin resto", () => {
    const html = markup([["README.md", "doc"]]);

    expect(html).not.toContain(KIND_LABEL.asset);
    expect(markup([])).toBe("");
  });
});
