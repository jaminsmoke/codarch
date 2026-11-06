import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { riskBreakdown, type RiskBreakdown, type RiskLintInput } from "@codarch/metrics/browser";
import { RiskBreakdown as RiskView } from "../src/FileSections";

function view(lintView?: RiskLintInput | null): RiskBreakdown {
  const [entry] = riskBreakdown([
    {
      complexity: 8,
      churn: 3,
      size: 40,
      ...(lintView === undefined ? {} : { lintView })
    }
  ]);
  if (!entry) throw new Error("el motor no devolvió desglose");
  return entry;
}

function html(breakdown: RiskBreakdown | null): string {
  return renderToStaticMarkup(createElement(RiskView, { breakdown }));
}

function pointsSum(breakdown: RiskBreakdown): number {
  return (["complexity", "churn", "size", "lint"] as const).reduce((sum, signal) => {
    const points = breakdown.contributions[signal].points;
    return points === null ? sum : sum + points;
  }, 0);
}

describe("el índice que entrega el motor", () => {
  it("los puntos no nulos suman el índice", () => {
    const breakdown = view({
      fresh: true,
      coverage: { state: "unknown", eligible: null, measured: 1 },
      counts: { errors: 4, warnings: 0, info: 1, findings: 5 }
    });

    expect(pointsSum(breakdown)).toBeCloseTo(breakdown.score, 5);
    expect(breakdown.risk).toBeGreaterThanOrEqual(0);
    expect(breakdown.risk).toBeLessThanOrEqual(1);
    expect(breakdown.score).toBeCloseTo(breakdown.risk * 100, 5);
  });

  it("sin lint el término no es un cero ni una barra limpia", () => {
    const breakdown = view(null);
    const markup = html(breakdown);

    expect(breakdown.lint.normalized).toBeNull();
    expect(breakdown.lint.debt).toBeNull();
    expect(breakdown.contributions.lint.points).toBeNull();
    expect(markup).toContain("Sin penalización en el índice");
    expect(markup).toContain('aria-label="sin porcentaje"');
    expect(markup).not.toContain("Limpio");
    expect(markup).not.toContain("peso % del riesgo");
    expect(markup).not.toContain("probabilidad");
  });

  it("fresco y desconocido con mensajes enseña la penalización observada", () => {
    const breakdown = view({
      fresh: true,
      coverage: {
        state: "unknown",
        eligible: null,
        measured: 1,
        reasons: [{ code: "unknown-eligibility" }]
      },
      counts: { errors: 2, warnings: 0, info: 0, findings: 2 }
    });
    const markup = html(breakdown);

    expect(breakdown.lint.fresh).toBe(true);
    expect(breakdown.lint.coverage).toBe("unknown");
    expect(breakdown.lint.normalized).not.toBeNull();
    expect(breakdown.lint.clean).toBe(false);
    expect(markup).toContain("Penalización observada");
    expect(markup).toContain("Cobertura desconocida");
    expect(markup).toContain("Frescura: al día");
    expect(markup).not.toContain("Ámbito limpio");
  });

  it("un árbol viejo o sin frescura no penaliza", () => {
    const stale = view({
      fresh: false,
      coverage: { state: "partial", eligible: null, measured: 1 },
      counts: { errors: 4, warnings: 0, info: 0, findings: 4 }
    });
    const unknownFresh = view({
      fresh: null,
      coverage: { state: "unknown", eligible: null, measured: null },
      counts: { errors: 1, warnings: 0, info: 0, findings: 1 }
    });

    expect(stale.lint.normalized).toBeNull();
    expect(stale.lint.applied).toBeNull();
    expect(unknownFresh.lint.normalized).toBeNull();
    expect(html(stale)).toContain("no penaliza");
    expect(html(stale)).toContain("de otro árbol");
    expect(html(unknownFresh)).toContain("no verificada");
    expect(html(unknownFresh)).toContain("Sin penalización");
    expect(html(stale)).not.toContain("Penalización observada");
  });

  it("la saturación se dice y marca α y el tope como provisionales", () => {
    const [entry] = riskBreakdown([
      {
        complexity: 10,
        churn: 10,
        size: 10,
        lintView: {
          fresh: true,
          coverage: { state: "unknown", eligible: null, measured: 1 },
          counts: { errors: 40, warnings: 0, info: 0, findings: 40 }
        }
      }
    ]);
    if (!entry) throw new Error("sin desglose");
    const markup = html(entry);

    expect(entry.lint.clipped).not.toBeNull();
    expect(entry.lint.clipped ?? 0).toBeGreaterThan(0);
    expect(markup).toContain("Saturación");
    expect(markup).toContain("provisionales");
    expect(pointsSum(entry)).toBeCloseTo(entry.score, 5);
  });

  it("no aplicable y no encontrado no se pintan como cero", () => {
    const na = view({
      fresh: true,
      applicability: "na",
      reason: "fuera",
      coverage: {
        state: "unmeasured",
        eligible: 0,
        measured: 0,
        reasons: [{ code: "no-eligible" }]
      },
      counts: { errors: 0, warnings: 0, info: 0, findings: 0 }
    });
    const missing = view({
      fresh: true,
      applicability: "not-found",
      coverage: {
        state: "unknown",
        eligible: null,
        measured: null,
        reasons: [{ code: "not-found" }]
      },
      counts: { errors: 0, warnings: 0, info: 0, findings: 0 }
    });

    expect(na.lint.applicability).toBe("na");
    expect(na.lint.normalized).toBeNull();
    expect(missing.lint.applicability).toBe("not-found");
    expect(missing.lint.normalized).toBeNull();
    expect(html(na)).toContain("No aplicable");
    expect(html(missing)).toContain("No está en el árbol");
    expect(html(na)).not.toContain("Penalización observada");
    expect(html(missing)).not.toContain("0 puntos del índice");
  });

  it("sin desglose no recalcula ni finge un índice", () => {
    const markup = html(null);
    expect(markup).toContain("no trae el desglose");
    expect(markup).toContain("No se recalcula");
    expect(markup).not.toContain("puntos del índice");
  });
});
