/**
 * @vitest-environment jsdom
 */
import { createElement } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LintArtifact } from "@codarch/lint/browser";
import { LintConfigSection } from "../src/panels/LintConfigSection";

const artifact: LintArtifact = {
  schemaVersion: "1.3",
  domain: "code",
  meta: {
    checksum: "abc",
    tools: ["oxlint"],
    systems: [
      {
        name: "oxlint",
        config: ".oxlintrc.json",
        rules: [{ id: "no-var", severity: "error" }]
      }
    ],
    tree: "tree-1"
  },
  files: {},
  summary: { files: 0, errors: 0, warnings: 0, messages: 0, measured: 1 },
  coverage: {
    tools: {
      oxlint: {
        outcome: "enumerated",
        measuredPaths: ["src/a.ts"],
        eligiblePaths: ["src/a.ts"]
      }
    }
  }
};

function section(onRuleChange?: () => Promise<{ ok: boolean; path?: string }>) {
  return createElement(LintConfigSection, {
    id: "config",
    domain: "code" as const,
    artifact,
    canEdit: Boolean(onRuleChange),
    onRuleChange
  });
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe("editar reglas desde la ficha", () => {
  it("activa una recomendada que no está en la config", async () => {
    const onRuleChange = vi.fn(async () => ({
      ok: true,
      path: ".oxlintrc.json"
    }));
    render(section(onRuleChange));

    fireEvent.click(screen.getByRole("button", { name: /^oxlint/ }));
    expect(screen.getByText("Recomendadas")).toBeTruthy();

    const row = screen.getByTitle("no-eval").closest("li");
    expect(row).not.toBeNull();
    fireEvent.click(
      within(row as HTMLElement).getByRole("button", { name: "Activar" })
    );

    await waitFor(() =>
      expect(onRuleChange).toHaveBeenCalledWith({
        system: "oxlint",
        rule: "no-eval",
        severity: "error"
      })
    );
  });

  it("desactiva una regla con confirmación y muestra el archivo", async () => {
    const onRuleChange = vi.fn(async () => ({
      ok: true,
      path: ".oxlintrc.json"
    }));
    render(section(onRuleChange));

    fireEvent.click(screen.getByRole("button", { name: /^oxlint/ }));
    fireEvent.click(
      screen.getByRole("button", { name: "Desactivar no-var" })
    );

    expect(screen.getByText(/¿Desactivar/)).toBeTruthy();
    expect(screen.getAllByText(".oxlintrc.json").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Desactivar" }));

    await waitFor(() =>
      expect(onRuleChange).toHaveBeenCalledWith({
        system: "oxlint",
        rule: "no-var",
        severity: null
      })
    );
  });

  it("sin plataforma editable no enseña acciones ni recomendaciones", () => {
    render(section());

    fireEvent.click(screen.getByRole("button", { name: /^oxlint/ }));

    expect(screen.queryByText("Recomendadas")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Desactivar no-var" })
    ).toBeNull();
  });
});
