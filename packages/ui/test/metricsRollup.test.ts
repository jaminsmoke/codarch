import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { LintArtifact } from "@codarch/lint/browser";
import type {
  RenderFile,
  RenderMetric,
  RenderModel,
  TreeNode
} from "@codarch/render/browser";
import { DuplicationSection } from "../src/panels/DuplicationSection";
import { FolderPanel } from "../src/panels/FolderPanel";
import { ProjectPanel } from "../src/panels/ProjectPanel";

function zeroPart() {
  return { value: 0, p95: 0, norm: 0, weight: 0, share: 0 };
}

/** Un fichero con lo que estas fichas miran: ruta, complejidad y líneas. */
function file(path: string, complexity: number, loc: number): RenderFile {
  return {
    index: 0,
    nodeId: path,
    path,
    name: path.split("/").pop() ?? path,
    section: 0,
    area: loc,
    actualArea: loc,
    risk: 0,
    riskParts: {
      complexity: zeroPart(),
      churn: zeroPart(),
      size: zeroPart(),
      lint: zeroPart()
    },
    riskBreakdown: null,
    complexity,
    churn: 0,
    lint: 0,
    // Alineados con `metrics`: loc y rloc.
    values: [loc, loc],
    kind: null
  };
}

function metric(key: string): RenderMetric {
  return {
    key,
    title: key === "loc" ? "Líneas" : "Líneas de código",
    direction: 0,
    min: 0,
    max: 160,
    actualMax: 160,
    p95: 100,
    mode: "linear",
    coverage: 3
  };
}

function folder(path: string, files: number, children: TreeNode[] = []): TreeNode {
  return {
    kind: "folder",
    key: `d:${path}`,
    name: path.split("/").pop() ?? path,
    path,
    value: 1,
    fileCount: files,
    section: 0,
    children
  };
}

const ui = folder("packages/ui", 1);
const ui2 = folder("packages/ui2", 1);
const packages = folder("packages", 2, [ui, ui2]);
const apps = folder("apps", 1);

const model: RenderModel = {
  meta: {
    project: "demo",
    title: "demo",
    commit: "",
    checksum: "abc",
    historyChecksum: "",
    apiVersion: "cc.json 2.x",
    rootName: ""
  },
  files: [
    file("apps/web/src/main.ts", 5, 100),
    file("packages/ui/src/panel.ts", 15, 50),
    file("packages/ui2/src/other.ts", 1, 10)
  ],
  sections: [],
  metrics: [metric("loc"), metric("rloc")],
  edges: [],
  cycles: [],
  roots: [apps, packages],
  areaMetric: "loc",
  areaTitle: "líneas",
  totalArea: 160,
  fileCount: 3,
  folderCount: 4,
  hotspotCount: 0,
  defaultSelection: null,
  initialLens: "risk",
  initialMetric: null,
  duplication: {
    measured: false,
    nodes: {},
    pairsByNode: {},
    list: [],
    pairs: 0,
    duplicatedLines: 0,
    repeatedLines: 0
  },
  lintMax: 0,
  warnings: []
};

const lint: LintArtifact = {
  schemaVersion: "1.2",
  meta: {
    checksum: "abc",
    tools: ["eslint"],
    systems: [{ name: "eslint", config: "eslint.config.js" }]
  },
  files: {
    "apps/web/src/main.ts": {
      errors: 2,
      warnings: 1,
      messages: [
        { rule: "no-console", severity: "warn", message: "Unexpected console" },
        { rule: "no-var", severity: "error", message: "Unexpected var" },
        { rule: "no-debugger", severity: "error", message: "Unexpected debugger" }
      ]
    },
    "packages/ui/src/panel.ts": {
      errors: 0,
      warnings: 4,
      messages: [
        {
          rule: "@typescript-eslint/no-explicit-any",
          severity: "warn",
          message: "Unexpected any"
        },
        {
          rule: "@typescript-eslint/no-explicit-any",
          severity: "warn",
          message: "Unexpected any"
        },
        {
          rule: "@typescript-eslint/no-explicit-any",
          severity: "warn",
          message: "Unexpected any"
        },
        {
          rule: "@typescript-eslint/no-explicit-any",
          severity: "warn",
          message: "Unexpected any"
        }
      ]
    },
    "packages/ui2/src/other.ts": {
      errors: 1,
      warnings: 0,
      messages: [
        { rule: "no-console", severity: "error", message: "Unexpected console" }
      ]
    }
  },
  summary: { files: 3, errors: 3, warnings: 5, messages: 8, measured: 4 }
};

