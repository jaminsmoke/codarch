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
import {
  ensureGitignoreEntry,
  protectedRootReason,
  readSourceSnippet,
  watchRepository
} from "@codarch/parsers";
import type { RepositoryWatcher } from "@codarch/parsers";
import { repoAddons } from "@codarch/addons/node";
import type { RepoAddons } from "@codarch/addons";
import { checkSource } from "@codarch/versions";
import {
  chainsPayload,
  historyLocation,
  readHistoryIndex
} from "@codarch/schema";
import type { DesktopTarget } from "./preload";
import { createAnalyzer, type RepoAnalyzer } from "./analyzer";
import { readRepoPreferences, writeRepoPreferences } from "./preferences";
import { sameSnapshot, snapshotChecksum } from "./snapshot-state";
import { parsePreferences } from "@codarch/ui/storage";
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

/**
 * El proceso que analiza, arrancado la primera vez que hace falta.
 *
 * Analizar bloquearía el proceso principal —menú, IPC y hasta el despacho de
 * los clics— durante segundos, así que vive en un `utilityProcess`
 * (`analyze-worker.ts`).
 */
let analyzer: RepoAnalyzer | null = null;

function repoAnalyzer(): RepoAnalyzer {
  analyzer ??= createAnalyzer(path.join(__dirname, "analyze-worker.cjs"));
  return analyzer;
}

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
  // El renderer se entera del estado de la vigilancia por este aviso; si llega
  // antes de que escuche (o la ventana se recarga), la cabecera se quedaría en
  // «sin vigilancia» aunque el repo se esté vigilando.
  window.webContents.on("did-finish-load", () =>
    sendWatch(repositoryWatcher !== null)
  );

  // Los enlaces externos se abren en el navegador del sistema, no dentro.
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });
}

function send(target: DesktopTarget): void {
  window?.webContents.send("codarch:target", target);
}

/** El proceso principal vigila el repo abierto, si puede. */
let repositoryWatcher: RepositoryWatcher | null = null;
let watchingRoot: string | null = null;

/** La cabecera dice si el repo se vigila (ADR 0050). */
function sendWatch(live: boolean): void {
  window?.webContents.send("codarch:watch", live);
}

/**
 * Vigila la raíz abierta y avisa al análisis de lo que cambió.
 *
 * El mapa cambia con el repo sin volver a analizarlo a mano. Si el pulso dice
 * que no hay nada nuevo, no se analiza ni se escribe (ADR 0056); si lo hay, se
 * reescribe `.codarch/` cuando el checksum cambió y el renderer recibe el
 * snapshot por el mismo canal que «abrir con» (ADR 0050).
 */
function watchRoot(root: string): void {
  const denied = protectedRootReason(root);
  if (denied) {
    console.error(`no se vigila ${denied}`);
    sendWatch(false);
    return;
  }
  if (watchingRoot === root && repositoryWatcher) {
    sendWatch(true);
    return;
  }
  void repositoryWatcher?.close();
  repositoryWatcher = null;
  watchingRoot = root;
  try {
    repositoryWatcher = watchRepository(root, {
      onChange: (paths) => void refreshFromDisk(root, paths)
    });
    sendWatch(true);
  } catch (cause) {
    console.error(`no se pudo vigilar ${root}: ${(cause as Error).message}`);
    sendWatch(false);
  }
}

function stopWatching(): void {
  void repositoryWatcher?.close();
  repositoryWatcher = null;
  watchingRoot = null;
}

/**
 * Reanaliza solo si el pulso trae algo nuevo, y avisa si el mapa cambió.
 *
 * El que decide es el proceso que analiza (sesión y pulso, ADR 0056): aquí
 * llega `unchanged` y no se toca el disco. Cuando hay snapshot nuevo, se
 * escribe en `.codarch/` solo si su checksum no es el que ya está guardado.
 */
