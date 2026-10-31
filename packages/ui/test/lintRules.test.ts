import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { LintArtifact } from "@codarch/lint/browser";
import { LintGroup } from "../src/LintRules";
import { lintRules } from "../src/lintRollup";

const artifact: LintArtifact = {
  schemaVersion: "1.2",
  meta: {
    checksum: "abc",
    tools: ["eslint"],
    systems: [
      { name: "eslint", config: "eslint.config.js", rules: [
        { id: "no-console", severity: "error" },
        { id: "no-var", severity: "warn" }
      ] }
    ]
  },
  files: {
    "apps/web/src/a.ts": {
      errors: 1,
      warnings: 1,
      messages: [
        { rule: "no-var", severity: "warn", message: "Unexpected var" },
        { rule: "no-console", severity: "error", message: "Unexpected console" },
        { rule: "security/detect-eval", severity: "info", message: "eval" }
      ]
    },
    "packages/ui/src/b.ts": {
      errors: 1,
      warnings: 0,
      messages: [
        { rule: "no-console", severity: "error", message: "Unexpected console" }
      ]
    },
    "packages/ui2/src/c.ts": {
      errors: 1,
      warnings: 0,
      messages: [
        { rule: "no-console", severity: "error", message: "Unexpected console" }
      ]
    }
  },
  summary: { files: 3, errors: 3, warnings: 1, messages: 5, measured: 3 }
};

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

const group = (options: {
  artifact: LintArtifact | null;
  folder: string;
  showSystems?: boolean;
}): string =>
  renderToStaticMarkup(
    createElement(LintGroup, {
      artifact: options.artifact,
      folder: options.folder,
      showSystems: options.showSystems ?? false
    })
  );

describe("el bloque de lint de Reglas", () => {
  it("sin sistemas a la vista en carpeta y fichero", () => {
    const markup = group({ artifact, folder: "packages/ui" });

    expect(markup).toContain("no-console");
    expect(markup).not.toContain("eslint.config.js");
  });

  it("el proyecto enseña sistemas y reglas activas", () => {
    const markup = group({ artifact, folder: "", showSystems: true });

    expect(markup).toContain("eslint.config.js");
    expect(markup).toContain("2 reglas activas");
    expect(markup).toContain("medido");
  });

  it("sin artefacto no hay ceros: se dice que no se midió", () => {
    const markup = group({ artifact: null, folder: "" });

    expect(markup).toContain("El lint no se midió");
    // El camino normal es el análisis, que lo mide con el resto de lentes.
    expect(markup).toContain("codarch analyze");
    expect(markup).toContain("codarch lint");
  });
});

describe("la presentación de las reglas", () => {
  it("cada hallazgo lleva su columna, con tinta por severidad", () => {
    const markup = group({ artifact, folder: "apps/web/src/a.ts" });

    expect(markup).toContain("lint-rule-head");
    expect(markup).toContain(">Err.<");
    expect(markup).toContain(">Avis.<");
    expect(markup).toContain(">Info<");
    expect(markup).toContain("lint-count-error");
    expect(markup).toContain("lint-count-warn");
    expect(markup).toContain("lint-count-info");
  });

  it("un cero es una raya, no una celda vacía", () => {
    const markup = group({ artifact, folder: "packages/ui" });

    expect(markup).toContain('class="mono lint-count is-zero">—</span>');
  });

  it("la configuración de un sistema no lleva la tinta de la deuda", () => {
    const markup = group({ artifact, folder: "", showSystems: true });

    expect(markup).toContain("lint-state is-on");
    // «1 como error» es configuración; el rojo de la deuda es de los hallazgos.
    expect(markup).toContain("Configuración · 1 como error · 1 como aviso");
    expect(markup).not.toContain("lint-bar-error");
    expect(markup).not.toContain("lint-dot-error");
    expect(markup).not.toContain("lint-sev-error");
  });

  it("habla de reglas y no repite los totales de Métricas", () => {
    const markup = group({ artifact, folder: "", showSystems: true });

    expect(markup).toContain("2 reglas activas");
    // En el bloque de sistemas no hay totales: «errores» y «avisos» son las
    // cuentas de Métricas y aquí solo se habla de reglas.
    const systems = markup.slice(
      markup.indexOf("lint-systems"),
      markup.indexOf("lint-findings")
    );
    expect(systems).not.toContain("errores");
    expect(systems).not.toContain("avisos");
    expect(systems).toContain("cuentan en Métricas");
  });

  it("un proyecto medido sin hallazgos dice cuántos ficheros se miraron", () => {
    const clean: LintArtifact = {
      ...artifact,
      files: {},
      summary: { files: 0, errors: 0, warnings: 0, messages: 0, measured: 3 }
    };
    const markup = group({ artifact: clean, folder: "", showSystems: true });

    expect(markup).toContain(
      "Sin hallazgos en el proyecto: se midieron 3 ficheros."
    );
  });
});
