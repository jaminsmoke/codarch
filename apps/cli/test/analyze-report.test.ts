import { describe, expect, it } from "vitest";
import { reportLines, type ReportFacts } from "../src/analyze-report";

/**
 * El resumen de `analyze`, sin disco y sin `git`.
 *
 * Entra lo medido y sale el texto. Lo que se fija aquí es lo que un script o
 * una persona lee: el orden de los campos, los plurales, los topes y lo que se
 * dice cuando algo no se pudo guardar.
 */

function facts(overrides: Partial<ReportFacts> = {}): ReportFacts {
  return {
    rootPath: "/repo",
    snapshot: { path: "/repo/.codarch/snapshot.cc.json", bytes: 2048 },
    rest: null,
    lint: { kind: "none" },
    structure: { files: 2, folders: 1, edges: 1, cycles: 0 },
    imports: { external: 0, builtin: 0, typeOnly: 0, unresolved: 0 },
    migration: { languages: [], bridges: 0, ffi: 0, debt: 0 },
    parse: { hits: 0, misses: 2, fromScopes: 0 },
    scopes: { nested: 0, stale: 0 },
    durationMs: 12,
    history: null,
    churn: { enabled: false, commits: 0, authors: 0, shallow: false, files: 2 },
    warnings: [],
    unresolved: [],
    ...overrides
  };
}

/** Las etiquetas del resumen, en el orden en que salen. */
function labels(lines: readonly string[]): string[] {
  return lines
    .filter(
      (line) =>
        line.startsWith("  ") &&
        line.trim() !== "" &&
        !line.startsWith("  CodArch")
    )
    .map((line) => line.trim().split(/\s+/)[0] ?? "");
}

/** La última línea, con los huecos de la etiqueta juntos. */
function lastLine(lines: readonly string[]): string {
  return (lines.at(-1) ?? "").replace(/\s+/g, " ").trim();
}

/** El texto de un campo, sin la etiqueta. */
function value(lines: readonly string[], label: string): string {
  const line = lines.find((entry) => entry.trimStart().startsWith(`${label} `));
  if (line === undefined) throw new Error(`sin campo ${label}`);
  return line.trimStart().slice(label.length).trim();
}

describe("el resumen", () => {
  it("empieza por la cabecera y cuenta las fases en orden", () => {
    const lines = reportLines(facts());

    expect(lines[0]).toBe("");
    expect(lines[1]).toBe("  CodArch · análisis");
    expect(lines.at(-1)).toBe("");
    expect(labels(lines)).toEqual([
      "raíz",
      "snapshot",
      "lint",
      "estructura",
      "imports",
      "migración",
      "parseo",
      "alcances",
      "tiempo",
      "churn"
    ]);
  });

  it("el snapshot lleva su ruta y sus bytes", () => {
    const lines = reportLines(facts());

    expect(value(lines, "snapshot")).toBe(
      "/repo/.codarch/snapshot.cc.json (2 KB)"
    );
    expect(value(lines, "estructura")).toBe(
      "2 ficheros · 1 carpetas · 1 aristas · 0 ciclos"
    );
    expect(value(lines, "tiempo")).toBe("12 ms");
  });

  it("el resto, cuando lo hay, va antes del lint", () => {
    const lines = reportLines(
      facts({
        rest: {
          path: "/repo/.codarch/rest.cc.json",
          bytes: 4096,
          files: 3,
          links: 2
        }
      })
    );

    expect(value(lines, "resto")).toBe(
      "/repo/.codarch/rest.cc.json (4 KB) · 3 ficheros · 2 enlaces"
    );
    expect(labels(lines).indexOf("resto")).toBe(
      labels(lines).indexOf("snapshot") + 1
    );
  });
});

describe("el lint en una línea", () => {
  it("omitido y sin declarar dicen cada uno lo suyo", () => {
    expect(value(reportLines(facts({ lint: { kind: "skipped" } })), "lint")).toBe(
      "omitido (--no-lint)"
    );
    expect(value(reportLines(facts({ lint: { kind: "none" } })), "lint")).toBe(
      "sin medir: el proyecto no declara lint"
    );
    expect(
      value(
        reportLines(facts({ lint: { kind: "failed", error: "eslint no está" } })),
        "lint"
      )
    ).toBe("sin medir: eslint no está");
  });

  it("medido cuenta ficheros, errores y avisos, con la cobertura", () => {
    const lines = reportLines(
      facts({
        lint: {
          kind: "measured",
          path: "/repo/.codarch/lint.repmod.json",
          bytes: 1024,
          totals: { errors: 1, warnings: 3, info: 0, files: 2 },
          measured: 10
        }
      })
    );

    expect(value(lines, "lint")).toBe(
      "/repo/.codarch/lint.repmod.json (1 KB) · 2 ficheros con hallazgos de 10 medidos · 1 error · 3 avisos"
    );
  });

  it("un solo fichero con hallazgos no se pluraliza", () => {
    const lines = reportLines(
      facts({
        lint: {
          kind: "measured",
          path: "/lint.json",
          bytes: 10,
          totals: { errors: 1, warnings: 0, info: 1, files: 1 }
        }
      })
    );

    expect(value(lines, "lint")).toBe(
      "/lint.json (10 B) · 1 fichero con hallazgos · 1 error · 0 avisos · 1 info"
    );
  });

  it("sin totales no se inventan cuentas, pero el artefacto se enseña", () => {
    const lines = reportLines(
      facts({
        lint: {
          kind: "measured",
          path: "/lint.json",
          bytes: 10,
          totals: null
        }
      })
    );

    expect(value(lines, "lint")).toBe(
      "/lint.json (10 B) · 0 ficheros con hallazgos · 0 errores · 0 avisos"
    );
  });
});

