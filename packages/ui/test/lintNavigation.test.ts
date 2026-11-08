/**
 * @vitest-environment jsdom
 *
 * El markup estático no ejecuta onClick. Aquí se pulsa de verdad.
 */
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LintArtifact } from "@codarch/lint/browser";
import type { CodarchApp } from "../src/app/types";
import { LintSection } from "../src/LintSection";
import { ToolDock } from "../src/shell/ToolDock";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function catalog(tools: string[], systems: LintArtifact["meta"]["systems"]): LintArtifact {
  return {
    schemaVersion: "1.2",
    meta: { checksum: "abc", tools, systems },
    files: {
      "packages/ui/src/b.ts": {
        errors: 1,
        warnings: 0,
        messages: [
          {
            rule: "no-console",
            severity: "error",
            message: "Unexpected console",
            line: 3,
            column: 1
          }
        ]
      }
    },
    summary: { files: 1, errors: 1, warnings: 0, messages: 1, measured: 2 }
  };
}

const codeCatalog = catalog(
  ["eslint"],
  [
    {
      name: "eslint",
      config: "eslint.config.js",
      rules: [{ id: "eqeqeq", severity: "error" }]
    }
  ]
);

const emptyCatalog = catalog([], []);

function dock(lint: LintArtifact | null): { app: CodarchApp; setMap: ReturnType<typeof vi.fn> } {
  const setMap = vi.fn();
  const app = {
    state: {
      map: "code",
      rest: null,
      lint,
      restLint: null,
      settingsOpen: false,
      source: "test",
      areaMetric: null,
      colorMode: "risk",
      query: ""
    },
    actions: {
      setMap,
      setSettingsOpen: vi.fn(),
      setAreaMetric: vi.fn(),
      setColorMode: vi.fn(),
      setQuery: vi.fn(),
      openSymbolChain: vi.fn()
    },
    view: { model: null, error: null },
    migration: null,
    metricOptions: [],
    colorOptions: [],
    metricTitle: (key: string) => key,
    searchRef: { current: null },
    matches: 0,
    loadHeat: async () => null
  } as unknown as CodarchApp;
  return { app, setMap };
}

describe("la hoja de configuración se abre con un clic", () => {
  it("sin mapa del resto, Docs y config no abre un catálogo en la barra", () => {
    const { app, setMap } = dock(codeCatalog);
    render(createElement(ToolDock, { app }));

    const entry = screen.getByRole("button", { name: /Docs y config/ });
    expect((entry as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(entry);

    expect(screen.queryByText("Lint del código")).toBeNull();
    expect(screen.queryByText("eslint.config.js")).toBeNull();
    expect(screen.queryByText("eqeqeq")).toBeNull();
    expect(setMap).not.toHaveBeenCalled();
    expect(app.state.rest).toBeNull();
  });

  it("sin herramientas ni sistemas, la entrada está apagada y el clic no abre nada", () => {
    const { app, setMap } = dock(emptyCatalog);
    render(createElement(ToolDock, { app }));

    const entry = screen.getByRole("button", { name: /Docs y config/ });
    expect((entry as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(entry);

    expect(screen.queryByText("Lint del código")).toBeNull();
    expect(screen.queryByText("eslint.config.js")).toBeNull();
    expect(setMap).not.toHaveBeenCalled();
    expect(app.state.map).toBe("code");
  });
});

describe("un fichero con hallazgos se abre al pulsar", () => {
  it("onSelectPath recibe la ruta", () => {
    const onSelectPath = vi.fn();
    render(
      createElement(LintSection, {
        id: "lint",
        artifact: codeCatalog,
        folder: "packages/ui",
        onSelectPath
      })
    );

    fireEvent.click(screen.getByRole("button", { name: /packages\/ui\/src\/b\.ts/ }));

    expect(onSelectPath).toHaveBeenCalledTimes(1);
    expect(onSelectPath).toHaveBeenCalledWith("packages/ui/src/b.ts");
  });
});
