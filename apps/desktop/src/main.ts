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
import { autoUpdater } from "electron-updater";
import { analyzeRepository } from "@codarch/parsers";
import { repoAddons } from "@codarch/addons/node";
import { checkSource } from "@codarch/versions";
import {
  chainsPayload,
  historyLocation,
  readHistoryIndex
} from "@codarch/schema";
import type { DesktopTarget } from "./preload";
import { VERSION } from "./version";
import { canAutoUpdate } from "./updates";

/**
 * Proceso principal de la app de escritorio.
 *
 * Aquí vive lo que el navegador no puede hacer: leer el disco de verdad,
 * consultar git, abrir diálogos del sistema y llevar el menú nativo. El
 * renderer solo dibuja: recibe el resultado por IPC.
 */

/**
 * Dónde se miran las actualizaciones.
 *
 * Las releases del escritorio se publican en este mismo repositorio ✓; para
 * que quien lo instale pueda comprobarlas ✓, el repositorio tiene que ser
 * **público** ✓. Se puede apuntar a otro con la variable de entorno ✓.
 */
const UPDATE_REPO = process.env.CODARCH_UPDATE_REPO ?? "jaminsmoke/codarch";

// El proceso principal se empaqueta como CommonJS: `__dirname` es lo que hay.
const RENDERER_DIST = path.join(__dirname, "..", "dist", "renderer");

/** La última raíz analizada: de dónde se saca el historial. */
let lastRoot: string | null = null;

let window: BrowserWindow | null = null;