async function refreshFromDisk(
  root: string,
  hints: readonly string[] = []
): Promise<void> {
  if (!isDirectory(root)) return;
  try {
    const outcome = await repoAnalyzer().refresh(root, hints);
    if (outcome.kind === "unchanged") return;
    const checksum = snapshotChecksum(outcome.snapshot);
    if (checksum !== null && persistedChecksum(root) === checksum) return;
    writeSnapshot(root, outcome.snapshot);
    // `refresh`: es el mismo repo, así que el renderer mantiene la vista.
    send({ kind: "snapshot", snapshot: outcome.snapshot, label: root, refresh: true });
  } catch (cause) {
    console.error(`no se pudo reanalizar ${root}: ${(cause as Error).message}`);
  }
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
    const denied = protectedRootReason(target);
    if (denied) {
      console.error(`no se analiza ${denied}`);
      send({ kind: "report", report: null, label: target });
      return;
    }
    const persisted = readPersistedSnapshot(target);
    // Si lo guardado ya es el estado del repo, aún no hay nada que reanalizar.
    if (persisted && isSnapshot(persisted)) {
      lastRoot = target;
      send({ kind: "snapshot", snapshot: persisted, label: target });
      // Lo guardado se pinta al instante, pero el repo sigue vivo: se vigila y
      // se reanaliza detrás, como al restaurar el último proyecto. Sin esto,
      // abrir un repo ya analizado dejaba el mapa congelado y sin `live`.
      watchRoot(target);
      setTimeout(() => void refreshFromDisk(target), 400);
      return;
    }
    let outcome;
    try {
      outcome = await repoAnalyzer().analyze(target);
    } catch (cause) {
      // El proceso que analiza puede caerse: se dice y no se deja la app muda.
      console.error(`no se pudo analizar ${target}: ${(cause as Error).message}`);
      send({ kind: "report", report: null, label: target });
      return;
    }
    if (outcome.kind === "unchanged") return;
    lastRoot = target;
    ensureStateIgnored(target);
    writeSnapshot(target, outcome.snapshot);
    watchRoot(target);
    send({ kind: "snapshot", snapshot: outcome.snapshot, label: target });
    return;
  }

  // Un fichero suelto no es un repo: se deja de vigilar el anterior para no
  // mezclar su historial ni su libro de cadenas con este snapshot (ADR 0050).
  stopWatching();
  lastRoot = null;
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
  const written = writeCodarchJson(root, "snapshot.cc.json", snapshot);
  const checksum = snapshotChecksum(snapshot);
  if (written && checksum !== null) {
    storedChecksums.set(root, checksum);
  }
  return written;
}

/**
 * El checksum que ya está en `.codarch/snapshot.cc.json`, en memoria.
 *
 * Leer el fichero en cada pulso serían 400 KB por aviso; se lee una vez y se
 * actualiza al escribir. Si algo lo cambia por fuera, el siguiente pulso real
 * lo reescribe.
 */
const storedChecksums = new Map<string, string>();

function persistedChecksum(root: string): string {
  const known = storedChecksums.get(root);
  if (known !== undefined) return known;
  const stored = readPersistedSnapshot(root) as {
    meta?: { checksum?: string };
  } | null;
  const checksum = stored?.meta?.checksum ?? "";
  storedChecksums.set(root, checksum);
  return checksum;
}

/**
 * Deja `.codarch/` fuera de git si el directorio nace ahora (ADR 0050).
 *
 * Si ya existía, o el usuario quitó la línea del `.gitignore`, no se toca.
 */
