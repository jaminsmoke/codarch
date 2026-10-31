import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Live } from "../src/live";
/**
 * El renderer no tiene acceso a Node: pide ficheros por IPC y el proceso
 * principal decide. Aquí se comprueba lo que esa puerta no deja pasar —rutas
 * que se salen del repo abierto, ficheros de sistema, symlinks— sin Electron
 * de por medio: se capturan los manejadores y se llaman como lo haría el
 * renderer.
 */

const { handlers, openExternal } = vi.hoisted(() => ({
  handlers: new Map<string, (event: unknown, ...args: unknown[]) => unknown>(),
  openExternal: vi.fn<(url: string) => Promise<void>>(async () => undefined)
}));

vi.mock("electron", () => ({
  ipcMain: {
    handle: (
      channel: string,
      handler: (event: unknown, ...args: unknown[]) => unknown
    ) => {
      handlers.set(channel, handler);
    }
  },
  shell: { openExternal },
  dialog: { showOpenDialog: vi.fn(async () => ({ canceled: true })) },
  utilityProcess: { fork: vi.fn() }
}));

vi.mock("../src/updater", () => ({
  checkUpdate: vi.fn(),
  installUpdate: vi.fn()
}));

vi.mock("../src/dialogs", () => ({
  pickFolder: vi.fn(),
  pickFile: vi.fn()
}));

const { registerIpcHandlers } = await import("../src/ipc");
const { setCurrentRoot } = await import("../src/session");

const temporales: string[] = [];

/** Llama a un manejador como lo haría `ipcRenderer.invoke`. */
function ask<T>(channel: string, ...args: unknown[]): Promise<T> {
  const handler = handlers.get(channel);
  if (!handler) throw new Error(`sin manejador para ${channel}`);
  // El primer argumento de verdad es el `IpcMainInvokeEvent`.
  return Promise.resolve(handler(null, ...args) as T);
}

/** Un repo de mentira con un fichero de código, y un fichero de fuera. */
function repo(): { root: string; fuera: string } {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-ipc-"));
  temporales.push(base);
  const root = path.join(base, "repo");
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.mkdirSync(path.join(root, "node_modules", "x"), { recursive: true });
  fs.writeFileSync(path.join(root, "src", "a.ts"), "export const a = 1;\n");
  fs.writeFileSync(
    path.join(root, "node_modules", "x", "b.ts"),
    "export const b = 2;\n"
  );
  // En su propia carpeta para poder enlazarla con una junction en Windows.
  const afuera = path.join(base, "fuera");
  fs.mkdirSync(afuera);
  const fuera = path.join(afuera, "fuera.ts");
  fs.writeFileSync(fuera, "export const secreto = 3;\n");
  return { root, fuera };
}

beforeEach(() => {
  handlers.clear();
  openExternal.mockClear();
  registerIpcHandlers({
    live: {
      watch: vi.fn(),
      stop: vi.fn(),
      running: () => false,
      refresh: vi.fn(async () => undefined)
    } as unknown as Live
  });
});

