import { describe, expect, it } from "vitest";
import { KIND_COLOR } from "@codarch/render/browser";
import type { RenderFile, RenderModel } from "@codarch/render/browser";
import { mapColorFor } from "../src/map";

/** Un fichero del resto con lo poco que mira el color. */
function restFile(kind: RenderFile["kind"], nodeId = "n"): RenderFile {
  return { nodeId, kind, section: 0 } as RenderFile;
}

function model(files: RenderFile[]): RenderModel {
  return { metrics: [], sections: [], files } as unknown as RenderModel;
}

describe("el color por tipo del resto", () => {
  it("pinta cada tipo con su tono", () => {
    const painted = mapColorFor(
      restFile("doc"),
      "kind",
      model([]),
      null,
      new Map()
    );
    expect(painted).toBe(KIND_COLOR.doc);
  });

  it("un fichero sin tipo sale como `other`", () => {
    const painted = mapColorFor(
      restFile(null),
      "kind",
      model([]),
      null,
      new Map()
    );
    expect(painted).toBe(KIND_COLOR.other);
  });
});
