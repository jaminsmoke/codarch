import { describe, expect, it, vi } from "vitest";
import type { MenuItemConstructorOptions } from "electron";
import { menuTemplate, type MenuActions } from "../src/menu-template";

function actions(): MenuActions {
  return {
    analyzeFolder: vi.fn<() => void>(),
    openFile: vi.fn<() => void>(),
    openSettings: vi.fn<() => void>(),
    openDocs: vi.fn<() => void>()
  };
}

function submenu(
  template: MenuItemConstructorOptions[],
  label: string
): MenuItemConstructorOptions[] {
  const item = template.find((entry) => entry.label === label);
  return (item?.submenu as MenuItemConstructorOptions[]) ?? [];
}

function click(items: MenuItemConstructorOptions[], label: string): void {
  const item = items.find((entry) => entry.label === label);
  if (!item) throw new Error(`no hay «${label}» en el menú`);
  (item.click as () => void)();
}

describe("el menú nativo", () => {
  it("en Linux y Windows los rótulos llevan mnemónico", () => {
    const template = menuTemplate(actions(), "linux");
    const labels = template.map((item) => item.label);
    expect(labels).toContain("&Archivo");
    expect(labels).toContain("&Ayuda");
    // Sin el menú de aplicación de macOS.
    expect(labels).not.toContain("CodArch");
  });

  it("en macOS empieza por el menú de la app", () => {
    const template = menuTemplate(actions(), "darwin", "CodArch");
    expect(template[0]?.label).toBe("CodArch");
    expect(template.map((item) => item.label)).toContain("Archivo");
  });

  it("cada entrada llama a su acción", () => {
    const spy = actions() as MenuActions & {
      analyzeFolder: ReturnType<typeof vi.fn>;
      openFile: ReturnType<typeof vi.fn>;
      openSettings: ReturnType<typeof vi.fn>;
      openDocs: ReturnType<typeof vi.fn>;
    };
    const archivo = submenu(menuTemplate(spy, "linux"), "&Archivo");

    click(archivo, "Analizar carpeta…");
    click(archivo, "Abrir cc.json…");
    click(archivo, "Ajustes…");
    click(submenu(menuTemplate(spy, "linux"), "&Ayuda"), "Documentación");

    expect(spy.analyzeFolder).toHaveBeenCalledOnce();
    expect(spy.openFile).toHaveBeenCalledOnce();
    expect(spy.openSettings).toHaveBeenCalledOnce();
    expect(spy.openDocs).toHaveBeenCalledOnce();
  });

  it("los atajos son los que dice la documentación", () => {
    const archivo = submenu(menuTemplate(actions(), "win32"), "&Archivo");
    const byLabel = (label: string) =>
      archivo.find((entry) => entry.label === label);

    expect(byLabel("Analizar carpeta…")?.accelerator).toBe("CmdOrCtrl+O");
    expect(byLabel("Abrir cc.json…")?.accelerator).toBe("CmdOrCtrl+Shift+O");
    // Los ajustes no llevan atajo: Electron pintaría «Ctrl+Comma».
    expect(byLabel("Ajustes…")?.accelerator).toBeUndefined();
  });

  it("en Windows y Linux el último de Archivo es salir; en macOS, cerrar", () => {
    const archivoLinux = submenu(menuTemplate(actions(), "linux"), "&Archivo");
    expect(archivoLinux.at(-1)).toMatchObject({ role: "quit", label: "Salir" });

    const archivoMac = submenu(menuTemplate(actions(), "darwin"), "Archivo");
    expect(archivoMac.at(-1)).toMatchObject({ role: "close", label: "Cerrar" });
  });
});
