import { app, Menu, dialog } from "electron";
import { existsSync } from "node:fs";
import { createLive } from "./live";
import { buildMenu, openDocs } from "./menu";
import { pickFile, pickFolder } from "./dialogs";
import { registerIpcHandlers } from "./ipc";
import { createTargets } from "./targets";
import { closeAnalyzer, analyzer, setCurrentRoot } from "./session";
import {
  createWindow,
  getWindow,
  hasWindows,
  openSettings,
  send,
  sendWatch,
  updateTitle
} from "./window";
import { configureUpdates } from "./updater";

/**
 * Proceso principal de la app de escritorio.
 *
 * Aquí solo está el ciclo de vida y el cableado: qué piezas existen y quién
 * llama a quién. Lo que el navegador no puede hacer vive en su módulo —
 * ventana (`window`), menú (`menu`), persistencia (`persistence`), repo vivo
 * (`live`), abrir una ruta (`targets`), IPC (`ipc`) y actualizaciones
 * (`updater`)— para poder probarlo sin arrancar Electron.
 */

/** El repo vivo: vigila la raíz abierta y reanaliza cuando cambia. */
const live = createLive({ analyzer, send, sendWatch });

/** Abrir una carpeta o un JSON: lo que hay detrás del menú y de «abrir con». */
const targets = createTargets({
  analyzer,
  send,
  title: updateTitle,
  fail: (title, message) => {
    console.error(`${title}: ${message}`);
    dialog.showErrorBox(title, message);
  },
  watch: live.watch,
  stopWatching: live.stop,
  refresh: live.refresh,
  setRoot: setCurrentRoot
});

/** Del menú se abre lo que se elige: antes se elegía la carpeta y se perdía. */
async function openPickedFolder(): Promise<void> {
  const folder = await pickFolder();
  if (folder) await targets.open(folder);
}

async function openPickedFile(): Promise<void> {
  const file = await pickFile();
  if (file) await targets.open(file);
}

const actions = {
  analizarCarpeta: () => void openPickedFolder(),
  abrirFichero: () => void openPickedFile(),
  abrirAjustes: openSettings,
  abrirDocumentacion: openDocs
};

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

app
  .whenReady()
  .then(() => {
    const menu = buildMenu(actions);
    Menu.setApplicationMenu(menu);
    console.log(
      `· menú nativo: ${menu.items.map((item) => item.label).join(" · ")}`
    );
    registerIpcHandlers({ live });
    createWindow(() => sendWatch(live.running()));
    void configureUpdates();
    const fromArgv = pathFromArgv(process.argv);
    if (fromArgv) {
      // "Abrir con" en Windows y Linux: la ruta viene en los argumentos.
      getWindow()?.webContents.once("did-finish-load", () =>
        void targets.open(fromArgv)
      );
    }
    app.on("activate", () => {
      if (!hasWindows()) createWindow(() => sendWatch(live.running()));
    });
  })
  .catch((error: Error) => {
    console.error(`no se pudo arrancar: ${error.message}`);
    app.quit();
  });

// "Abrir con": en macOS llega antes de que la app esté lista.
app.on("open-file", (event, filePath) => {
  event.preventDefault();
  if (getWindow()) void targets.open(filePath);
});
(app as unknown as NodeJS.EventEmitter).on(
  "open-directory",
  (event: { preventDefault(): void }, dirPath: string) => {
    event.preventDefault();
    if (getWindow()) void targets.open(dirPath);
  }
);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  live.stop();
  closeAnalyzer();
});
