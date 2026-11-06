import { describe, expect, it } from "vitest";
import {
  LINT_WARNING_WEIGHT,
  RISK_GAMMA,
  RISK_LINT_ALPHA,
  RISK_LINT_DSAT,
  RISK_WEIGHTS,
  lintScore,
  lintScores,
  riskBreakdown,
  riskScores,
  type RiskBreakdown,
  type RiskLintCounts,
  type RiskLintCoverage,
  type RiskLintInput,
  type RiskLintReason,
  type RiskSignals
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

  it("sin artefacto, los pesos son los de siempre y no hay cuarta señal", () => {
    const files = Array.from({ length: 20 }, (_, index) => ({
      complexity: index + 1,
      churn: index + 1,
      size: (index + 1) * 10
    }));
    const [entry] = riskBreakdown(files);
    const parts = entry!.parts;

    expect(parts.complexity.weight).toBeCloseTo(0.5);
    expect(parts.lint.weight).toBe(0);
    expect(parts.lint.share).toBe(0);
    expect(entry!.lint.normalized).toBeNull();
    expect(entry!.lint.clean).toBe(false);
    expect(entry!.lint.status).toBe("unmeasured");
  });

  it("sus partes de base suman el riesgo antes de gamma", () => {
    const [entry] = riskBreakdown([
      { complexity: 10, churn: 4, size: 100 },
      { complexity: 3, churn: 1, size: 20 }
    ]);
    const parts = entry!.parts;
    const raw = parts.complexity.share + parts.churn.share + parts.size.share;

    expect(entry!.base).toBe(raw);
    expect(entry!.risk).toBeCloseTo(Math.pow(raw, RISK_GAMMA));
    expect(entry!.score).toBeCloseTo(100 * entry!.risk, 12);
  });

  it("un error pesa cuatro avisos", () => {
    expect(lintScore(1, 0)).toBe(1);
    expect(lintScore(0, 4)).toBe(1);
    expect(lintScore(2, 2)).toBe(2.5);
    expect(lintScore(-1, Number.NaN)).toBe(0);
    expect(lintScores({ "a.ts": { errors: 2, warnings: 4 } })).toEqual({
      "a.ts": 3
    });
  });
});

describe("invariancia de la base", () => {
  const cohort: RiskSignals[] = [
    ...Array.from({ length: 20 }, (_, index) => ({
      complexity: index + 1,
      churn: (index + 1) * 2,
      size: index === 3 ? 0 : (index + 1) * 10
    })),
    { complexity: 0, churn: 0, size: 0 },
    { complexity: -4, churn: 2, size: 8 },
    { complexity: 3, churn: 0, size: 0 }
  ];

  it("sin lint coincide con la implementación histórica, valor a valor", () => {
    expect(RISK_GAMMA).toBe(1.7);
    expect(RISK_WEIGHTS).toEqual({ complexity: 0.5, churn: 0.32, size: 0.18 });
    expect(riskBreakdown(cohort).map((entry) => entry.risk)).toEqual(
      historicalBaseRisk(cohort)
    );
  });

  it("el tercer fichero de veinte conserva B = 3/19", () => {
    const files = Array.from({ length: 20 }, (_, index) => ({
      complexity: index + 1,
      churn: 0,
      size: 0
    }));
    const third = riskBreakdown(files)[2]!;

    expect(third.parts.complexity.p95).toBe(19);
    expect(third.base).toBeCloseTo(3 / 19, 12);
    expect(third.risk).toBe(historicalBaseRisk(files)[2]);
    expect(round6(third.score)).toBe(round6(100 * Math.pow(3 / 19, 1.7)));
  });

  it("lint desconocido, no fresco o ausente no mueve ni un bit el riesgo", () => {
    const baseline = riskBreakdown(cohort).map((entry) => entry.risk);
    const cases: RiskSignals[][] = [
      cohort.map((file) => ({ ...file, lintView: null })),
      cohort.map((file) => ({ ...file, lint: 4 })),
      cohort.map((file) => ({
        ...file,
        lintView: observation({ fresh: false, errors: 4, warnings: 8, info: 3 })
      })),
      cohort.map((file) => ({
        ...file,
        lintView: observation({ fresh: null, errors: 4, warnings: 8, info: 3 })
      })),
      cohort.map((file) => ({ ...file, lint: 4 })),
    ];

    for (const files of cases) {
      expect(riskBreakdown(files).map((entry) => entry.risk)).toEqual(baseline);
    }
    expect(
      riskBreakdown(
        cohort.map((file) => ({ ...file, lint: 4 })),
        { lint: false }
      ).map((entry) => entry.risk)
    ).toEqual(baseline);
  });
});