afterEach(() => {
  setCurrentRoot(null);
  vi.restoreAllMocks();
  for (const directory of temporales.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("leer código y diff · rutas fuera del repo", () => {
  it("no devuelve código de un fichero que se sale con «..»", async () => {
    const { root } = repo();
    setCurrentRoot(root);

    for (const ruta of [
      "../fuera.ts",
      "src/../../fuera.ts",
      "../../etc/passwd.ts"
    ]) {
      await expect(ask("codarch:read-source", { path: ruta })).resolves.toBe(
        null
      );
    }
  });

  it("no devuelve código de una ruta absoluta", async () => {
    const { root, fuera } = repo();
    setCurrentRoot(root);

    // La ruta absoluta se normaliza como relativa y acaba dentro del repo: o
    // no existe ahí, o es otro fichero. Lo que no pasa es salirse.
    const snippet = await ask<{ path: string } | null>("codarch:read-source", {
      path: fuera,
      whole: true
    });
    expect(snippet?.path ?? "").not.toContain("..");
    expect(snippet).toBeNull();
  });

  it("no devuelve lo que el análisis no mira: node_modules ni `.git`", async () => {
    const { root } = repo();
    setCurrentRoot(root);

    for (const ruta of ["node_modules/x/b.ts", ".git/config.ts"]) {
      await expect(ask("codarch:read-source", { path: ruta })).resolves.toBe(
        null
      );
    }
  });

  it("tampoco por el diff: una ruta de fuera no tiene diff", async () => {
    const { root } = repo();
    setCurrentRoot(root);

    for (const ruta of ["../fuera.ts", "src/../../fuera.ts"]) {
      await expect(ask("codarch:read-diff", { path: ruta })).resolves.toBe(
        null
      );
    }
  });

  it("dentro del repo sí lee: la guarda no es un «no» a todo", async () => {
    const { root } = repo();
    setCurrentRoot(root);

    const snippet = await ask<{ path: string; lines: string[] } | null>(
      "codarch:read-source",
      { path: "src/a.ts" }
    );
    expect(snippet?.path).toBe("src/a.ts");
    expect(snippet?.lines[0]).toBe("export const a = 1;");

    const diff = await ask<{ path: string } | null>("codarch:read-diff", {
      path: "src/a.ts"
    });
    expect(diff?.path).toBe("src/a.ts");
  });
});

describe("leer código · sin repo abierto", () => {
  it("no lee nada, ni siquiera una ruta que sería válida", async () => {
    const { root } = repo();
    setCurrentRoot(null);

    await expect(
      ask("codarch:read-source", { path: path.join(root, "src/a.ts") })
    ).resolves.toBe(null);
    await expect(
      ask("codarch:read-diff", { path: "src/a.ts" })
    ).resolves.toBe(null);
    await expect(ask("codarch:history")).resolves.toBe(null);
    await expect(ask("codarch:chains")).resolves.toBe(null);
  });
});

describe("abrir en el editor · rutas fuera del repo", () => {
  it("no abre un fichero de fuera, ni relativo ni absoluto", async () => {
    const { root, fuera } = repo();
    setCurrentRoot(root);

    await expect(
      ask("codarch:open-editor", { path: "../fuera.ts" })
    ).resolves.toBe(false);
    await expect(
      ask("codarch:open-editor", { path: "src/../../fuera.ts" })
    ).resolves.toBe(false);
    await expect(
      ask("codarch:open-editor", { path: fuera })
    ).resolves.toBe(false);
    expect(openExternal).not.toHaveBeenCalled();
  });

  it("dentro del repo abre el editor en la línea pedida", async () => {
    const { root } = repo();
    setCurrentRoot(root);

    await expect(
      ask("codarch:open-editor", { path: "src/a.ts", line: 7 })
    ).resolves.toBe(true);
    expect(openExternal).toHaveBeenCalledTimes(1);
    const uri = String(openExternal.mock.calls[0]?.[0]);
    expect(uri).toContain("vscode://file");
    expect(uri.endsWith(":7")).toBe(true);
    expect(uri).not.toContain("..");
  });
});

describe("un enlace dentro del repo", () => {
  /**
   * El enlace, o `false` si el sistema no deja crearlo.
   *
   * Windows necesita permiso para los symlinks de verdad; la junction a una
   * carpeta sí se puede, y sirve igual para lo que se prueba: una ruta que
   * parece del repo y resuelve fuera.
   */
  function enlace(root: string, carpeta: string): boolean {
    const link = path.join(root, "src", "enlace");
    for (const type of [undefined, "junction"] as const) {
      try {
        fs.symlinkSync(carpeta, link, type);
        return true;
      } catch {
        // Se prueba con el siguiente tipo.
      }
    }
    return false;
  }

  it("no saca la lectura fuera del repo", async (context) => {
    const { root, fuera } = repo();
    if (!enlace(root, path.dirname(fuera))) {
      context.skip();
      return;
    }
    setCurrentRoot(root);

    // Parece una ruta del repo y resuelve fuera; el diff y el editor tienen
    // que verlo igual que el código.
    const ruta = "src/enlace/fuera.ts";
    await expect(ask("codarch:read-source", { path: ruta })).resolves.toBe(null);
    await expect(ask("codarch:read-diff", { path: ruta })).resolves.toBe(null);
    await expect(ask("codarch:open-editor", { path: ruta })).resolves.toBe(
      false
    );
    expect(openExternal).not.toHaveBeenCalled();
  });
});