function ensureStateIgnored(root: string): void {
  if (!existsSync(path.join(root, CODARCH_DIR))) {
    ensureGitignoreEntry(root, `${CODARCH_DIR}/`);
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
  ensureStateIgnored(root);
  // Si el análisis ya dejó ese mismo snapshot en `.codarch/`, no se vuelve a
  // serializar: el renderer manda el proyecto al abrir, y el live lo escribe
  // aquí antes de avisar. El reporte, si viene, se escribe igual.
  if (
    !sameSnapshot(snapshot, persistedChecksum(root)) &&
    !writeSnapshot(root, snapshot)
  ) {
    return false;
  }
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
  preferences: ReturnType<typeof readRepoPreferences>;
} | null {
  if (!isDirectory(root)) return null;
  const snapshot = readPersistedSnapshot(root);
  if (!snapshot) return null;
  return {
    snapshot,
    report: readJsonFile(path.join(root, CODARCH_DIR, "report.json")),
    addons: repoAddons(root),
    preferences: readRepoPreferences(root)
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
}).catch((error: Error) => {
  console.error(`no se pudo arrancar: ${error.message}`);
  app.quit();
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

app.on("before-quit", () => {
  stopWatching();
  analyzer?.close();
});

/** El renderer pide una carpeta y se analiza en el proceso principal. */
ipcMain.handle("codarch:pick-folder", async () => pickFolder());

ipcMain.handle("codarch:pick-file", async () => pickFile());

/** Restaura snapshot, reporte y addons de `.codarch/` (ADR 0048). */
ipcMain.handle("codarch:restore-project", async (_event, root: string) => {
  if (typeof root !== "string" || !root) return null;
  if (protectedRootReason(root)) return null;
  const restored = restoreProject(root);
  if (restored) {
    lastRoot = root;
    watchRoot(root);
    // Lo guardado se pinta al instante; el análisis de verdad llega detrás,
    // en su proceso, para ver lo que cambió sin la app abierta antes de
    // ponerse en live.
    setTimeout(() => void refreshFromDisk(root), 400);
  }
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
    // Un fichero suelto no es un proyecto: no se escribe en ningún repo y se
    // deja de vigilar el anterior para no mezclar estados (ADR 0050).
    if (!isDirectory(root)) {
      stopWatching();
      lastRoot = null;
      return false;
    }
    return persistProject(root, snapshot, report);
  }
);

ipcMain.handle("codarch:analyze", async (_event, root: string) => {
  const denied = protectedRootReason(root);
  if (denied) {
    throw new Error(`CodArch no analiza ${denied}; abre la carpeta de un proyecto`);
  }
  const started = Date.now();
  const outcome = await repoAnalyzer().analyze(root);
  if (outcome.kind === "unchanged") {
    throw new Error("el análisis no devolvió un snapshot");
  }
  lastRoot = root;
  ensureStateIgnored(root);
  writeSnapshot(root, outcome.snapshot);
  watchRoot(root);
  return {
    snapshot: outcome.snapshot,
    files: outcome.files,
    edges: outcome.edges,
    warnings: outcome.warnings,
    durationMs: Date.now() - started,
    // Los addons que el repo declara (ADR 0029): sus vistas guardadas se
    // ofrecen en el mapa, sin leer nada más desde el renderer.
    addons: repoAddons(root),
    // Las preferencias que el repo ya tenía (ADR 0053).
    preferences: readRepoPreferences(root)
  };
});

ipcMain.handle("codarch:read-json", async (_event, file: string) => {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as unknown;
  } catch (cause) {
    throw new Error(`No se pudo leer ${file}: ${(cause as Error).message}`);
  }
});

/** Lee el código de un símbolo del repo abierto (ADR 0067). */
ipcMain.handle(
  "codarch:read-source",
  (
    _event,
    request: { path?: unknown; start?: unknown; end?: unknown } | null
  ) => {
    if (!lastRoot || !request || typeof request.path !== "string") return null;
    return readSourceSnippet(
      lastRoot,
      request.path,
      typeof request.start === "number" ? request.start : 1,
      typeof request.end === "number" ? request.end : 400
    );
  }
);

/** Abre el fichero en VS Code, en la línea pedida (ADR 0068). */
ipcMain.handle(
  "codarch:open-editor",
  async (
    _event,
    request: { path?: unknown; line?: unknown } | null
  ) => {
    if (!lastRoot || !request || typeof request.path !== "string") return false;
    const root = path.resolve(lastRoot);
    const file = path.resolve(root, request.path);
    const prefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
    if (!file.startsWith(prefix)) return false;
    const line =
      typeof request.line === "number" && request.line > 0
        ? Math.trunc(request.line)
        : 1;
    const normalized = file.replaceAll("\\", "/");
    const prefixUri = /^[A-Za-z]:\//.test(normalized)
      ? "vscode://file/"
      : "vscode://file";
    try {
      await shell.openExternal(`${prefixUri}${encodeURI(normalized)}:${line}`);
      return true;
    } catch {
      return false;
    }
  }
);

/** Guarda las preferencias de vista en el `.codarch/` del repo (ADR 0053). */
ipcMain.handle(
  "codarch:persist-preferences",
  async (_event, root: string, preferences: unknown) => {
    if (typeof root !== "string" || !root) return false;
    if (!isDirectory(root)) return false;
    const parsed = parsePreferences(preferences);
    if (!parsed) return false;
    return writeRepoPreferences(root, parsed);
  }
);

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
    url: resultado.url,
    canInstall: canAutoUpdate(process.platform, app.isPackaged)
  };
});

/**
 * Descarga la actualización y reinicia la app con ella (ADR 0045).
 *
 * Es el botón de **Actualizaciones**: no hay que volver a bajar el instalador.
 * `electron-updater` cierra la ventana, aplica el paquete descargado y vuelve
 * a abrir la app nueva.
 */
ipcMain.handle("codarch:install-update", async () => {
  if (!canAutoUpdate(process.platform, app.isPackaged)) {
    return { ok: false, error: "esta instalación no puede actualizarse sola" };
  }
  try {
    const resultado = await autoUpdater.checkForUpdates();
    if (!resultado?.isUpdateAvailable) {
      return { ok: false, error: "no hay ninguna versión nueva" };
    }
    await autoUpdater.downloadUpdate();
    // Un respiro para que el renderer pinte «Reiniciando…» antes del cierre.
    setTimeout(() => autoUpdater.quitAndInstall(true, true), 400);
    return { ok: true, error: null };
  } catch (cause) {
    return { ok: false, error: (cause as Error).message };
  }
});

/** Abre una página (la release, el npm) en el navegador del sistema. */
ipcMain.handle("codarch:open-external", async (_event, url: string) => {
  if (!url.startsWith("https://")) {
    throw new Error(`no es una URL de https: ${url}`);
  }
  await shell.openExternal(url);
});
