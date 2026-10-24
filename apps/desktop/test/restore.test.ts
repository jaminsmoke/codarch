import { describe, expect, it, vi } from "vitest";
import type { SavedProject } from "@codarch/ui";
import { restaurarSesion } from "../src/renderer/restore";

function proyecto(label: string, snapshot: unknown = {}): SavedProject {
  return { snapshot, report: null, label, reportLabel: null, addons: [] };
}

describe("restauración del escritorio", () => {
  it("migra el proyecto viejo a .codarch y lo olvida", async () => {
    const legado = proyecto("/repos/viejo");
    const restaurado = proyecto("/repos/viejo", { meta: { projectName: "x" } });
    const deps = {
      leerLegado: () => legado,
      persistir: vi.fn(async () => true),
      leerUltimaRaiz: () => "/repos/viejo",
      escribirUltimaRaiz: vi.fn(),
      olvidarLegado: vi.fn(),
      restaurar: vi.fn(async () => restaurado)
    };

    await expect(restaurarSesion(deps)).resolves.toBe(restaurado);

    expect(deps.persistir).toHaveBeenCalledWith(legado);
    expect(deps.escribirUltimaRaiz).toHaveBeenCalledWith("/repos/viejo");
    expect(deps.olvidarLegado).toHaveBeenCalledOnce();
    expect(deps.restaurar).toHaveBeenCalledWith("/repos/viejo");
  });

  it("conserva el proyecto viejo si no se puede escribir en el repo", async () => {
    const legado = proyecto("/repos/que-ya-no-existe");
    const deps = {
      leerLegado: () => legado,
      persistir: vi.fn(async () => false),
      leerUltimaRaiz: () => "/repos/otro",
      escribirUltimaRaiz: vi.fn(),
      olvidarLegado: vi.fn(),
      restaurar: vi.fn(async () => null)
    };

    await expect(restaurarSesion(deps)).resolves.toBe(legado);

    expect(deps.olvidarLegado).not.toHaveBeenCalled();
    expect(deps.restaurar).not.toHaveBeenCalled();
    expect(deps.escribirUltimaRaiz).not.toHaveBeenCalled();
  });

  it("sin proyecto viejo, restaura el último repo desde su .codarch", async () => {
    const restaurado = proyecto("/repos/actual");
    const deps = {
      leerLegado: () => null,
      persistir: vi.fn(async () => true),
      leerUltimaRaiz: () => "/repos/actual",
      escribirUltimaRaiz: vi.fn(),
      olvidarLegado: vi.fn(),
      restaurar: vi.fn(async () => restaurado)
    };

    await expect(restaurarSesion(deps)).resolves.toBe(restaurado);

    expect(deps.persistir).not.toHaveBeenCalled();
    expect(deps.restaurar).toHaveBeenCalledWith("/repos/actual");
  });

  it("sin nada guardado no restaura nada", async () => {
    const deps = {
      leerLegado: () => null,
      persistir: vi.fn(async () => true),
      leerUltimaRaiz: () => null,
      escribirUltimaRaiz: vi.fn(),
      olvidarLegado: vi.fn(),
      restaurar: vi.fn(async () => null)
    };

    await expect(restaurarSesion(deps)).resolves.toBeNull();

    expect(deps.restaurar).not.toHaveBeenCalled();
  });

  it("si el repo perdió su .codarch, el arranque queda vacío", async () => {
    const deps = {
      leerLegado: () => null,
      persistir: vi.fn(async () => true),
      leerUltimaRaiz: () => "/repos/limpiado",
      escribirUltimaRaiz: vi.fn(),
      olvidarLegado: vi.fn(),
      restaurar: vi.fn(async () => null)
    };

    await expect(restaurarSesion(deps)).resolves.toBeNull();
  });
});
