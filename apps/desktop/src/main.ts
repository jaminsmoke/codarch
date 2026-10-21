import {
  app,
  BrowserWindow,
  Menu,
  dialog,
  ipcMain,
  shell,
  type MenuItemConstructorOptions
} from "electron";
import path from "node:path";
import { existsSync, readFileSync, statSync } from "node:fs";
import { analyzeRepository } from "@codarch/parsers";

/**
 * Proceso principal de la app de escritorio.
 *
 * Aquí vive lo que el navegador no puede hacer: leer el disco de verdad,
 * consultar git, abrir diálogos del sistema y llevar el menú nativo. El
 * renderer solo dibuja: recibe el resultado por IPC.
 */

// El proceso principal se empaqueta como CommonJS: `__dirname` es lo que hay.
const RENDERER_DIST = path.join(__dirname, "..", "dist", "renderer");

/** Lo que el proceso principal le pasa al renderer. */
export type DesktopTarget =
  | { kind: "snapshot"; snapshot: unknown; label: string }
  | { kind: "report"; report: unknown; label: string };

let window: BrowserWindow | null = null;
/** Ruta abierta al arrancar, por si el usuario launched con un fichero. */
let pendingTarget: string | null = null;

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
  window.once("ready-to-show", () => {
    window?.show();
    if (pendingTarget) {
      const target = pendingTarget;
      pendingTarget = null;
      void openTarget(target);
    }
  });

  // Los enlaces externos se abren en el navegador del sistema, no dentro.
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });
}

function send(target: DesktopTarget): void {
  window?.webContents.send("codarch:target", target);
}

/**
 * Abre una ruta: si es una carpeta se analiza, si es un JSON se decide si es un
 * snapshot o un reporte.
 */
async function openTarget(target: string): Promise<void> {
  if (!existsSync(target)) {
    console.log(`· no existe: ${target}`);
    send({
      kind: "report",
      report: null,
      label: target
    });
    return;
  }

  if (statSync(target).isDirectory()) {
    const started = Date.now();
    const result = analyzeRepository(target, { git: true });
    console.log(
      `· analizado ${target}: ${result.files} ficheros en ${Date.now() - started} ms`
    );
    send({ kind: "snapshot", snapshot: result.snapshot, label: target });
    return;
  }

  const raw = JSON.parse(readFileSync(target, "utf8")) as unknown;
  if (isSnapshot(raw)) {
    console.log(`· abierto snapshot ${target}`);
    send({ kind: "snapshot", snapshot: raw, label: target });
    return;
  }
  console.log(`· abierto reporte ${target}`);
  send({ kind: "report", report: raw, label: target });
}

/** Un `cc.json` tiene `meta` y `files`; un reporte, `base` y `summary`. */
function isSnapshot(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.meta === "object" &&
    record.meta !== null &&
    Array.isArray(record.files)
  );
}

/**
 * La ruta con la que se lanzó la app, si la hay.
 *
 * En Windows y Linux llega en los argumentos; en macOS, en el evento
 * `open-file`. En desarrollo el primer argumento es la carpeta de la app, así
 * que se salta.
 */
function pathFromArgv(argv: readonly string[]): string | null {
  const start = app.isPackaged ? 1 : 2;
  for (const argument of argv.slice(start)) {
    if (!argument || argument.startsWith("-")) continue;
    if (argument === "." || argument === process.execPath) continue;
    if (!existsSync(argument)) continue;
    return argument;
  }
  return null;
}

function buildMenu(): Menu {
  const isMac = process.platform === "darwin";
  const template: MenuItemConstructorOptions[] = [];

  if (isMac) {
    template.push({
      label: app.name,
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" }
      ]
    });
  }

  template.push({
    label: "Archivo",
    submenu: [
      {
        label: "Analizar carpeta…",
        accelerator: "CmdOrCtrl+O",
        click: () => void pickFolder()
      },
      {
        label: "Abrir cc.json…",
        accelerator: "CmdOrCtrl+Shift+O",
        click: () => void pickFile()
      },
      { type: "separator" },
      isMac ? { role: "close" } : { role: "quit" }
    ]
  });

  template.push({
    label: "Edición",
    submenu: [
      { role: "undo" },
      { role: "redo" },
      { type: "separator" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      { role: "selectAll" }
    ]
  });

  template.push({
    label: "Ver",
    submenu: [
      { role: "reload" },
      { role: "forceReload" },
      { role: "toggleDevTools" },
      { type: "separator" },
      { role: "resetZoom" },
      { role: "zoomIn" },
      { role: "zoomOut" },
      { type: "separator" },
      { role: "togglefullscreen" }
    ]
  });

  template.push({
    label: "Ayuda",
    submenu: [
      {
        label: "Documentación",
        click: () => void shell.openExternal("https://github.com/jaminsmoke/codarch")
      }
    ]
  });

  return Menu.buildFromTemplate(template);
}

async function pickFolder(): Promise<void> {
  if (!window) return;
  const result = await dialog.showOpenDialog(window, {
    title: "Elige la carpeta del repositorio",
    properties: ["openDirectory"]
  });
  if (result.canceled || result.filePaths.length === 0) return;
  await openTarget(result.filePaths[0] as string);
}

async function pickFile(): Promise<void> {
  if (!window) return;
  const result = await dialog.showOpenDialog(window, {
    title: "Elige un cc.json o un report.json",
    properties: ["openFile"],
    filters: [{ name: "CodArch", extensions: ["json"] }]
  });
  if (result.canceled || result.filePaths.length === 0) return;
  await openTarget(result.filePaths[0] as string);
}

// "Abrir con": en macOS llega antes de que la app esté lista.
app.on("open-file", (event, filePath) => {
  event.preventDefault();
  pendingTarget = filePath;
  if (window) void openTarget(filePath);
});
// `open-directory` solo existe en macOS y no está en los tipos de Electron.
(app as unknown as NodeJS.EventEmitter).on(
  "open-directory",
  (event: { preventDefault(): void }, dirPath: string) => {
    event.preventDefault();
    pendingTarget = dirPath;
    if (window) void openTarget(dirPath);
  }
);

app.whenReady().then(() => {
  const menu = buildMenu();
  Menu.setApplicationMenu(menu);
  console.log(`· menú nativo: ${menu.items.map((item) => item.label).join(" · ")}`);
  const fromArgv = pathFromArgv(process.argv);
  if (fromArgv) pendingTarget = fromArgv;
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
