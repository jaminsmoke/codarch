import { BrowserWindow, shell } from "electron";
import path from "node:path";
import type { DesktopTarget } from "./preload";
import { documentTitle } from "./title";

/**
 * La ventana y lo que se le manda.
 *
 * El renderer solo dibuja: recibe el estado por IPC. Esta pieza es la única que
 * sabe de `BrowserWindow`, del canal de avisos y del título; el resto del
 * proceso principal le pide que mande.
 */

// El proceso principal se empaqueta como CommonJS: `__dirname` es lo que hay.
const RENDERER_DIST = path.join(__dirname, "..", "dist", "renderer");

let current: BrowserWindow | null = null;

export function getWindow(): BrowserWindow | null {
  return current;
}

/**
 * Crea la ventana y espera a que el renderer esté listo.
 *
 * `onLoaded` se llama cuando la página termina de cargar: el renderer se
 * entera del estado de la vigilancia por ahí; si el aviso llegara antes de que
 * escuche (o la ventana se recargara), la cabecera se quedaría en «sin
 * vigilancia» aunque el repo se esté vigilando.
 */
export function createWindow(onLoaded: () => void): void {
  const window = new BrowserWindow({
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
  current = window;

  void window.loadFile(path.join(RENDERER_DIST, "index.html"));
  // Sin bloquear `page-title-updated`: el renderer pone el mismo título que
  // `updateTitle` (ADR 0045), y hay gestores de ventanas de Linux que solo
  // hacen caso al título del documento. Los dos dicen lo mismo a propósito.
  window.once("ready-to-show", () => window.show());
  window.webContents.on("did-finish-load", onLoaded);
  window.on("closed", () => {
    if (current === window) current = null;
  });

  // Los enlaces externos se abren en el navegador del sistema, no dentro.
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });
}

/** Manda un estado al renderer por el canal de siempre. */
export function send(target: DesktopTarget): void {
  current?.webContents.send("codarch:target", target);
}

/** La cabecera dice si el repo se vigila (ADR 0050). */
export function sendWatch(live: boolean): void {
  current?.webContents.send("codarch:watch", live);
}

/** Abre la pestaña de ajustes sin mover la vista. */
export function openSettings(): void {
  current?.webContents.send("codarch:open-settings");
}

/**
 * El título dice qué se está mirando, no solo que es CodArch.
 *
 * Manda el nombre del proyecto del snapshot; la carpeta es el respaldo cuando
 * todavía no hay snapshot que leer.
 */
export function updateTitle(
  label: string | null,
  projectName?: string | null
): void {
  const title = documentTitle(label, projectName);
  current?.setTitle(title);
  // El documento lo lleva el renderer; aquí se deja igual por si el título de
  // la página llega antes que su efecto y el gestor de ventanas lo prefiere.
  void current?.webContents
    .executeJavaScript(`document.title = ${JSON.stringify(title)};`)
    .catch(() => undefined);
}

/** ¿Queda alguna ventana viva? */
export function hasWindows(): boolean {
  return BrowserWindow.getAllWindows().length > 0;
}
