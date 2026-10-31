import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { LintArtifact } from "@codarch/lint/browser";
import type { RiskParts } from "@codarch/render/browser";
import { LintSection } from "../src/LintSection";
import { lintRules } from "../src/lintRollup";

const artifact: LintArtifact = {
  schemaVersion: "1.2",
  meta: {
    checksum: "abc",
    tools: ["eslint"],
    systems: [
      {
        name: "eslint",
        config: "eslint.config.js",
        rules: [
          { id: "no-console", severity: "error" },
          { id: "no-var", severity: "warn" }
        ]
      }
    ]
  },
  files: {
    "apps/web/src/a.ts": {
      errors: 1,
      warnings: 1,
      messages: [
        { rule: "no-var", severity: "warn", message: "Unexpected var", line: 2 },
        {
          rule: "no-console",
          severity: "error",
          message: "Unexpected console",
          line: 7
        },
        { rule: "security/detect-eval", severity: "info", message: "eval" }
      ]
    },
    "packages/ui/src/b.ts": {
      errors: 1,
      warnings: 0,
      messages: [
        {
          rule: "no-console",
          severity: "error",
          message: "Unexpected console",
          line: 3
        }
      ]
    },
    "packages/ui2/src/c.ts": {
      errors: 1,
      warnings: 0,
      messages: [
        {
          rule: "no-console",
          severity: "error",
          message: "Unexpected console",
          line: 1
        }
      ]
    }
  },
  summary: { files: 3, errors: 3, warnings: 1, messages: 5, measured: 3 }
};

/** La composición del riesgo, con el peso del lint que pida el caso. */
function risk(weight: number): RiskParts {
  return {
    complexity: { value: 0, p95: 0, norm: 0, weight: 0, share: 0 },
    churn: { value: 0, p95: 0, norm: 0, weight: 0, share: 0 },
    size: { value: 0, p95: 0, norm: 0, weight: 0, share: 0 },
    lint: { value: 3, p95: 10, norm: 0.3, weight, share: 0.3 }
  };
}

const section = (options: {
  artifact: LintArtifact | null;
  folder: string;
  filePath?: string;
  risk?: RiskParts;
}): string =>
  renderToStaticMarkup(
    createElement(LintSection, {
      id: "lint",
      artifact: options.artifact,
      folder: options.folder,
      filePath: options.filePath,
      risk: options.risk
    })
  );

describe("las reglas con hallazgos por ámbito", () => {
  it("cuenta solo lo que cuelga de la carpeta", () => {
    expect(lintRules(artifact, "packages/ui")).toEqual([
      { rule: "no-console", errors: 1, warnings: 0, findings: 1 }
    ]);
  });

  it("la barra cuenta: packages/ui no se lleva packages/ui2", () => {
    expect(lintRules(artifact, "packages/ui2")).toHaveLength(1);
    expect(lintRules(artifact, "")).toHaveLength(3);
  });

  it("ordena por lo que pesa y cuenta los info como hallazgos", () => {
    expect(lintRules(artifact).map((entry) => entry.rule)).toEqual([
      "no-console",
      "no-var",
      "security/detect-eval"
    ]);
    expect(lintRules(artifact).at(-1)).toEqual({
      rule: "security/detect-eval",
      errors: 0,
      warnings: 0,
      findings: 1
    });
  });

  it("en un fichero, solo sus reglas", () => {
    expect(lintRules(artifact, "apps/web/src/a.ts")).toEqual([
      { rule: "no-console", errors: 1, warnings: 0, findings: 1 },
      { rule: "no-var", errors: 0, warnings: 1, findings: 1 },
      { rule: "security/detect-eval", errors: 0, warnings: 0, findings: 1 }
    ]);
  });
});

describe("la sección Lint de la vista de código", () => {
  it("en un fichero enseña los mensajes, no el catálogo de reglas", () => {
    const markup = section({
      artifact,
      folder: "apps/web/src/a.ts",
      filePath: "apps/web/src/a.ts",
      risk: risk(0.2)
    });

    expect(markup).toContain(">Lint<");
    expect(markup).toContain("Unexpected console");
    expect(markup).toContain("Unexpected var");
    expect(markup).toContain("lint-message");
    // El catálogo de sistemas y reglas activas ya no vive aquí.
    expect(markup).not.toContain("eslint.config.js");
    expect(markup).not.toContain("reglas activas");
  });

  it("dice cuánto pesa en el riesgo y de dónde sale", () => {
    const markup = section({
      artifact,
      folder: "apps/web/src/a.ts",
      filePath: "apps/web/src/a.ts",
      risk: risk(0.2)
    });

    expect(markup).toContain("20 %");
    expect(markup).toContain("del riesgo total");
    expect(markup).toContain("errores + ¼ avisos");
    // Las cuentas ya están en Métricas: Lint no las repite.
    expect(markup).toContain("Las cuentas están en Métricas.");
  });

  it("sin lint medido no inventa un 0 %: dice que no suma", () => {
    const markup = section({
      artifact,
      folder: "apps/web/src/a.ts",
      filePath: "apps/web/src/a.ts",
      risk: risk(0)
    });

    expect(markup).toContain("sin medir");
    expect(markup).toContain("El lint no se midió: no suma al riesgo.");
  });

  it("carpeta y proyecto agrupan los hallazgos por regla", () => {
    const folder = section({ artifact, folder: "packages/ui" });
    const project = section({ artifact, folder: "" });

    expect(folder).toContain("Hallazgos por regla");
    expect(folder).toContain("no-console");
    expect(project).not.toContain("eslint.config.js");
    expect(project).not.toContain("reglas activas");
  });

  it("sin artefacto no hay ceros: se dice que no se midió", () => {
    const markup = section({ artifact: null, folder: "" });

    expect(markup).toContain("El lint no se midió");
    // El camino normal es el análisis, que lo mide con el resto de lentes.
    expect(markup).toContain("codarch analyze");
    expect(markup).toContain("codarch lint");
  });

  it("un proyecto medido sin hallazgos dice cuántos ficheros se miraron", () => {
    const clean: LintArtifact = {
      ...artifact,
      files: {},
      summary: { files: 0, errors: 0, warnings: 0, messages: 0, measured: 3 }
    };
    const markup = section({ artifact: clean, folder: "" });

    expect(markup).toContain(
      "Sin hallazgos en el proyecto: se midieron 3 ficheros."
    );
  });
});
