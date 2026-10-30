import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { RenderFile } from "@codarch/render/browser";
import { RiskBreakdown, riskNote } from "../src/FileSections";

/** Las cuatro partes con los pesos dados; valor, p95 y parte no importan aquí. */
function parts(
  weights: [number, number, number, number]
): RenderFile["riskParts"] {
  const part = (weight: number) => ({
    value: 0,
    p95: 0,
    norm: 0,
    weight,
    share: 0
  });
  return {
    complexity: part(weights[0]),
    churn: part(weights[1]),
    size: part(weights[2]),
    lint: part(weights[3])
  };
}

describe("la nota del riesgo", () => {
  it("con lint medido, dice los cuatro pesos", () => {
    const note = riskNote(parts([0.4, 0.256, 0.144, 0.2]), true, []);

    expect(note).toBe(
      "complejidad 40 % · churn 25,6 % · tamaño 14,4 % · lint 20 %, normalizado por el p95 de cada señal."
    );
  });

  it("sin artefacto, dice que el lint no se midió y lo que pesará", () => {
    const note = riskNote(parts([0.5, 0.32, 0.18, 0]), false, []);

    expect(note).toContain("Complejidad 50 % · churn 32 % · tamaño 18 %");
    expect(note).toContain("El lint no se midió");
    expect(note).toContain("20 %");
    expect(note).toContain("40 % · 25,6 % · 14,4 %");
  });

  it("si falta churn con lint medido, lo dice y no inventa un peso", () => {
    const note = riskNote(parts([0.4, 0, 0.144, 0.2]), true, ["churn"]);

    expect(note).toBe("Sin churn: su peso se reparte entre las demás señales.");
  });

  it("sin señales del snapshot, no hay riesgo que repartir", () => {
    expect(
      riskNote(parts([0, 0, 0, 0]), false, ["complexity", "churn", "size"])
    ).toBe("Este snapshot no trae las señales del riesgo, y el lint no se midió.");
  });
});

/** El HTML del desglose para las partes dadas. */
function html(weights: [number, number, number, number]): string {
  const file = { riskParts: parts(weights) } as RenderFile;
  return renderToStaticMarkup(createElement(RiskBreakdown, { file }));
}

describe("las barras del riesgo", () => {
  it("siempre enseñan la fila del lint; sin artefacto dice «sin medir»", () => {
    const markup = html([0.5, 0.32, 0.18, 0]);

    expect(markup).toContain("Lint");
    expect(markup).toContain("sin medir");
    expect(markup).toContain("El lint no se midió");
  });

  it("con artefacto, la fila del lint lleva su 20 %", () => {
    const markup = html([0.4, 0.256, 0.144, 0.2]);

    expect(markup).not.toContain("sin medir");
    expect(markup).toContain("20 %");
    expect(markup).toContain("lint 20 %");
  });
});
