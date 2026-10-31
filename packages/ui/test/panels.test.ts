import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { dedentLines } from "../src/panels";
import { DependenciesSection } from "../src/panels/InspectorSections";

describe("dedentLines", () => {
  it("quita la sangría común y conserva la relativa", () => {
    expect(
      dedentLines([
        "    export async function checkSource(",
        "      current: string",
        "    ): Promise<boolean> {"
      ])
    ).toEqual([
      "export async function checkSource(",
      "  current: string",
      "): Promise<boolean> {"
    ]);
  });

  it("deja en blanco las líneas que ya lo estaban", () => {
    expect(dedentLines(["  const a = 1;", "", "  return a;"])).toEqual([
      "const a = 1;",
      "",
      "return a;"
    ]);
  });

  it("no toca una muestra que ya empieza en la columna 0", () => {
    const lines = ["const a = 1;", "  return a;"];
    expect(dedentLines(lines)).toEqual(lines);
  });

  it("devuelve una copia, no la lista que recibe", () => {
    const lines = ["const a = 1;"];
    expect(dedentLines(lines)).not.toBe(lines);
  });
});

describe("Dependencias", () => {
  it("lee los cruces FFI en su propia lista", () => {
    const markup = renderToStaticMarkup(
      createElement(DependenciesSection, {
        outgoing: [],
        incoming: [],
        edges: [{ direction: "out", path: "native/bridge.rs", kind: "ffi" }],
        onSelectPath: () => {}
      })
    );

    expect(markup).toContain("Cruces FFI");
    expect(markup).toContain("native/bridge.rs");
    expect(markup).toContain("ffi");
    // Una ficha con solo un cruce sigue abriendo la sección.
    expect(markup).toContain("section-deps");
  });
});
