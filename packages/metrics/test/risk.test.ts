import { describe, expect, it } from "vitest";
import { riskScores } from "../src/index";

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