describe("término de lint", () => {
  it("α y Dsat son las constantes provisionales, no números sueltos", () => {
    expect(RISK_LINT_ALPHA).toBe(0.2);
    expect(RISK_LINT_DSAT).toBe(10);
    expect(LINT_WARNING_WEIGHT).toBe(0.25);
  });

  it("B = 0,5 y D = 0 da 30,778610 y no declara limpio", () => {
    const entry = at(0.5, observation({ errors: 0, warnings: 0, info: 0 }));

    expect(entry.base).toBeCloseTo(0.5, 12);
    expect(entry.lint.normalized).toBe(0);
    expect(entry.lint.debt).toBe(0);
    expect(round6(entry.score)).toBe(30.77861);
    expect(entry.lint.clean).toBe(false);
    expect(entry.lint.confidence).toBe("observedMinimum");
    expect(entry.lint.status).toBe("partial");
    expect(entry.risk).toBe(at(0.5).risk);
  });

  it("B = 0,5 y D = 4 da 39,612075", () => {
    const entry = at(0.5, observation({ errors: 3, warnings: 4, info: 9 }));

    expect(entry.lint.debt).toBe(4);
    expect(entry.lint.normalized).toBeCloseTo(0.4, 12);
    expect(round6(entry.score)).toBe(39.612075);
    expect(entry.score).toBeGreaterThan(at(0.5).score);
  });

  it("B = 0,5 se satura en Dsat y no distingue D = 10 de D = 100", () => {
    const saturated = at(0.5, observation({ errors: 10 }));
    const beyond = at(0.5, observation({ errors: 100, warnings: 40 }));

    expect(saturated.lint.normalized).toBe(1);
    expect(beyond.lint.normalized).toBe(1);
    expect(round6(saturated.score)).toBe(54.533914);
    expect(beyond.score).toBe(saturated.score);
  });

  it("B = 0,9 y D = 5 llega al tope 100", () => {
    const entry = at(0.9, observation({ errors: 5 }));

    expect(entry.raw).toBe(1);
    expect(entry.score).toBe(100);
    expect(entry.risk).toBe(1);
    expect(entry.lint.nominal).toBeCloseTo(0.1, 12);
    expect(entry.lint.applied).toBeCloseTo(0.1, 12);
    expect(entry.lint.clipped).toBeCloseTo(0, 12);
  });

  it("el tope recorta el nominal y el lint no pasa de 100", () => {
    const entry = at(0.9, observation({ errors: 10 }));

    expect(entry.score).toBe(100);
    expect(entry.lint.nominal).toBeCloseTo(RISK_LINT_ALPHA, 12);
    expect(entry.lint.applied).toBeCloseTo(0.1, 12);
    expect(entry.lint.clipped).toBeCloseTo(0.1, 12);
    expect((entry.lint.applied ?? 0) + (entry.lint.clipped ?? 0)).toBeCloseTo(
      entry.lint.nominal ?? -1,
      12
    );
  });

  it("con B = 1 el lint no añade puntos", () => {
    const plain = at(1);
    const dirty = at(1, observation({ errors: 4 }));

    expect(dirty.score).toBe(100);
    expect(dirty.risk).toBe(plain.risk);
    expect(dirty.lint.applied).toBe(0);
    expect(dirty.lint.clipped).toBeCloseTo(RISK_LINT_ALPHA * 0.4, 12);
    expect(dirty.contributions.lint.points).toBe(0);
  });

  it("cuenta hallazgos frescos aunque la cobertura sea desconocida, sin medir o parcial", () => {
    for (const coverage of ["unknown", "unmeasured", "partial"] as const) {
      const entry = at(
        0.5,
        observation({
          errors: 2,
          warnings: 4,
          info: 1,
          coverage,
          eligible: null
        })
      );

      expect(entry.lint.debt).toBe(3);
      expect(entry.lint.confidence).toBe("observedMinimum");
      expect(entry.lint.status).toBe("partial");
      expect(entry.lint.clean).toBe(false);
      expect(entry.score).toBeGreaterThan(at(0.5).score);
    }
  });

  it("fresh false y fresh null no penalizan y no son cero", () => {
    const baseline = at(0.5);
    const stale = at(
      0.5,
      observation({ fresh: false, errors: 8, warnings: 4, info: 1 })
    );
    const unknownFresh = at(
      0.5,
      observation({ fresh: null, errors: 8, warnings: 4, info: 1 })
    );

    expect(stale.risk).toBe(baseline.risk);
    expect(unknownFresh.risk).toBe(baseline.risk);
    expect(stale.lint.normalized).toBeNull();
    expect(unknownFresh.lint.normalized).toBeNull();
    expect(stale.lint.fresh).toBe(false);
    expect(unknownFresh.lint.fresh).toBeNull();
    expect(stale.lint.clean).toBe(false);
    expect(unknownFresh.lint.clean).toBe(false);
    expect(stale.lint.status).toBe("partial");
    expect(stale.contributions.lint.points).toBeNull();
    expect(stale.lint.reason).toBe("histórico");
  });

  it("crece con los errores y con los avisos, y se queda plano al saturar", () => {
    const errors = [0, 1, 2, 4, 9, 10, 11, 100].map(
      (count) => at(0.5, observation({ errors: count })).score
    );
    assertIncreasingThenFlat(errors, 6);

    const warnings = [0, 1, 4, 8, 36, 40, 80].map(
      (count) => at(0.5, observation({ warnings: count })).score
    );
    assertIncreasingThenFlat(warnings, 6);

    expect(at(0.5, observation({ warnings: 4 })).score).toBe(
      at(0.5, observation({ errors: 1 })).score
    );
    expect(at(0.5, observation({ errors: 1 })).score).toBeGreaterThan(
      at(0.5, observation({ warnings: 1 })).score
    );
  });

  it("ignora info en la deuda y no deja que un info declare limpieza", () => {
    const quiet = at(0.5, observation({ errors: 2, warnings: 0, info: 0 }));
    const noted = at(0.5, observation({ errors: 2, warnings: 0, info: 12 }));

    expect(noted.score).toBe(quiet.score);
    expect(noted.lint.debt).toBe(quiet.lint.debt);

    const spotless = at(
      0.5,
      observation({
        errors: 0,
        warnings: 0,
        info: 0,
        coverage: "complete",
        eligible: 4
      })
    );
    const infoOnly = at(
      0.5,
      observation({
        errors: 0,
        warnings: 0,
        info: 3,
        coverage: "complete",
        eligible: 4
      })
    );

    expect(spotless.lint.clean).toBe(true);
    expect(spotless.lint.confidence).toBe("complete");
    expect(spotless.lint.status).toBe("measured");
    expect(infoOnly.score).toBe(spotless.score);
    expect(infoOnly.lint.clean).toBe(false);
  });

  it("el lint no baja el riesgo: cero conocido conserva la base", () => {
    const baseline = at(0.5);
    const clean = at(0.5, observation({ errors: 0, warnings: 0, info: 0 }));
    const dirty = at(0.5, observation({ errors: 1 }));

    expect(clean.risk).toBe(baseline.risk);
    expect(clean.score).toBe(baseline.score);
    expect(dirty.risk).toBeGreaterThan(baseline.risk);
    expect(dirty.parts.complexity.share).toBe(baseline.parts.complexity.share);
    expect(dirty.parts.complexity.weight).toBe(baseline.parts.complexity.weight);
  });

  it("distingue ausencia de cero", () => {
    const absent = at(0.5);
    const explicit = at(0.5, null);
    const zero = at(0.5, observation({ errors: 0, warnings: 0, info: 0 }));
    const legacyZero = riskBreakdown(
      [{ ...complexityCohort(0.5)[0]!, lint: 0 }, ...complexityCohort(0.5).slice(1)],
      { lint: true }
    )[0]!;

    expect(absent.risk).toBe(zero.risk);
    expect(explicit.risk).toBe(zero.risk);
    expect(legacyZero.risk).toBe(zero.risk);
    expect(absent.lint.normalized).toBeNull();
    expect(explicit.lint.normalized).toBeNull();
    expect(zero.lint.normalized).toBe(0);
    expect(legacyZero.lint.normalized).toBe(0);
    expect(absent.contributions.lint.points).toBeNull();
    expect(zero.contributions.lint.points).toBe(0);
    expect(absent.lint.clean).toBe(false);
    expect(zero.lint.clean).toBe(false);
    expect(absent.lint.status).toBe("unmeasured");
  });

  it("un número legado sin el flag no es deuda, y uno inválido tampoco", () => {
    const baseline = at(0.5);
    const ignored = riskBreakdown([
      { ...complexityCohort(0.5)[0]!, lint: 6 },
      ...complexityCohort(0.5).slice(1)
    ])[0]!;
    const invalid = riskBreakdown(
      [
        { ...complexityCohort(0.5)[0]!, lint: Number.NaN },
        ...complexityCohort(0.5).slice(1)
      ],
      { lint: true }
    )[0]!;

    expect(ignored.risk).toBe(baseline.risk);
    expect(ignored.lint.normalized).toBeNull();
    expect(invalid.risk).toBe(baseline.risk);
    expect(invalid.lint.normalized).toBeNull();
  });

  it("el puente legado suma D y no reescala los pesos de la base", () => {
    const [plain] = complexityCohort(0.5);
    const files = complexityCohort(0.5).map((file, index) =>
      index === 0 ? { ...file, lint: 4 } : file
    );
    const [entry] = riskBreakdown(files, { lint: true });
    const viewed = at(0.5, observation({ errors: 4, warnings: 0, info: 0 }));

    expect(entry!.parts.complexity.weight).toBe(1);
    expect(entry!.parts.churn.weight).toBe(0);
    expect(entry!.lint.debt).toBe(4);
    expect(entry!.lint.coverage).toBe("unknown");
    expect(entry!.lint.clean).toBe(false);
    expect(entry!.score).toBe(viewed.score);
    expect(entry!.base).toBe(viewed.base);
    expect(entry!.parts.complexity.share).toBe(viewed.parts.complexity.share);
    expect(plain!.complexity).toBe(10);
  });

  it("no aplicable exige evidencia y no es «no encontrado»", () => {
    const baseline = at(0.5);
    const byEligible = at(
      0.5,
      observation({
        errors: 0,
        warnings: 0,
        info: 0,
        applicability: "na",
        coverage: "complete",
        eligible: 0
      })
    );
    const byReason = at(
      0.5,
      observation({
        errors: 0,
        warnings: 0,
        info: 0,
        applicability: "na",
        reason: "generado",
        eligible: null,
        coverage: "unknown"
      })
    );
    const eligibleAlone = at(
      0.5,
      observation({
        errors: 0,
        warnings: 0,
        info: 0,
        eligible: 0
      })
    );
    const rejected = at(
      0.5,
      observation({
        errors: 0,
        applicability: "na",
        eligible: null,
        reason: null
      })
    );
    const missing = at(
      0.5,
      observation({
        errors: 4,
        warnings: 2,
        applicability: "not-found",
        coverage: "complete",
        eligible: 0,
        reason: "fuera del árbol"
      })
    );

    expect(byEligible.risk).toBe(baseline.risk);
    expect(byEligible.lint.applicability).toBe("na");
    expect(byEligible.lint.normalized).toBeNull();
    expect(byEligible.lint.clean).toBe(false);
    expect(byEligible.lint.status).toBe("unmeasured");

    expect(byReason.lint.applicability).toBe("na");
    expect(byReason.lint.normalized).toBeNull();
    expect(byReason.risk).toBe(baseline.risk);
    expect(eligibleAlone.lint.applicability).toBe("na");
    expect(eligibleAlone.risk).toBe(baseline.risk);

    expect(rejected.lint.applicability).not.toBe("na");
    expect(rejected.lint.normalized).toBeNull();
    expect(rejected.lint.reason).toBe("sin evidencia de no aplicabilidad");

    expect(missing.lint.applicability).toBe("not-found");
    expect(missing.lint.applicability).not.toBe(byEligible.lint.applicability);
    expect(missing.lint.normalized).toBeNull();
    expect(missing.risk).toBe(baseline.risk);
    expect(missing.lint.clean).toBe(false);
    expect(missing.lint.status).toBe("unmeasured");
    expect(missing.lint.coverage).not.toBe("complete");
  });

  it("lee not-found y no-eligible desde los motivos de ScopeHealth", () => {
    const baseline = at(0.5);
    const notFound = at(
      0.5,
      observation({
        errors: 0,
        warnings: 0,
        info: 0,
        coverage: "unmeasured",
        reasons: [{ code: "not-found", text: "no está en el árbol" }]
      })
    );
    const noneEligible = at(
      0.5,
      observation({
        errors: 0,
        warnings: 0,
        info: 0,
        eligible: 0,
        coverage: "unmeasured",
        reasons: [{ code: "no-eligible" }]
      })
    );
    const outside = at(
      0.5,
      observation({
        errors: 0,
        warnings: 0,
        info: 0,
        eligible: 0,
        reasons: [{ code: "not-eligible", text: "fuera de lo medible" }]
      })
    );
    const unknownEligibility = at(
      0.5,
      observation({
        errors: 2,
        coverage: "unknown",
        reasons: [{ code: "unknown-eligibility" }]
      })
    );

    expect(notFound.lint.applicability).toBe("not-found");
    expect(notFound.lint.reason).toBe("no está en el árbol");
    expect(notFound.risk).toBe(baseline.risk);
    expect(noneEligible.lint.applicability).toBe("na");
    expect(outside.lint.applicability).toBe("na");
    expect(outside.lint.applicability).not.toBe(notFound.lint.applicability);
    expect(noneEligible.risk).toBe(baseline.risk);
    expect(unknownEligibility.lint.applicability).toBe("applicable");
    expect(unknownEligibility.lint.debt).toBe(2);
    expect(unknownEligibility.score).toBeGreaterThan(baseline.score);
    expect(unknownEligibility.lint.clean).toBe(false);
  });

  it("los hallazgos frescos mandan sobre un «no aplicable» sin evidencia de cero", () => {
    const entry = at(
      0.5,
      observation({
        errors: 2,
        applicability: "na",
        eligible: 0,
        reason: "vacío"
      })
    );

    expect(entry.lint.applicability).toBe("applicable");
    expect(entry.lint.debt).toBe(2);
    expect(entry.score).toBeGreaterThan(at(0.5).score);
  });

  it("mensajes no válidos no penalizan", () => {
    const entry = at(0.5, observation({ fresh: true, invalid: true }));

    expect(entry.risk).toBe(at(0.5).risk);
    expect(entry.lint.normalized).toBeNull();
    expect(entry.lint.reason).toBe("mensajes no válidos");
    expect(entry.lint.clean).toBe(false);
  });

  it("`complete` sin elegibles demostrados no se trata como cerrado", () => {
    const entry = at(
      0.5,
      observation({
        errors: 0,
        warnings: 0,
        info: 0,
        coverage: "complete",
        eligible: null
      })
    );

    expect(entry.lint.coverage).toBe("unknown");
    expect(entry.lint.clean).toBe(false);
    expect(entry.lint.confidence).toBe("observedMinimum");
    expect(entry.lint.normalized).toBe(0);
  });

  it("la escala del índice es 0..100 y el riesgo histórico es el índice entre 100", () => {
    const samples = [
      at(0),
      at(0.5),
      at(0.5, observation({ errors: 4 })),
      at(0.9, observation({ errors: 5 })),
      at(1, observation({ errors: 10 }))
    ];

    for (const entry of samples) {
      expect(entry.score).toBeGreaterThanOrEqual(0);
      expect(entry.score).toBeLessThanOrEqual(100);
      expect(entry.risk).toBeGreaterThanOrEqual(0);
      expect(entry.risk).toBeLessThanOrEqual(1);
      expect(entry.score).toBeCloseTo(100 * entry.risk, 12);
    }
  });
});

