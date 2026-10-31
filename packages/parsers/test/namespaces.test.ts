import { describe, expect, it } from "vitest";
import {
  closeNamespaces,
  noteNamespaces,
  resolveNamespaceImports,
  type PendingNamespaceImport
} from "../src/analyze/namespaces";
import { emptyState } from "../src/analyze/state";
import type { ParsedImport } from "../src/types";

/**
 * La regla de los `using` de C#, sola (ADR 0090).
 *
 * Los casos de punta a punta viven en `csharp.test.ts`; aquí se fija la regla
 * en sí —tres preguntas por import— porque es la pieza del análisis que se
 * resuelve al final y la que más fácil se rompe sin que nadie lo note.
 */

const imported: ParsedImport = {
  specifier: "Acme.Billing",
  kind: "static",
  typeOnly: false,
  line: 3
};

function pending(
  overrides: Partial<PendingNamespaceImport> = {}
): PendingNamespaceImport {
  return {
    file: "src/a.cs",
    metrics: {},
    imported,
    namespaces: ["Acme.Billing"],
    builtin: false,
    ...overrides
  };
}

describe("un `using` que sí declara alguien", () => {
  it("deja una arista por fichero declarante, ordenadas, y ninguna a sí mismo", () => {
    const links: { from: string; to: string; typeOnly: boolean }[] = [];
    const result = resolveNamespaceImports(
      [pending()],
      new Map([
        ["Acme.Billing", ["src/z.cs", "src/a.cs", "src/m.cs"]]
      ]),
      links
    );

    expect(links).toEqual([
      { from: "src/a.cs", to: "src/m.cs", typeOnly: false },
      { from: "src/a.cs", to: "src/z.cs", typeOnly: false }
    ]);
    expect(result).toEqual({ external: 0, builtin: 0, unresolved: [] });
  });

  it("respeta que el import sea de tipos", () => {
    const links: { from: string; to: string; typeOnly: boolean }[] = [];
    resolveNamespaceImports(
      [
        pending({
          imported: { ...imported, typeOnly: true }
        })
      ],
      new Map([["Acme.Billing", ["src/b.cs"]]]),
      links
    );

    expect(links).toEqual([
      { from: "src/a.cs", to: "src/b.cs", typeOnly: true }
    ]);
  });
});

describe("un `using` que no declara nadie", () => {
  it("es un import roto si el repo declara esa raíz", () => {
    const metrics: Record<string, number> = { unresolvedImports: 0 };
    const result = resolveNamespaceImports(
      [pending({ metrics, namespaces: ["Acme.Gone"] })],
      new Map([["Acme.Billing", ["src/b.cs"]]]),
      []
    );

    expect(result.unresolved).toEqual([
      {
        file: "src/a.cs",
        line: 3,
        specifier: "Acme.Billing",
        reason: "no se encontró el espacio de nombres"
      }
    ]);
    expect(metrics.unresolvedImports).toBe(1);
  });

  it("es plataforma si el lenguaje lo trae", () => {
    const metrics: Record<string, number> = { builtinImports: 0 };
    const result = resolveNamespaceImports(
      [pending({ metrics, namespaces: ["System.Text"], builtin: true })],
      new Map([["Acme.Billing", ["src/b.cs"]]]),
      []
    );

    expect(result).toEqual({ external: 0, builtin: 1, unresolved: [] });
    expect(metrics.builtinImports).toBe(1);
  });

  it("es una dependencia si no es del repo ni de la plataforma", () => {
    const metrics: Record<string, number> = { externalImports: 0 };
    const result = resolveNamespaceImports(
      [pending({ metrics, namespaces: ["Newtonsoft.Json"] })],
      new Map([["Acme.Billing", ["src/b.cs"]]]),
      []
    );

    expect(result).toEqual({ external: 1, builtin: 0, unresolved: [] });
    expect(metrics.externalImports).toBe(1);
  });

  it("no cuenta nada si el espacio solo lo declara el propio fichero", () => {
    const metrics: Record<string, number> = {};
    const result = resolveNamespaceImports(
      [pending({ metrics })],
      new Map([["Acme.Billing", ["src/a.cs"]]]),
      []
    );

    // El `using` del espacio que uno mismo declara es lo normal en C#.
    expect(result).toEqual({ external: 0, builtin: 0, unresolved: [] });
    expect(metrics).toEqual({});
  });
});

describe("el cierre de los pendientes", () => {
  it("no hace nada si no había `using` de espacio", () => {
    const state = emptyState(["un aviso"]);
    closeNamespaces(state);

    expect(state.links).toEqual([]);
    expect(state.warnings).toEqual(["un aviso"]);
  });

  it("suma a la pasada lo que quedó pendiente", () => {
    const state = emptyState([]);
    noteNamespaces(["Acme.Billing"], "src/b.cs", state.namespaceDeclarations);
    state.pendingNamespaces.push(
      pending(),
      pending({
        file: "src/c.cs",
        imported: { ...imported, specifier: "System.Text", line: 1 },
        namespaces: ["System.Text"],
        builtin: true
      })
    );

    closeNamespaces(state);

    expect(state.links).toEqual([
      { from: "src/a.cs", to: "src/b.cs", typeOnly: false }
    ]);
    expect(state.builtin).toBe(1);
    expect(state.external).toBe(0);
    expect(state.unresolved).toEqual([]);
  });
});