describe("migración, parseo y alcances", () => {
  it("sin lenguas de migración queda un guion", () => {
    expect(value(reportLines(facts()), "migración")).toBe(
      "— · 0 puentes · 0 FFI · deuda 0"
    );
  });

  it("con lenguas, cada una con su rloc", () => {
    const lines = reportLines(
      facts({
        migration: {
          languages: [
            ["typescript", 120],
            ["python", 30]
          ],
          bridges: 2,
          ffi: 3,
          debt: 40
        }
      })
    );

    expect(value(lines, "migración")).toBe(
      "typescript 120 · python 30 · 2 puentes · 3 FFI · deuda 40"
    );
  });

  it("el parseo cuenta reutilizados, parseados y lo que vino de abajo", () => {
    const lines = reportLines(
      facts({ parse: { hits: 150, misses: 2, fromScopes: 7 } })
    );

    expect(value(lines, "parseo")).toBe(
      "150 reutilizados · 2 parseados · 7 de alcances de debajo"
    );
  });

  it("una caché que no se pudo guardar se dice, no se calla", () => {
    const lines = reportLines(facts({ parse: { error: "EACCES" } }));

    expect(value(lines, "parseo")).toBe("no se pudo guardar la caché: EACCES");
  });

  it("sin alcances, un guion; con ellos, cuántos y cuántos están viejos", () => {
    expect(value(reportLines(facts()), "alcances")).toBe("—");

    const lines = reportLines(facts({ scopes: { nested: 2, stale: 1 } }));
    expect(value(lines, "alcances")).toBe(
      "2 anidados · 1 con ficheros más nuevos"
    );
  });

  it("un registro que falla también se dice", () => {
    const lines = reportLines(facts({ scopes: { error: "sin permiso" } }));

    expect(value(lines, "alcances")).toBe("no se pudo registrar: sin permiso");
  });
});

describe("historial y churn", () => {
  it("sin `--history` no hay línea de historial", () => {
    expect(labels(reportLines(facts()))).not.toContain("historial");
  });

  it("el historial dice si guardó, si no hacía falta o si falló", () => {
    expect(
      value(reportLines(facts({ history: { saved: "2026-10-31.json" } })), "historial")
    ).toBe("guardado 2026-10-31.json");
    expect(
      value(reportLines(facts({ history: { unchanged: true } })), "historial")
    ).toBe("sin cambios; ya había una foto igual");
    expect(
      value(reportLines(facts({ history: { error: "EACCES" } })), "historial")
    ).toBe("no se pudo guardar: EACCES");
  });

  it("con git, commits, autores y si el clon está recortado", () => {
    const lines = reportLines(
      facts({
        churn: {
          enabled: true,
          commits: 420,
          authors: 3,
          shallow: true,
          files: 10
        }
      })
    );

    expect(value(lines, "churn")).toBe("420 commits · 3 autores · shallow");
  });

  it("sin git distingue el repo vacío del que no es git", () => {
    expect(value(reportLines(facts()), "churn")).toBe(
      "sin git; se omite churn"
    );
    expect(
      value(
        reportLines(
          facts({
            churn: {
              enabled: false,
              commits: 0,
              authors: 0,
              shallow: false,
              files: 0
            }
          })
        ),
        "churn"
      )
    ).toBe("sin ficheros que analizar; se omite churn");
  });
});

describe("avisos y sin resolver", () => {
  it("enseña diez avisos y cuenta el resto", () => {
    const lines = reportLines(
      facts({ warnings: Array.from({ length: 13 }, (_, index) => `w${index}`) })
    );
    const warnings = lines.filter((line) => line.trimStart().startsWith("aviso"));

    expect(warnings).toHaveLength(11);
    expect(value(lines, "aviso")).toBe("w0");
    expect(lastLine(warnings)).toBe("aviso y 3 más");
  });

  it("enseña cinco imports sin resolver y cuenta el resto", () => {
    const lines = reportLines(
      facts({
        unresolved: Array.from({ length: 7 }, (_, index) => ({
          file: `src/${index}.ts`,
          line: index + 1,
          specifier: "lodash",
          reason: "external"
        }))
      })
    );
    const pending = lines.filter((line) =>
      line.trimStart().startsWith("sin resolver")
    );

    expect(pending).toHaveLength(6);
    expect(value(lines, "sin resolver")).toBe(
      "src/0.ts:1 lodash (external)"
    );
    expect(lastLine(pending)).toBe("sin resolver y 2 más");
  });

  it("sin avisos ni rotos no hay líneas de más", () => {
    const lines = reportLines(facts());

    expect(labels(lines)).toEqual([
      "raíz",
      "snapshot",
      "lint",
      "estructura",
      "imports",
      "migración",
      "parseo",
      "alcances",
      "tiempo",
      "churn"
    ]);
  });
});