describe("contribuciones", () => {
  it("suman el índice a precisión completa y el porcentaje va aparte", () => {
    const entry = at(0.5, observation({ errors: 4 }));
    const points = pointList(entry);

    expect(sumPoints(entry)).toBeCloseTo(entry.score, 9);
    expect(entry.score).not.toBe(round6(entry.score));
    expect(round6(entry.score)).toBe(39.612075);
    expect(entry.contributions.complexity.weight).toBe(RISK_WEIGHTS.complexity);
    expect(entry.contributions.complexity.percent).not.toBe(
      entry.contributions.complexity.weight
    );
    expect(entry.contributions.lint.weight).toBe(RISK_LINT_ALPHA);
    for (const part of points) {
      if (part.points === null || part.percent === null) continue;
      expect(part.percent).toBeCloseTo((part.points / entry.score) * 100, 8);
    }
  });

  it("con una sola señal, churn y tamaño no tienen puntos", () => {
    const entry = at(0.5, observation({ errors: 4 }));

    expect(entry.parts.complexity.weight).toBe(1);
    expect(entry.contributions.churn.points).toBeNull();
    expect(entry.contributions.size.points).toBeNull();
    expect(entry.contributions.churn.percent).toBeNull();
    expect(entry.contributions.size.percent).toBeNull();
    expect(entry.contributions.complexity.weight).toBe(0.5);
    expect(entry.contributions.complexity.percent).not.toBe(50);
    expect(
      (entry.contributions.complexity.points ?? 0) +
        (entry.contributions.lint.points ?? 0)
    ).toBeCloseTo(entry.score, 9);
  });

  it("los puntos salen de la parte renormalizada, no del peso nominal por B", () => {
    const files: RiskSignals[] = [
      { complexity: 40, churn: 10, size: 20 },
      { complexity: 20, churn: 20, size: 10 },
      { complexity: 10, churn: 40, size: 40 }
    ];
    const [entry] = riskBreakdown(files);
    const nominal = {
      complexity: RISK_WEIGHTS.complexity * entry!.base,
      churn: RISK_WEIGHTS.churn * entry!.base,
      size: RISK_WEIGHTS.size * entry!.base
    };

    expect(Math.abs(entry!.parts.complexity.share - nominal.complexity)).toBeGreaterThan(
      0.01
    );
    expect(entry!.contributions.k).not.toBeNull();
    for (const signal of ["complexity", "churn", "size"] as const) {
      expect(entry!.contributions[signal].points).toBeCloseTo(
        100 * entry!.contributions.k! * entry!.parts[signal].share,
        8
      );
      expect(entry!.contributions[signal].points).not.toBeCloseTo(
        100 * entry!.contributions.k! * nominal[signal],
        4
      );
    }
    expect(sumPoints(entry!)).toBeCloseTo(entry!.score, 9);
  });

  it("intensidades distintas reparten puntos distintos", () => {
    const quiet = mixedFile(10, 10, 10);
    const loud = mixedFile(40, 10, 20);
    const [low, high] = riskBreakdown([
      quiet,
      loud,
      { complexity: 20, churn: 20, size: 20 }
    ]);

    expect(high!.contributions.complexity.points).toBeGreaterThan(
      low!.contributions.complexity.points ?? 0
    );
    expect(high!.base).toBeGreaterThan(low!.base);
    expect(high!.contributions.complexity.points).not.toBeCloseTo(
      low!.contributions.complexity.points ?? 0,
      4
    );
  });

  it("B = 0 y D = 0 da puntos cero y porcentajes sin definir", () => {
    const entry = riskBreakdown([
      {
        complexity: 0,
        churn: 0,
        size: 0,
        lintView: observation({ errors: 0, warnings: 0, info: 0 })
      },
      { complexity: 10, churn: 10, size: 10 },
      { complexity: 20, churn: 20, size: 20 },
      { complexity: 40, churn: 40, size: 40 }
    ])[0]!;

    expect(entry.base).toBe(0);
    expect(entry.raw).toBe(0);
    expect(entry.score).toBe(0);
    expect(entry.risk).toBe(0);
    expect(entry.contributions.k).toBeNull();
    expect(entry.contributions.complexity.points).toBe(0);
    expect(entry.contributions.churn.points).toBe(0);
    expect(entry.contributions.size.points).toBe(0);
    expect(entry.contributions.lint.points).toBe(0);
    expect(entry.contributions.complexity.percent).toBeNull();
    expect(entry.contributions.churn.percent).toBeNull();
    expect(entry.contributions.size.percent).toBeNull();
    expect(entry.contributions.lint.percent).toBeNull();
  });

  it("con el tope, los puntos aplicados suman 100 y el recorte no se suma", () => {
    const entry = at(0.9, observation({ errors: 10 }));
    const complexity = entry.contributions.complexity.points ?? 0;
    const lint = entry.contributions.lint.points ?? 0;

    expect(entry.contributions.churn.points).toBeNull();
    expect(entry.contributions.size.points).toBeNull();
    expect(complexity + lint).toBeCloseTo(100, 9);
    expect(lint).toBeCloseTo(10, 6);
    expect(complexity).toBeCloseTo(90, 6);
    expect(entry.contributions.lint.percent).toBeCloseTo(10, 6);
    expect(entry.lint.clipped).toBeGreaterThan(0);
  });
});

