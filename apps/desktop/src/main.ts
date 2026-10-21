import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import path from "node:path";
import { analyzeRepository } from "@codarch/parsers";
import { readFileSync } from "node:fs";

/**
 * Proceso principal de la app de escritorio.
 *
 * Aquí vive lo que el navegador no puede hacer: leer el disco de verdad,
 * consultar git y abrir diálogos del sistema. El renderer solo dibuja.
 */

// El proceso principal se empaqueta como CommonJS: `__dirname` es lo que hay.
const RENDERER_DIST = path.join(__dirname, "..", "dist", "renderer");

let window: BrowserWindow | null = null;

function createWindow(): void {
  window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: "#121a20",
    title: "CodArch",
    show: false
  });

  void window.loadFile(path.join(RENDERER_DIST, "index.html"));
  window.once("ready-to-show", () => window?.show());

  // Los enlaces externos se abren en el navegador del sistema, no dentro.
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

/** El renderer pide una carpeta y se analiza en el proceso principal. */
ipcMain.handle("codarch:pick-folder", async () => {
  if (!window) return null;
  const result = await dialog.showOpenDialog(window, {
    title: "Elige la carpeta del repositorio",
    properties: ["openDirectory"]
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0] ?? null;
});

ipcMain.handle("codarch:pick-file", async () => {
  if (!window) return null;
  const result = await dialog.showOpenDialog(window, {
    title: "Elige un cc.json o un report.json",
    properties: ["openFile"],
    filters: [{ name: "CodArch", extensions: ["json"] }]
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0] ?? null;
});

ipcMain.handle("codarch:analyze", async (_event, root: string) => {
  const started = Date.now();
  const result = analyzeRepository(root, { git: true });
  return {
    snapshot: result.snapshot,
    files: result.files,
    edges: result.edges,
    warnings: result.warnings,
    durationMs: Date.now() - started
  };
});

ipcMain.handle("codarch:read-json", async (_event, file: string) => {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as unknown;
  } catch (cause) {
    throw new Error(`No se pudo leer ${file}: ${(cause as Error).message}`);
  }
});