function createWindow(): void {
  window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: "#eef1f2",
    title: "CodArch",
    show: false,
    webPreferences: {
      // El puente con el proceso principal ✓: sin esto, el renderer no tiene
      // con quién hablar y la app se queda en blanco ✓.
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  void window.loadFile(path.join(RENDERER_DIST, "index.html"));
  window.once("ready-to-show", () => window?.show());

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
 * Las actualizaciones en segundo plano ✓ (ADR 0045).
 *
 * Windows y Linux instalan el paquete nuevo al cerrar ✓. macOS espera a tener
 * firma y notarización ✓; mientras tanto, la release sigue en los ajustes ✓.
 */
function configureUpdates(): void {
  if (!canAutoUpdate(process.platform, app.isPackaged)) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  // El producto está en alpha y publica prereleases ✓.
  autoUpdater.allowPrerelease = true;
  autoUpdater.on("error", (error) => {
    console.error(`actualización: ${error.message}`);
  });
  autoUpdater.on("update-downloaded", (info) => {
    console.log(
      `actualización ${info.version} descargada; se instalará al cerrar`
    );
  });
  void autoUpdater.checkForUpdatesAndNotify().catch((error: Error) => {
    console.error(`no se pudo comprobar la actualización: ${error.message}`);
  });
}

/**
 * Abre una ruta: si es una carpeta se analiza, si es un JSON se decide si es un
 * snapshot o un reporte.
 */
async function openTarget(target: string): Promise<void> {
  if (!existsSync(target)) {
    send({
      kind: "report",
      report: null,
      label: target
    });
    return;
  }

  if (statSync(target).isDirectory()) {
    const result = analyzeRepository(target, { git: true });
    lastRoot = target;
    send({ kind: "snapshot", snapshot: result.snapshot, label: target });
    return;
  }

  const raw = JSON.parse(readFileSync(target, "utf8")) as unknown;
  if (isSnapshot(raw)) {
    send({ kind: "snapshot", snapshot: raw, label: target });
    return;
  }
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
        label: "Ajustes…",
        accelerator: "CmdOrCtrl+,",
        click: () => window?.webContents.send("codarch:open-settings")
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

/** Elige una carpeta con el diálogo del sistema. */
async function pickFolder(): Promise<string | null> {
  if (!window) return null;
  const result = await dialog.showOpenDialog(window, {
    title: "Elige la carpeta del repositorio",
    properties: ["openDirectory"]
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0] ?? null;
}

/** Elige un fichero JSON con el diálogo del sistema. */
async function pickFile(): Promise<string | null> {
  if (!window) return null;
  const result = await dialog.showOpenDialog(window, {
    title: "Elige un cc.json o un report.json",
    properties: ["openFile"],
    filters: [{ name: "CodArch", extensions: ["json"] }]
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0] ?? null;
}

/** La ruta con la que se lanzó la app, si la hay. */
function pathFromArgv(argv: readonly string[]): string | null {
  // En desarrollo el primer argumento es la carpeta de la app.
  const start = app.isPackaged ? 1 : 2;
  for (const argument of argv.slice(start)) {
    if (!argument || argument.startsWith("-")) continue;
    if (argument === "." || argument === process.execPath) continue;
    if (!existsSync(argument)) continue;
    return argument;
  }
  return null;
}

app.whenReady().then(() => {
  const menu = buildMenu();
  Menu.setApplicationMenu(menu);
  console.log(`· menú nativo: ${menu.items.map((item) => item.label).join(" · ")}`);
  const fromArgv = pathFromArgv(process.argv);
  createWindow();
  configureUpdates();
  if (fromArgv) {
    // "Abrir con" en Windows y Linux: la ruta viene en los argumentos.
    window?.webContents.once("did-finish-load", () => void openTarget(fromArgv));
  }
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// "Abrir con": en macOS llega antes de que la app esté lista.
app.on("open-file", (event, filePath) => {
  event.preventDefault();
  if (window) void openTarget(filePath);
});
(app as unknown as NodeJS.EventEmitter).on(
  "open-directory",
  (event: { preventDefault(): void }, dirPath: string) => {
    event.preventDefault();
    if (window) void openTarget(dirPath);
  }
);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

/** El renderer pide una carpeta y se analiza en el proceso principal. */
ipcMain.handle("codarch:pick-folder", async () => pickFolder());

ipcMain.handle("codarch:pick-file", async () => pickFile());

ipcMain.handle("codarch:analyze", async (_event, root: string) => {
  const started = Date.now();
  const result = analyzeRepository(root, { git: true });
  lastRoot = root;
  return {
    snapshot: result.snapshot,
    files: result.files,
    edges: result.edges,
    warnings: result.warnings,
    durationMs: Date.now() - started,
    // Los addons que el repo declara (ADR 0029): sus vistas guardadas se
    // ofrecen en el mapa, sin leer nada más desde el renderer.
    addons: repoAddons(root)
  };
});

ipcMain.handle("codarch:read-json", async (_event, file: string) => {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as unknown;
  } catch (cause) {
    throw new Error(`No se pudo leer ${file}: ${(cause as Error).message}`);
  }
});

/** La línea del tiempo del repositorio analizado. */
ipcMain.handle("codarch:history", async () => {
  if (!lastRoot) return null;
  return readHistoryIndex(lastRoot);
});

/**
 * Las cadenas de los símbolos.
 *
 * Con "symbol" devuelve la de ese símbolo; sin él, el calor del repo ✓.
 */
ipcMain.handle("codarch:chains", async (_event, symbol: string | null) => {
  if (!lastRoot) return null;
  return chainsPayload(lastRoot, symbol);
});

/** Una foto concreta del historial. */
ipcMain.handle("codarch:history-snapshot", async (_event, name: string) => {
  if (!lastRoot) return null;
  const directory = historyLocation(lastRoot).directory;
  const file = path.join(directory, path.basename(name));
  if (!file.startsWith(directory)) {
    throw new Error("ruta fuera del historial");
  }
  try {
    return JSON.parse(readFileSync(file, "utf8")) as unknown;
  } catch (cause) {
    throw new Error(`No se pudo leer ${file}: ${(cause as Error).message}`);
  }
});

/**
 * Si hay una versión más nueva de la app (ADR 0032).
 *
 * El escritorio se actualiza con las releases de GitHub. La red la consulta
 * el proceso principal: el renderer no habla con la red.
 */
ipcMain.handle("codarch:check-update", async () => {
  const resultado = await checkSource(
    VERSION,
    { kind: "github", repo: UPDATE_REPO, includePrereleases: true },
    fetch
  );
  return {
    current: VERSION,
    latest: resultado.latest,
    outdated: resultado.outdated,
    error: resultado.error,
    url: resultado.url
  };
});

/** Abre una página (la release, el npm) en el navegador del sistema. */
ipcMain.handle("codarch:open-external", async (_event, url: string) => {
  if (!url.startsWith("https://")) {
    throw new Error(`no es una URL de https: ${url}`);
  }
  await shell.openExternal(url);
});