/**
 * Cohorte de solo complejidad cuyo primer fichero tiene base `target`
 * (el p95 cae en 20).
 */
function complexityCohort(target: number): RiskSignals[] {
  return [
    { complexity: target * 20, churn: 0, size: 0 },
    { complexity: 20, churn: 0, size: 0 },
    { complexity: 40, churn: 0, size: 0 }
  ];
}

function at(target: number, lintView?: RiskLintInput | null): RiskBreakdown {
  const files = complexityCohort(target).map((file, index) =>
    index === 0 && lintView !== undefined ? { ...file, lintView } : file
  );
  return riskBreakdown(files)[0]!;
}

function observation(input: {
  fresh?: boolean | null;
  errors?: number;
  warnings?: number;
  info?: number;
  coverage?: RiskLintCoverage;
  eligible?: number | null;
  applicability?: RiskLintInput["applicability"];
  reason?: string | null;
  reasons?: readonly RiskLintReason[];
  invalid?: boolean;
}): RiskLintInput {
  const errors = input.errors ?? 0;
  const warnings = input.warnings ?? 0;
  const counts: Partial<RiskLintCounts> = input.invalid
    ? { errors: Number.NaN, warnings: 0, info: 0, findings: 0, filesWithFindings: 0 }
    : {
        errors,
        warnings,
        findings: errors + warnings + (input.info ?? 0),
        filesWithFindings: 1,
        ...(input.info === undefined ? {} : { info: input.info })
      };
  return {
    fresh: input.fresh === undefined ? true : input.fresh,
    applicability: input.applicability,
    reason: input.reason,
    coverage: {
      state: input.coverage ?? "unknown",
      eligible: input.eligible === undefined ? null : input.eligible,
      measured: null,
      reasons: input.reasons
    },
    counts
  };
}

