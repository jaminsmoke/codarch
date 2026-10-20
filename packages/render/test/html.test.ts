import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCcJson } from "@codarch/schema";
import { buildRenderModel, renderHtml } from "../src/index";

const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/render.cc.json", import.meta.url), "utf8")
) as unknown;

function html(): string {
  return renderHtml(buildRenderModel(parseCcJson(fixture)));
}

describe("renderHtml", () => {
  it("produce un documento autocontenido con mapa y datos", () => {
    const output = html();

    expect(output.startsWith("<!doctype html>")).toBe(true);
    expect(output).toContain('<svg id="map"');
    expect(output).toContain('data-i="0"');
    expect(output).toContain('data-nm="src/only"');
    expect(output).not.toContain("<link");
    expect(output).not.toContain("src=\"");
  });

  it("escapa el HTML de los metadatos", () => {
    const output = html();

    expect(output).toContain(
      "Demo &lt;/script&gt;&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;"
    );
    expect(output).not.toContain("Demo </script>");
  });

  it("no permite que los datos rompan el bloque script", () => {
    const output = html();

    expect(output.match(/<\/script/gi)).toHaveLength(2);
    expect(output).toContain("\\u003c/script");
  });

  it("serializa un payload JSON reutilizable por el cliente", () => {
    const output = html();
    const match = output.match(
      /<script id="codarch-data" type="application\/json">([\s\S]*?)<\/script>/
    );
    expect(match).not.toBeNull();

    const data = JSON.parse(match?.[1] ?? "") as {
      files: unknown[];
      dirs: string[];
      edges: number[];
      meta: { project: string };
    };

    expect(data.files).toHaveLength(3);
    expect(data.dirs).toEqual(["src/only"]);
    expect(data.edges).toEqual([0, 1, 1, 0]);
    expect(data.meta.project).toContain("</script>");
  });

  it("es determinista", () => {
    expect(html()).toBe(html());
  });
});
