import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  debtColor,
  type RenderFile,
  type RenderModel
} from "@codarch/render/browser";
import { mapColorFor } from "../src/map";
import { paintNotice } from "../src/paintNotice";
import { Legend } from "../src/panels/Legend";

/** Un fichero con la deuda de lint que mira la lente. */
function file(lint: number): RenderFile {
  return { lint } as RenderFile;
}

function model(lintMax: number, files: RenderFile[]): RenderModel {
  return {
    metrics: [],
    sections: [],
    files,
    lintMax,
    fileCount: files.length
  } as unknown as RenderModel;
}

describe("la lente del lint (ADR 0094 y 0099)", () => {
  it("pinta cada fichero con su deuda, en la escala del mapa", () => {
    const painted = model(2, [file(0), file(2)]);

    expect(mapColorFor(file(2), "lint", painted, null, new Map())).toBe(
      debtColor(2, 2)
    );
    expect(mapColorFor(file(0), "lint", painted, null, new Map())).toBe(
      debtColor(0, 2)
    );
    // El extremo limpio tiene color propio: la lente se ve aunque no haya deuda.
    expect(debtColor(0, 2)).not.toBe("#ebe7df");
  });

  it("la leyenda dice cuántos ficheros tienen hallazgos y su escala", () => {
    const html = renderToStaticMarkup(
      createElement(Legend, {
        colorMode: "lint",
        migration: null,
        model: model(2, [file(0), file(2)]),
        hasLint: true
      })
    );

    expect(html).toContain("Leyenda · lint");
    expect(html).toContain("1 de 2 ficheros con hallazgos");
    expect(html).toContain("limpio");
  });

  it("un proyecto medido y limpio lo dice y pinta su escala", () => {
    const html = renderToStaticMarkup(
      createElement(Legend, {
        colorMode: "lint",
        migration: null,
        model: model(0, [file(0)]),
        hasLint: true
      })
    );

    expect(html).toContain("ningún fichero con hallazgos");
    // La escala se dibuja igual: limpio también es un color de la lente.
    expect(html).toContain("gradient lint");
  });

  it("sin artefacto la leyenda no se dibuja: no hay deuda que leer", () => {
    const html = renderToStaticMarkup(
      createElement(Legend, {
        colorMode: "lint",
        migration: null,
        model: model(0, [file(0)]),
        hasLint: false
      })
    );

    expect(html).not.toContain("Leyenda · lint");
  });

  it("sin artefacto, la banda dice que todos los bloques salen limpios", () => {
    expect(paintNotice("lint", null, null, false)).toMatchObject({
      label: "sin lint medido"
    });
    expect(paintNotice("lint", null, null, true)).toBeNull();
  });
});
