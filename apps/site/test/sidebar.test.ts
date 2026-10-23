import { describe, expect, it } from "vitest";
import { sidebar } from "../src/sidebar.mjs";

const grupos = sidebar();
const producto = grupos.find((grupo) => grupo.label === "El producto");
const decisiones = grupos.find((grupo) => grupo.label === "Las decisiones");
const bloque = decisiones?.items?.find(
  (item) => item.label === "0041–0050"
);

describe("la sidebar de los documentos", () => {
  it("tiene la guía, el producto y las decisiones", () => {
    expect(grupos.map((grupo) => grupo.label)).toEqual([
      "La guía",
      "El producto",
      "Las decisiones"
    ]);
  });

  it("pone el índice y el producto en su orden", () => {
    expect(producto?.items?.map((item) => item.slug)).toEqual([
      "docs/index",
      "docs/adr/roadmap",
      "docs/model",
      "docs/rules",
      "docs/mcp",
      "docs/migration",
      "docs/design/map"
    ]);
  });

  it("agrupa los ADR por carpeta de diez", () => {
    expect(decisiones?.items?.some((item) => item.slug === "docs/adr/index")).toBe(
      true
    );
    expect(bloque?.items?.some((item) => item.slug?.endsWith("0046-los-documentos-con-starlight"))).toBe(
      true
    );
    expect(bloque?.items?.some((item) => item.slug?.endsWith("0046-los-documentos-con-starlight.changelog"))).toBe(
      true
    );
  });
});
