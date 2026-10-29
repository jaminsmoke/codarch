import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCcJson } from "@codarch/schema";
import { buildRenderModel, KIND_COLOR, kindColor } from "../src/index";

const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/render.cc.json", import.meta.url), "utf8")
) as Record<string, unknown>;

describe("el color por tipo", () => {
  it("da un tono a cada tipo y no repite ninguno", () => {
    const kinds = ["doc", "config", "asset", "other"] as const;
    const colors = kinds.map((kind) => kindColor(kind));

    expect(colors).toEqual(kinds.map((kind) => KIND_COLOR[kind]));
    expect(new Set(colors).size).toBe(kinds.length);
  });

  it("lo que no reconoce lo pinta como `other`", () => {
    expect(kindColor("script" as never)).toBe(KIND_COLOR.other);
  });

  it("lleva el tipo de la lente `rest` al modelo, y deja el código en `null`", () => {
    const copy = structuredClone(fixture) as {
      lenses?: Record<string, unknown>;
    };
    copy.lenses = {
      ...copy.lenses,
      rest: {
        nodes: { a: { kind: "doc" }, readme: { kind: "config" } }
      }
    };

    const result = buildRenderModel(parseCcJson(copy));

    expect(result.files.find((file) => file.name === "a.ts")?.kind).toBe("doc");
    expect(result.files.find((file) => file.name === "README.md")?.kind).toBe(
      "config"
    );
    expect(result.files.find((file) => file.name === "b.ts")?.kind).toBeNull();
  });
});
