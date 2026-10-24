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
import { existsSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { autoUpdater } from "electron-updater";
import { analyzeRepository } from "@codarch/parsers";
import { repoAddons } from "@codarch/addons/node";
import type { RepoAddons } from "@codarch/addons";
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

  // Sin `resources/app-update.yml` electron-updater no sabe a qué release
  // mirar y la comprobación falla sin que nadie lo vea. Mejor decirlo: un
  // instalador empaquetado sin esos metadatos no se actualiza nunca.
  const configuracion = path.join(process.resourcesPath, "app-update.yml");
  if (!existsSync(configuracion)) {
    console.warn(
      `no hay ${configuracion}: esta instalación no puede actualizarse sola`
    );
    return;
  }

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
    const persisted = readPersistedSnapshot(target);
    if (persisted && isSnapshot(persisted)) {
      lastRoot = target;
      send({ kind: "snapshot", snapshot: persisted, label: target });
      return;
    }
    const result = analyzeRepository(target, { git: true });
    lastRoot = target;
    writeSnapshot(target, result.snapshot);
    ensureGitignore(target);
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

/** Carpeta local del repo donde el escritorio deja sus artefactos. */
const CODARCH_DIR = ".codarch";

/** Ruta del snapshot persistido de un repo, si existe. */
function snapshotPath(root: string): string {
  return path.join(root, CODARCH_DIR, "snapshot.cc.json");
}

/**
 * Escribe un JSON en `.codarch/` del repo, como `codarch analyze`.
 *
 * Si el fichero ya tiene ese contenido no se reescribe: el snapshot que acaba
 * de escribir el análisis no se serializa dos veces por el mismo camino.
 */
function writeCodarchJson(root: string, name: string, value: unknown): boolean {
  const directory = path.join(root, CODARCH_DIR);
  const file = path.join(directory, name);
  const content = `${JSON.stringify(value, null, 2)}\n`;
  try {
    if (existsSync(file) && readFileSync(file, "utf8") === content) return true;
    if (!existsSync(directory)) mkdirSync(directory, { recursive: true });
    writeFileSync(file, content, "utf8");
    return true;
  } catch (cause) {
    console.error(`no se pudo escribir ${file}: ${(cause as Error).message}`);
    return false;
  }
}

/** Escribe el snapshot en `.codarch/` del repo. */
function writeSnapshot(root: string, snapshot: unknown): boolean {
  return writeCodarchJson(root, "snapshot.cc.json", snapshot);
}

/** Asegura que `.codarch/` esté ignorado en el repo. */
function ensureGitignore(root: string): void {
  const file = path.join(root, ".gitignore");
  const entry = ".codarch/";
  try {
    let content = "";
    if (existsSync(file)) {
      content = readFileSync(file, "utf8");
    }
    const lines = content.split(/\r?\n/);
    const hasEntry = lines.some(
      (line) => line.trim() === entry || line.trim() === ".codarch"
    );
    if (hasEntry) return;
    const suffix = content.length === 0 || content.endsWith("\n") ? "" : "\n";
    writeFileSync(file, `${content}${suffix}${entry}\n`, "utf8");
  } catch (cause) {
    console.error(
      `no se pudo actualizar ${file}: ${(cause as Error).message}`
    );
  }
}

/** Lee el snapshot persistido de un repo, si existe y se entiende. */
function readPersistedSnapshot(root: string): unknown | null {
  const raw = readJsonFile(snapshotPath(root));
  return raw && isSnapshot(raw) ? raw : null;
}

function readJsonFile(file: string): unknown | null {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as unknown;
  } catch {
    return null;
  }
}

/** ¿El proyecto cabe en `.codarch/` de ese repo? */
function isDirectory(root: string): boolean {
  try {
    return existsSync(root) && statSync(root).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Persiste en `.codarch/` lo que llega del renderer (ADR 0048).
 *
 * El snapshot manda; el reporte se guarda si lo hay. Un fichero suelto no es un
 * repo: en ese caso no se escribe nada.
 */
function persistProject(
  root: string,
  snapshot: unknown,
  report: unknown | null
): boolean {
  if (!isDirectory(root)) return false;
  ensureGitignore(root);
  if (!writeSnapshot(root, snapshot)) return false;
  if (report !== null && report !== undefined) {
    writeCodarchJson(root, "report.json", report);
  }
  return true;
}

/**
 * Todo lo que `.codarch/` guarda de un repo, para restaurar la sesión.
 *
 * Los addons se leen del repo (`.codarch.yml`), no del snapshot: el checksum no
 * depende de lo que tengas instalado (ADR 0029).
 */
function restoreProject(root: string): {
  snapshot: unknown;
  report: unknown | null;
  addons: RepoAddons;
} | null {
  if (!isDirectory(root)) return null;
  const snapshot = readPersistedSnapshot(root);
  if (!snapshot) return null;
  return {
    snapshot,
    report: readJsonFile(path.join(root, CODARCH_DIR, "report.json")),
    addons: repoAddons(root)
  };
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

/** Restaura snapshot, reporte y addons de `.codarch/` (ADR 0048). */
ipcMain.handle("codarch:restore-project", async (_event, root: string) => {
  if (typeof root !== "string" || !root) return null;
  const restored = restoreProject(root);
  if (restored) lastRoot = root;
  return restored;
});

/** Persiste el proyecto en `.codarch/` del repo. */
ipcMain.handle(
  "codarch:persist-project",
  async (
    _event,
    root: string,
    snapshot: unknown,
    report: unknown | null
  ) => {
    if (typeof root !== "string" || !root) return false;
    return persistProject(root, snapshot, report);
  }
);

ipcMain.handle("codarch:analyze", async (_event, root: string) => {
  const started = Date.now();
  const result = analyzeRepository(root, { git: true });
  lastRoot = root;
  writeSnapshot(root, result.snapshot);
  ensureGitignore(root);
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