function mixedFile(complexity: number, churn: number, size: number): RiskSignals {
  return { complexity, churn, size };
}

function pointList(entry: RiskBreakdown) {
  return [
    entry.contributions.complexity,
    entry.contributions.churn,
    entry.contributions.size,
    entry.contributions.lint
  ];
}

function sumPoints(entry: RiskBreakdown): number {
  return pointList(entry).reduce((sum, part) => sum + (part.points ?? 0), 0);
}

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function assertIncreasingThenFlat(values: number[], flatFrom: number): void {
  for (let index = 1; index < values.length; index += 1) {
    const previous = values[index - 1] ?? 0;
    const current = values[index] ?? 0;
    if (index < flatFrom) expect(current).toBeGreaterThan(previous);
    else expect(current).toBe(previous);
  }
}

/**
 * La base sin lint, copiada del algoritmo anterior a este término:
 * p95, pesos 50/32/18 y renormalización. Sirve de oráculo, no llama a
 * `riskBreakdown`.
 */
function historicalBaseRisk(
  files: readonly { complexity: number; churn: number; size: number }[]
): number[] {
  const gamma = 1.7;
  const nominal = { complexity: 0.5, churn: 0.32, size: 0.18 };
  const complexityP95 = historicalPercentile(
    files.map((file) => file.complexity).filter((value) => value > 0)
  );
  const churnP95 = historicalPercentile(
    files.map((file) => file.churn).filter((value) => value > 0)
  );
  const sizeP95 = historicalPercentile(
    files.map((file) => file.size).filter((value) => value > 0)
  );
  const complexityWeight = complexityP95 > 0 ? nominal.complexity : 0;
  const churnWeight = churnP95 > 0 ? nominal.churn : 0;
  const sizeWeight = sizeP95 > 0 ? nominal.size : 0;
  const total = complexityWeight + churnWeight + sizeWeight;
  const weights =
    total > 0
      ? {
          complexity: complexityWeight / total,
          churn: churnWeight / total,
          size: sizeWeight / total
        }
      : { complexity: 0, churn: 0, size: 0 };

  return files.map((file) => {
    const raw =
      historicalNorm(file.complexity, complexityP95) * weights.complexity +
      historicalNorm(file.churn, churnP95) * weights.churn +
      historicalNorm(file.size, sizeP95) * weights.size;
    const clamped = Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : 0;
    return Math.pow(clamped, gamma);
  });
}

function historicalNorm(value: number, p95: number): number {
  if (!(p95 > 0)) return 0;
  const ratio = value / p95;
  if (!Number.isFinite(ratio)) return 0;
  return Math.max(0, Math.min(1, ratio));
}

function historicalPercentile(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor((sorted.length - 1) * 0.95))
  );
  return sorted[index] ?? 0;
}
