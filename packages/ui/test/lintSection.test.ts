import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { LintArtifact } from "@codarch/lint/browser";
import { LintSection } from "../src/LintSection";
import { affectedLintFiles, lintRules } from "../src/lintRollup";

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
          line: 7,
          column: 4
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

const section = (options: {
  artifact: LintArtifact | null;
  folder: string;
  filePath?: string;
  onSelectPath?: (path: string) => void;
}): string =>
  renderToStaticMarkup(
    createElement(LintSection, {
      id: "lint",
      artifact: options.artifact,
      folder: options.folder,
      filePath: options.filePath,
      onSelectPath: options.onSelectPath
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
  it("en un fichero enseña línea:columna, la regla y las tres cuentas", () => {
    const markup = section({
      artifact,
      folder: "apps/web/src/a.ts",
      filePath: "apps/web/src/a.ts"
    });

    expect(markup).toContain(">Lint<");
    expect(markup).toContain("Unexpected console");
    expect(markup).toContain("Unexpected var");
    expect(markup).toContain("no-console");
    expect(markup).toContain("lint-message-line");
    expect(markup).toContain("7:4");
    expect(markup).toContain("1 error");
    expect(markup).toContain("1 aviso");
    expect(markup).toContain("1 info");
    expect(markup).not.toContain("del riesgo");
    expect(markup).not.toContain("Las cuentas están en Métricas.");
    expect(markup).not.toContain("eslint.config.js");
    expect(markup).not.toContain("reglas activas");
    expect(markup.match(/class="lint-health"/g)).toHaveLength(1);
  });

  it("carpeta y proyecto listan ficheros, no reglas", () => {
    const folder = section({ artifact, folder: "packages/ui" });
    const project = section({ artifact, folder: "" });

    expect(folder).toContain("Ficheros con hallazgos");
    expect(folder).toContain("packages/ui/src/b.ts");
    expect(folder).not.toContain("packages/ui2/src/c.ts");
    expect(folder).not.toContain("Hallazgos por regla");
    expect(folder).not.toContain("reglas con hallazgos");
    expect(folder).not.toContain("de 3 medidos");
    expect(folder).toContain("no es la cobertura de este ámbito");
    expect(project).toContain("apps/web/src/a.ts");
    expect(project).not.toContain("eslint.config.js");
    expect(project).not.toContain("reglas activas");
    expect(project.match(/class="lint-health"/g)).toHaveLength(1);
  });

  it("un fichero de la lista es un botón si hay navegación", () => {
    const markup = section({
      artifact,
      folder: "packages/ui",
      onSelectPath: () => {}
    });
    const list = markup.slice(markup.indexOf("lint-file-list"));
    expect(list).toContain("<button");
    expect(list).toContain("packages/ui/src/b.ts");

    const plain = section({ artifact, folder: "packages/ui" });
    const plainList = plain.slice(plain.indexOf("lint-file-list"));
    expect(plainList).not.toContain("<button");
  });

  it("sin artefacto no hay ceros: se dice que no se midió", () => {
    const markup = section({ artifact: null, folder: "" });

    expect(markup).toContain("Sin medir");
    expect(markup).toContain("El lint no se midió");
    expect(markup).toContain("codarch analyze");
    expect(markup).toContain("codarch lint");
    expect(markup).not.toContain("Mínimo recomendable");
  });

  it("un proyecto medido sin hallazgos dice que se miró", () => {
    const clean: LintArtifact = {
      ...artifact,
      files: {},
      summary: { files: 0, errors: 0, warnings: 0, messages: 0, measured: 3 }
    };
    const markup = section({ artifact: clean, folder: "" });

    expect(markup).toContain(
      "Medido y limpio: 3 ficheros mirados, ninguno con hallazgos."
    );
  });

  it("una carpeta limpia no hereda el medido global como si fuera suyo", () => {
    const clean: LintArtifact = {
      ...artifact,
      files: {},
      summary: { files: 0, errors: 0, warnings: 0, messages: 0, measured: 9 }
    };
    const markup = section({ artifact: clean, folder: "packages/ui" });

    expect(markup).not.toContain("Medido y limpio");
    expect(markup).not.toContain("de 9 medidos");
    expect(markup).toContain(
      "Sin hallazgos en los ficheros que el artefacto lista en este subárbol."
    );
    expect(markup).toContain("no es la cobertura de este ámbito");
  });
});

describe("los ficheros afectados salen de los mensajes", () => {
  it("ignora las cuentas declaradas y summary, y normaliza el ámbito", () => {
    const composed = "caf\u00e9";
    const decomposed = "cafe\u0301";
    const drifted: LintArtifact = {
      ...artifact,
      files: {
        [`${composed}/a.ts`]: {
          errors: 9,
          warnings: 9,
          messages: [{ rule: "no-var", severity: "warn", message: "var" }]
        },
        [`${composed}2/b.ts`]: {
          errors: 1,
          warnings: 0,
          messages: [{ rule: "no-console", severity: "error", message: "console" }]
        }
      },
      summary: { files: 2, errors: 9, warnings: 9, messages: 2, measured: 40 }
    };

    expect(affectedLintFiles(drifted, decomposed)).toEqual([
      { path: `${composed}/a.ts`, errors: 0, warnings: 1, info: 0 }
    ]);
  });
});
