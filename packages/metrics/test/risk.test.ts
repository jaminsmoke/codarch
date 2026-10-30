import { describe, expect, it } from "vitest";
import {
  RISK_GAMMA,
  lintScore,
  lintScores,
  riskBreakdown,
  riskScores
} from "../src/index";

describe("riskScores", () => {
  it("devuelve 0 cuando no hay señales", () => {
    expect(
      riskScores([
        { complexity: 0, churn: 0, size: 0 },
        { complexity: 0, churn: 0, size: 0 }
      ])
    ).toEqual([0, 0]);
  });

  it("normaliza por p95 y enciende solo los outliers", () => {
    const scores = riskScores(
      Array.from({ length: 20 }, (_, index) => ({
        complexity: index + 1,
        churn: 0,
        size: 0
      }))
    );

    expect(scores[19]).toBe(1);
    expect(scores[0]).toBeLessThan(0.01);
    expect(scores[10]).toBeGreaterThan(scores[0] ?? 0);
    expect(scores[10]).toBeLessThan(scores[19] ?? 0);
  });

  it("renormaliza los pesos si falta churn", () => {
    const scores = riskScores(
      Array.from({ length: 20 }, (_, index) => ({
        complexity: index + 1,
        churn: 0,
        size: 0
      }))
    );

    expect(scores[19]).toBe(1);
    expect(scores[0]).toBeLessThan(0.01);
  });

  it("combina las señales y crece con ellas", () => {
    const scores = riskScores(
      Array.from({ length: 20 }, (_, index) => ({
        complexity: index + 1,
        churn: index + 1,
        size: index + 1
      }))
    );

    expect(scores[19]).toBe(1);
    expect(scores[10]).toBeGreaterThan(scores[0] ?? 0);
    expect(scores[19]).toBeGreaterThan(scores[10] ?? 0);
  });

  it("es determinista", () => {
    const input = [
      { complexity: 4, churn: 2, size: 20 },
      { complexity: 9, churn: 8, size: 40 }
    ];
    expect(riskScores(input)).toEqual(riskScores(input));
  });
});

describe("riskBreakdown", () => {
  it("da el mismo riesgo que riskScores", () => {
    const input = [
      { complexity: 4, churn: 2, size: 20 },
      { complexity: 9, churn: 8, size: 40 },
      { complexity: 0, churn: 0, size: 0 }
    ];
    expect(riskBreakdown(input).map((entry) => entry.risk)).toEqual(
      riskScores(input)
    );
  });

  it("reparte los pesos entre las señales presentes", () => {
    const [entry] = riskBreakdown([
      { complexity: 10, churn: 5, size: 100 },
      { complexity: 2, churn: 1, size: 10 }
    ]);
    const parts = entry!.parts;

    expect(
      parts.complexity.weight + parts.churn.weight + parts.size.weight
    ).toBeCloseTo(1);
    expect(parts.complexity.weight).toBeCloseTo(0.5);
    expect(parts.churn.weight).toBeCloseTo(0.32);
    expect(parts.size.weight).toBeCloseTo(0.18);
  });

  it("deja a cero la señal que no existe y renormaliza el resto", () => {
    const files = Array.from({ length: 20 }, (_, index) => ({
      complexity: index + 1,
      churn: 0,
      size: 0
    }));
    const breakdown = riskBreakdown(files);
    const top = breakdown[19]!;

    expect(top.parts.complexity.weight).toBeCloseTo(1);
    expect(top.parts.churn.weight).toBe(0);
    expect(top.parts.size.weight).toBe(0);
    expect(top.parts.churn.share).toBe(0);
  });

  it("normaliza cada señal por su p95", () => {
    const files = Array.from({ length: 20 }, (_, index) => ({
      complexity: index + 1,
      churn: index + 1,
      size: (index + 1) * 10
    }));
    const [entry] = riskBreakdown(files);
    const parts = entry!.parts;

    expect(parts.complexity.p95).toBe(19);
    expect(parts.churn.p95).toBe(19);
    expect(parts.size.p95).toBe(190);
    expect(parts.complexity.norm).toBeCloseTo(1 / 19);
    expect(parts.churn.norm).toBeCloseTo(1 / 19);
    expect(parts.size.norm).toBeCloseTo(10 / 190);
  });

  it("con lint, reparte los pesos de la cuarta señal", () => {
    const files = Array.from({ length: 20 }, (_, index) => ({
      complexity: index + 1,
      churn: index + 1,
      size: (index + 1) * 10,
      lint: index
    }));
    const [first] = riskBreakdown(files);
    const last = riskBreakdown(files)[19];
    const parts = first!.parts;

    expect(parts.complexity.weight).toBeCloseTo(0.4);
    expect(parts.churn.weight).toBeCloseTo(0.256);
    expect(parts.size.weight).toBeCloseTo(0.144);
    expect(parts.lint.weight).toBeCloseTo(0.2);
    expect(parts.lint.p95).toBe(18);
    expect(parts.lint.norm).toBe(0);
    // El que más deuda tiene pasa del p95: tope 1 en la normalización.
    expect(last!.parts.lint.norm).toBe(1);
  });

  it("sin deuda de lint, el peso vuelve a la cuenta de siempre", () => {
    const files = Array.from({ length: 20 }, (_, index) => ({
      complexity: index + 1,
      churn: index + 1,
      size: (index + 1) * 10,
      lint: 0
    }));
    const [entry] = riskBreakdown(files);
    const parts = entry!.parts;

    expect(parts.complexity.weight).toBeCloseTo(0.5);
    expect(parts.lint.weight).toBe(0);
    expect(parts.lint.share).toBe(0);
  });

  it("el lint suma al riesgo de quien tiene hallazgos", () => {
    const [clean, dirty] = riskBreakdown([
      { complexity: 10, churn: 5, size: 100 },
      { complexity: 10, churn: 5, size: 100, lint: 4 }
    ]);

    expect(dirty!.risk).toBeGreaterThan(clean!.risk);
    expect(clean!.risk).toBeCloseTo(Math.pow(0.8, RISK_GAMMA));
  });

  it("un error pesa cuatro avisos", () => {
    expect(lintScore(1, 0)).toBe(1);
    expect(lintScore(0, 4)).toBe(1);
    expect(lintScore(2, 2)).toBe(2.5);
    expect(lintScore(-1, Number.NaN)).toBe(0);
    expect(
      lintScores({ "a.ts": { errors: 2, warnings: 4 } })
    ).toEqual({ "a.ts": 3 });
  });

  it("sus partes suman el riesgo antes de gamma", () => {
    const [entry] = riskBreakdown([
      { complexity: 10, churn: 4, size: 100 },
      { complexity: 3, churn: 1, size: 20 }
    ]);
    const parts = entry!.parts;
    const raw = parts.complexity.share + parts.churn.share + parts.size.share;

    expect(entry!.risk).toBeCloseTo(Math.pow(raw, RISK_GAMMA));
  });
});