function projectMarkup(artifact: LintArtifact | null): string {
  return renderToStaticMarkup(
    createElement(ProjectPanel, {
      model,
      lint: artifact,
      metricTitle: (key: string) => (key === "loc" ? "Líneas" : key),
      colorMode: "",
      onColorMode: () => {},
      onSelectPath: () => {},
      onSelectFolder: () => {}
    })
  );
}

describe("la ficha del proyecto", () => {
  it("cuenta el mapa entero: ficheros, carpetas, líneas y complejidad", () => {
    const markup = projectMarkup(lint);

    expect(markup).toContain("Proyecto");
    expect(markup).toContain("3 ficheros");
    expect(markup).toContain("160");
    // El máximo dice en qué fichero está (ADR 0092).
    expect(markup).toContain("15");
    expect(markup).toContain("packages/ui/src/panel.ts");
  });

  it("tiene un solo bloque de salud y baja por carpeta", () => {
    const markup = projectMarkup(lint);

    expect(markup.match(/class="lint-health"/g)).toHaveLength(1);
    expect(markup).toContain("3 errores");
    expect(markup).toContain("5 avisos");
    expect(markup).toContain("0 info");
    expect(markup).toContain(">3 ficheros<");
    expect(markup).toContain("Cobertura no verificada");
    expect(markup).not.toContain("La pasada miró");
    expect(markup).not.toContain("Medido y limpio");
    expect(markup).not.toContain("Limpio y al día");
    expect(markup).not.toContain("de 4 medidos");
    expect(markup).not.toContain("Hallazgos por regla");
    expect(markup).not.toContain("reglas con hallazgos");
    expect(markup).toContain("apps/web/src/main.ts");
    expect(markup).toContain("packages/ui/src/panel.ts");
    expect(markup).not.toContain("Pintar el mapa");
    expect(markup).toContain("Lint por carpeta");
    expect(markup).toContain("apps/");
    expect(markup).toContain("packages/");
    expect(markup).toContain(">Info<");
  });

  it("avisa cuando el lint es de otro árbol", () => {
    const markup = projectMarkup({
      ...lint,
      meta: { ...lint.meta, tree: "otro-arbol" }
    });

    expect(markup).toContain("Este análisis es de otro árbol");
  });

  it("no avisa cuando el lint es del árbol que se está mirando", () => {
    const markup = projectMarkup({
      ...lint,
      meta: { ...lint.meta, tree: "abc" }
    });

    expect(markup).not.toContain("Este análisis es de otro árbol");
  });

  it("sin artefacto dice «sin medir» y no inventa la tabla", () => {
    const markup = projectMarkup(null);

    expect(markup).toContain("Sin medir");
    expect(markup).toContain("codarch analyze");
    expect(markup).not.toContain("Lint por carpeta");
  });

  it("la sección Lint enseña la herramienta, no el catálogo de reglas activas", () => {
    const markup = projectMarkup({
      ...lint,
      meta: {
        ...lint.meta,
        tools: ["eslint"],
        systems: [
          {
            name: "eslint",
            config: "eslint.config.js",
            rules: [{ id: "no-console", severity: "error" }]
          }
        ]
      }
    });

    expect(markup).toContain("Herramientas");
    expect(markup).toContain("eslint.config.js");
    expect(markup).not.toContain("regla activa");
    expect(markup).not.toContain("Hallazgos por regla");
    expect(markup).toContain("Ficheros con hallazgos");
    expect(markup).toContain("apps/web/src/main.ts");
  });

  it("un proyecto medido y limpio dice que se miró, no solo que hay cero", () => {
    const markup = projectMarkup({
      ...lint,
      meta: {
        ...lint.meta,
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
      files: {},
      summary: { files: 0, errors: 0, warnings: 0, messages: 0, measured: 4 }
    });

    expect(markup).toContain('collapsible-count">0');
    expect(markup).toContain("Cobertura no verificada");
    expect(markup).toContain("anterior a la cobertura");
    expect(markup).not.toContain("La pasada miró");
    expect(markup).not.toContain("Medido y limpio");
    expect(markup).not.toContain("Limpio y al día");
    expect(markup).not.toContain("Configuración ·");
    expect(markup).not.toContain("regla activa");
    expect(markup).toContain("eslint.config.js");
  });

  it("sin artefacto no recomienda configuración dentro de los hallazgos", () => {
    const markup = projectMarkup(null);

    expect(markup).toContain("Sin medir");
    expect(markup).toContain("codarch analyze");
    expect(markup).not.toContain("Mínimo recomendable");
    expect(markup).not.toContain("ESLint + typescript-eslint");
  });

  it("en docs no dice que el lint está sin medir si el bloque de métricas se apaga", () => {
    const markup = renderToStaticMarkup(
      createElement(ProjectPanel, {
        model,
        lint,
        rulesMode: true,
        metricTitle: (key: string) => key,
        colorMode: "",
        onColorMode: () => {},
        onSelectPath: () => {},
        onSelectFolder: () => {}
      })
    );
    const lintAt = markup.indexOf("section-lint");
    expect(lintAt).toBeGreaterThan(0);
    expect(markup.slice(0, lintAt)).not.toContain("Sin medir");
    expect(markup).toContain(">Lint<");
    expect(markup).not.toContain(">Reglas<");
  });
});

describe("la ficha de carpeta", () => {
  it("suma su subárbol y deja bajar a sus carpetas", () => {
    const markup = renderToStaticMarkup(
      createElement(FolderPanel, {
        folder: packages,
        model,
        lint,
        changes: null,
        onScopeChanges: () => {},
        metricTitle: (key: string) => (key === "loc" ? "Líneas" : key),
        colorMode: "",
        onColorMode: () => {},
        onSelectPath: () => {},
        onSelectFolder: () => {}
      })
    );

    expect(markup).toContain("Métricas");
    // La misma tabla que la ficha del fichero, con la cobertura en la barra.
    expect(markup).toContain("metrics-head");
    expect(markup).toContain(">Cob.<");
    expect(markup).toContain("La complejidad más alta está en");
    expect(markup).toContain("1 error");
    expect(markup).toContain("4 avisos");
    expect(markup).toContain("0 info");
    expect(markup).toContain("60");
    expect(markup).toContain("Lint por carpeta");
    expect(markup).toContain("ui/");
    expect(markup.match(/class="lint-health"/g)).toHaveLength(1);
    expect(markup).toContain("packages/ui/src/panel.ts");
    expect(markup).toContain("packages/ui2/src/other.ts");
    expect(markup).not.toContain("apps/web/src/main.ts");
    expect(markup).not.toContain("de 4 medidos");
    expect(markup).not.toContain("Medido y limpio");
    expect(markup).not.toContain("Limpio y al día");
    expect(markup).toContain("Cobertura no verificada");
  });

  it("la carpeta casa rutas NFC y no se lleva el prefijo de al lado", () => {
    const composed = "caf\u00e9";
    const decomposed = "cafe\u0301";
    const cafe = folder(decomposed, 1);
    const cafeLint: LintArtifact = {
      ...lint,
      files: {
        [`${composed}/a.ts`]: {
          errors: 9,
          warnings: 0,
          messages: [{ rule: "no-var", severity: "error", message: "var", line: 3, column: 2 }]
        },
        [`${composed}2/b.ts`]: {
          errors: 1,
          warnings: 0,
          messages: [{ rule: "no-console", severity: "error", message: "console" }]
        }
      },
      summary: { files: 2, errors: 9, warnings: 0, messages: 2, measured: 80 }
    };
    const markup = renderToStaticMarkup(
      createElement(FolderPanel, {
        folder: cafe,
        model,
        lint: cafeLint,
        changes: null,
        onScopeChanges: () => {},
        metricTitle: (key: string) => key,
        colorMode: "",
        onColorMode: () => {},
        onSelectPath: () => {},
        onSelectFolder: () => {}
      })
    );

    expect(markup).toContain(`${composed}/a.ts`);
    expect(markup).not.toContain(`${composed}2/b.ts`);
    expect(markup).toContain("1 error");
    expect(markup).not.toContain("9 errores");
    expect(markup).not.toContain("de 80 medidos");
    expect(markup).not.toContain("Medido y limpio");
    expect(markup).not.toContain("Limpio y al día");
    expect(markup).toContain("Cobertura no verificada");
    expect(markup).toContain("se muestran los hallazgos observados");
    expect(markup.match(/class="lint-health"/g)).toHaveLength(1);
  });
});

describe("el riesgo con dueño en la ficha", () => {
  const risky = {
    ...model,
    files: model.files.map((file) =>
      file.path === "packages/ui/src/panel.ts" ? { ...file, risk: 0.81 } : file
    )
  };

  it("nombra al fichero con el riesgo máximo del subárbol", () => {
    const markup = renderToStaticMarkup(
      createElement(FolderPanel, {
        folder: packages,
        model: risky,
        lint,
        changes: null,
        onScopeChanges: () => {},
        metricTitle: (key: string) => key,
        colorMode: "",
        onColorMode: () => {},
        onSelectPath: () => {},
        onSelectFolder: () => {}
      })
    );

    expect(markup).toContain("Riesgo máx.");
    expect(markup).toContain("El riesgo más alto está en");
    expect(markup).toContain("packages/ui/src/panel.ts");
    expect(markup).toContain("81");
  });
});

describe("la duplicación en proyecto y carpeta", () => {
  const duplicated = {
    ...model,
    duplication: {
      measured: true,
      nodes: {
        "packages/ui/src/panel.ts": {
          duplicatedLines: 30,
          repeatedLines: 4,
          duplicateOf: null
        },
        "apps/web/src/main.ts": {
          duplicatedLines: 20,
          repeatedLines: 0,
          duplicateOf: null
        }
      },
      pairsByNode: {
        "packages/ui/src/panel.ts": [
          {
            path: "apps/web/src/main.ts",
            lines: 20,
            similarity: 72,
            status: "diverging" as const
          }
        ],
        "apps/web/src/main.ts": [
          {
            path: "packages/ui/src/panel.ts",
            lines: 20,
            similarity: 72,
            status: "diverging" as const
          }
        ]
      },
      list: [
        {
          from: "packages/ui/src/panel.ts",
          to: "apps/web/src/main.ts",
          lines: 20,
          similarity: 72,
          status: "diverging" as const
        }
      ],
      pairs: 1,
      duplicatedLines: 50,
      repeatedLines: 4
    }
  };

  it("el proyecto suma líneas y divide una vez por su rloc", () => {
    const markup = renderToStaticMarkup(
      createElement(ProjectPanel, {
        model: duplicated,
        lint: null,
        metricTitle: (key: string) => key,
        colorMode: "duplicatedLines",
        onColorMode: () => {},
        onSelectPath: () => {},
        onSelectFolder: () => {}
      })
    );

    expect(markup).toContain("Duplicación");
    expect(markup).toContain("50");
    // 50 líneas duplicadas sobre 160 de rloc: un solo porcentaje, no una suma.
    expect(markup).toContain("31%");
    expect(markup).toContain("de 160 rloc");
  });

  it("la carpeta cuenta solo su subárbol y no hereda el porcentaje del padre", () => {
    const markup = renderToStaticMarkup(
      createElement(FolderPanel, {
        folder: packages,
        model: duplicated,
        lint: null,
        changes: null,
        onScopeChanges: () => {},
        metricTitle: (key: string) => key,
        colorMode: "duplicatedLines",
        onColorMode: () => {},
        onSelectPath: () => {},
        onSelectFolder: () => {}
      })
    );

    expect(markup).toContain("30");
    // 30 sobre 60 de rloc, no 30 sobre 160.
    expect(markup).toContain("50%");
    expect(markup).toContain("de 60 rloc");
  });

  it("el proyecto lista los pares con sus dos extremos y su filtro", () => {
    const markup = renderToStaticMarkup(
      createElement(ProjectPanel, {
        model: duplicated,
        lint: null,
        metricTitle: (key: string) => key,
        colorMode: "duplicatedLines",
        onColorMode: () => {},
        onSelectPath: () => {},
        onSelectFolder: () => {}
      })
    );

    // La lista no repite la cifra: dice qué dos ficheros y cuánto comparten.
    expect(markup).toContain("duplication-list");
    expect(markup).toContain("packages/ui/src/panel.ts");
    expect(markup).toContain("apps/web/src/main.ts");
    expect(markup).toContain("72%");
    expect(markup).toContain("20 líneas");
    // El filtro lleva su cuenta por estado antes de filtrar.
    expect(markup).toContain("Copias");
    expect(markup).toContain("Divergentes");
    expect(markup).toContain("Todos");
  });

  it("la ficha avisa de la divergencia y nombra al otro lado", () => {
    const panel = duplicated.files.find(
      (entry) => entry.path === "packages/ui/src/panel.ts"
    );
    if (!panel) throw new Error("falta el fichero del fixture");

    const markup = renderToStaticMarkup(
      createElement(DuplicationSection, {
        id: "file",
        model: duplicated,
        files: [panel],
        file: panel,
        onSelectPath: () => {}
      })
    );

    expect(markup).toContain("Comparte el 72 % con");
    expect(markup).toContain("se están separando");
  });

  it("la ficha del fichero enseña su proporción y sus pares", () => {
    const panel = duplicated.files.find(
      (entry) => entry.path === "packages/ui/src/panel.ts"
    );
    if (!panel) throw new Error("falta el fichero del fixture");

    const markup = renderToStaticMarkup(
      createElement(DuplicationSection, {
        id: "file",
        model: duplicated,
        files: [panel],
        file: panel,
        onSelectPath: () => {}
      })
    );

    // 30 líneas duplicadas sobre sus 50 de rloc.
    expect(markup).toContain("30");
    expect(markup).toContain("60%");
    expect(markup).toContain("de 50 rloc");
    // El par dice con quién comparte, cuánto y cuántas líneas.
    expect(markup).toContain("apps/web/src/main.ts");
    expect(markup).toContain("72%");
    expect(markup).toContain("20 líneas");
  });

  it("sin lente dice que está sin medir", () => {
    const markup = projectMarkup(null);
    expect(markup).toContain("sin medir");
    expect(markup).toContain("no trae la lente de duplicación");
  });
});

describe("la tinta de la tabla en carpeta y proyecto", () => {
  // `loc` con dirección de deuda y un fichero por encima del p95.
  const withDebt = [
    { ...metric("loc"), direction: -1, p95: 50 },
    metric("rloc")
  ];
  const big = {
    ...file("packages/ui/src/big.ts", 5, 120),
    values: [120, 120]
  };
  const small = {
    ...file("apps/web/src/main.ts", 3, 10),
    values: [10, 10]
  };
  const debtModel = { ...model, metrics: withDebt, files: [big, small] };

  it("el proyecto enseña la deuda de su peor fichero, no un verde", () => {
    const markup = renderToStaticMarkup(
      createElement(ProjectPanel, {
        model: debtModel,
        lint: null,
        metricTitle: (key: string) => key,
        colorMode: "",
        onColorMode: () => {},
        onSelectPath: () => {},
        onSelectFolder: () => {}
      })
    );

    expect(markup).toContain("metrics-row metrics-debt");
    // La tinta se explica: quién la pone y contra qué p95.
    expect(markup).toContain("el peor, packages/ui/src/big.ts (120 sobre p95 50)");
  });

  it("la carpeta la lleva en su sección, con el mismo contenedor", () => {
    const markup = renderToStaticMarkup(
      createElement(FolderPanel, {
        folder: packages,
        model: debtModel,
        lint: null,
        changes: null,
        onScopeChanges: () => {},
        metricTitle: (key: string) => key,
        colorMode: "",
        onColorMode: () => {},
        onSelectPath: () => {},
        onSelectFolder: () => {}
      })
    );

    expect(markup).toContain('class="collapsible section-metrics"');
    expect(markup).toContain("metrics-row metrics-debt");
  });

  it("un subárbol limpio no se tiñe", () => {
    const clean = { ...debtModel, files: [small] };
    const markup = renderToStaticMarkup(
      createElement(ProjectPanel, {
        model: clean,
        lint: null,
        metricTitle: (key: string) => key,
        colorMode: "",
        onColorMode: () => {},
        onSelectPath: () => {},
        onSelectFolder: () => {}
      })
    );

    expect(markup).toContain("metrics-row metrics-ok");
    expect(markup).not.toContain("metrics-row metrics-debt");
  });
});
