import { describe, expect, it, vi } from "vitest";
import type { SavedProject } from "@codarch/ui";
import { restoreSession } from "../src/renderer/restore";

function project(label: string, snapshot: unknown = {}): SavedProject {
  return { snapshot, report: null, label, reportLabel: null, addons: [] };
}

describe("restauración del escritorio", () => {
  it("migra el proyecto viejo a .codarch y lo olvida", async () => {
    const legacy = project("/repos/viejo");
    const restored = project("/repos/viejo", { meta: { projectName: "x" } });
    const deps = {
      readLegacy: () => legacy,
      persist: vi.fn(async () => true),
      readLastRoot: () => "/repos/viejo",
      writeLastRoot: vi.fn(),
      clearLegacy: vi.fn(),
      restore: vi.fn(async () => restored)
    };

    await expect(restoreSession(deps)).resolves.toBe(restored);

    expect(deps.persist).toHaveBeenCalledWith(legacy);
    expect(deps.writeLastRoot).toHaveBeenCalledWith("/repos/viejo");
    expect(deps.clearLegacy).toHaveBeenCalledOnce();
    expect(deps.restore).toHaveBeenCalledWith("/repos/viejo");
  });

  it("conserva el proyecto viejo si no se puede escribir en el repo", async () => {
    const legacy = project("/repos/que-ya-no-existe");
    const deps = {
      readLegacy: () => legacy,
      persist: vi.fn(async () => false),
      readLastRoot: () => "/repos/otro",
      writeLastRoot: vi.fn(),
      clearLegacy: vi.fn(),
      restore: vi.fn(async () => null)
    };

    await expect(restoreSession(deps)).resolves.toBe(legacy);

    expect(deps.clearLegacy).not.toHaveBeenCalled();
    expect(deps.restore).not.toHaveBeenCalled();
    expect(deps.writeLastRoot).not.toHaveBeenCalled();
  });

  it("sin proyecto viejo, restaura el último repo desde su .codarch", async () => {
    const restored = project("/repos/actual");
    const deps = {
      readLegacy: () => null,
      persist: vi.fn(async () => true),
      readLastRoot: () => "/repos/actual",
      writeLastRoot: vi.fn(),
      clearLegacy: vi.fn(),
      restore: vi.fn(async () => restored)
    };

    await expect(restoreSession(deps)).resolves.toBe(restored);

    expect(deps.persist).not.toHaveBeenCalled();
    expect(deps.restore).toHaveBeenCalledWith("/repos/actual");
  });

  it("sin nada guardado no restaura nada", async () => {
    const deps = {
      readLegacy: () => null,
      persist: vi.fn(async () => true),
      readLastRoot: () => null,
      writeLastRoot: vi.fn(),
      clearLegacy: vi.fn(),
      restore: vi.fn(async () => null)
    };

    await expect(restoreSession(deps)).resolves.toBeNull();

    expect(deps.restore).not.toHaveBeenCalled();
  });

  it("si el repo perdió su .codarch, el arranque queda vacío", async () => {
    const deps = {
      readLegacy: () => null,
      persist: vi.fn(async () => true),
      readLastRoot: () => "/repos/limpiado",
      writeLastRoot: vi.fn(),
      clearLegacy: vi.fn(),
      restore: vi.fn(async () => null)
    };

    await expect(restoreSession(deps)).resolves.toBeNull();
  });
});
