import { describe, expect, it } from "vitest";
import { systemActivity } from "../src/catalog";
import { DOC_RULES, codarchActiveRules, codarchRuleCatalog } from "../src/rest";
import type { LintSystem } from "../src/format";

describe("las reglas activas de un sistema", () => {
  it("codarch sale del productor, no de los hallazgos", () => {
    const active = codarchActiveRules();
    expect(active.map((rule) => rule.id)).toEqual([DOC_RULES.brokenLink]);

    const configured = codarchActiveRules({
      entries: ["README.md"],
      frontmatter: [{ files: "docs/**/*.md", required: ["title"] }],
      twins: [{ from: "docs", to: "docs/en" }],
      severity: { "doc/orphan": "warn" }
    });
    expect(configured.map((rule) => rule.id)).toEqual([
      DOC_RULES.brokenLink,
      DOC_RULES.orphan,
      DOC_RULES.frontmatter,
      DOC_RULES.twinMissing
    ]);
    expect(configured.find((rule) => rule.id === DOC_RULES.orphan)?.severity).toBe("warn");
    expect(codarchRuleCatalog().map((rule) => rule.id)).toEqual([
      "doc/broken-link",
      "doc/frontmatter",
      "doc/orphan",
      "doc/twin-missing"
    ]);
  });

  it("oxlint sin enumerar es unknown y no una lista de cero", () => {
    const oxlint: LintSystem = {
      name: "oxlint",
      config: null,
      note: "corre sus correcciones por defecto; no se enumeran"
    };

    expect(systemActivity(oxlint)).toEqual({
      activeRules: [],
      countState: "unknown"
    });
  });

  it("oxlint con reglas en su JSON es una lista cerrada", () => {
    const oxlint: LintSystem = {
      name: "oxlint",
      config: ".oxlintrc.json",
      rules: [
        { id: "no-debugger", severity: "warn" },
        { id: "no-var", severity: "error" }
      ]
    };

    expect(systemActivity(oxlint).countState).toBe("known-complete");
    expect(systemActivity(oxlint).activeRules).toHaveLength(2);
  });

  it("un codarch sin rules en el artefacto enseña el catálogo del productor", () => {
    const system: LintSystem = { name: "codarch", config: null };

    expect(systemActivity(system)).toEqual({
      activeRules: codarchRuleCatalog(),
      countState: "known-complete"
    });
  });

  it("una config que no activa reglas es una lista vacía conocida", () => {
    const eslint: LintSystem = {
      name: "eslint",
      config: "eslint.config.js",
      note: "su config no activa ninguna regla"
    };

    expect(systemActivity(eslint)).toEqual({
      activeRules: [],
      countState: "known-complete"
    });
  });

  it("los selectores de Ruff son una lista parcial", () => {
    const ruff: LintSystem = {
      name: "ruff",
      config: "ruff.toml",
      rules: [
        { id: "E", severity: "error" },
        { id: "F", severity: "error" }
      ],
      note: "sin el catálogo de reglas de Ruff: se listan sus selectores"
    };

    expect(systemActivity(ruff).countState).toBe("partial");
  });
});
