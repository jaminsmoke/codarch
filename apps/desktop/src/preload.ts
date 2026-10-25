import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import type { RepoAddons } from "@codarch/addons";
import type { HistoryIndex } from "@codarch/schema";
import type { ViewPreferences } from "@codarch/ui/storage";

/**
 * Puente entre el renderer y el proceso principal.
 *
 * El renderer no tiene acceso a Node: solo a lo que se expone aquí. Así la
 * app de escritorio mantiene la misma frontera de seguridad que la web.
 */

/** Lo que el proceso principal le pasa al renderer. */
export type DesktopTarget =
  | {
      kind: "snapshot";
      snapshot: unknown;
      label: string;
      /**
       * Es el mismo repo que ya estaba abierto y solo cambió en disco (live).
       * La vista —área, color, foco, búsqueda y selección— se conserva.
       */
      refresh?: boolean;
    }
  | { kind: "report"; report: unknown; label: string };

export interface DesktopAnalysis {
  snapshot: unknown;
  files: number;
  edges: number;
  warnings: string[];
  durationMs: number;
  /** Los addons que el repo declara, con sus vistas guardadas (ADR 0029). */
  addons: RepoAddons;
  /** Las preferencias que el repo ya tenía (ADR 0053). */
  preferences: ViewPreferences | null;
}

/** La línea del tiempo del repositorio analizado. */
export type DesktopHistory = HistoryIndex;

/** Lo que `.codarch/` guarda de un repo, listo para restaurar la sesión. */
export interface DesktopRestore {
  snapshot: unknown;
  report: unknown | null;
  /** Los addons que el repo declara, con sus vistas guardadas (ADR 0029). */
  addons: RepoAddons;
  /** Las preferencias de vista del repo, si las tiene (ADR 0053). */
  preferences: ViewPreferences | null;
}

import { VERSION } from "./version";

/** Lo que se sabe de las actualizaciones de la app (ADR 0032). */
export interface DesktopUpdate {
  current: string;
  latest: string | null;
  outdated: boolean;
  error: string | null;
  url: string | null;
  /** Si esta instalación puede descargar e instalar la actualización sola. */
  canInstall: boolean;
}

/** El resultado de pedirle a la app que se actualice aquí mismo. */
export interface DesktopInstallResult {
  ok: boolean;
  error: string | null;
}

/** El trozo de código que se pide para un símbolo (ADR 0067). */
export interface SourceRequest {
  path: string;
  start: number;
  end: number;
}

export interface SourceSnippet {
  path: string;
  start: number;
  end: number;
  total: number;
  lines: string[];
}

export interface EditorRequest {
  path: string;
  line: number;
}

const api = {
  /** La versión de la app. */
  version: VERSION,
  /** Elige una carpeta y devuelve su ruta, o `null` si se cancela. */
  pickFolder: (): Promise<string | null> => ipcRenderer.invoke("codarch:pick-folder"),
  /** Elige un fichero JSON. */
  pickFile: (): Promise<string | null> => ipcRenderer.invoke("codarch:pick-file"),
  /** Analiza una carpeta en el proceso principal. */
  analyze: (root: string): Promise<DesktopAnalysis> =>
    ipcRenderer.invoke("codarch:analyze", root),
  /** Lee un JSON del disco. */
  readJson: (file: string): Promise<unknown> =>
    ipcRenderer.invoke("codarch:read-json", file),
  /** Lee las líneas de un símbolo del repo abierto (ADR 0067). */
  source: (request: SourceRequest): Promise<SourceSnippet | null> =>
    ipcRenderer.invoke("codarch:read-source", request),
  /** Abre un fichero en el editor del sistema (ADR 0068). */
  openEditor: (request: EditorRequest): Promise<boolean> =>
    ipcRenderer.invoke("codarch:open-editor", request),
  /** Restaura snapshot, reporte y addons de `.codarch/` del repo. */
  restoreProject: (root: string): Promise<DesktopRestore | null> =>
    ipcRenderer.invoke("codarch:restore-project", root),
  /** Persiste el proyecto en `.codarch/` del repo. */
  persistProject: (
    root: string,
    snapshot: unknown,
    report: unknown | null
  ): Promise<boolean> =>
    ipcRenderer.invoke("codarch:persist-project", root, snapshot, report),
  /** Guarda las preferencias de vista en el `.codarch/` del repo (ADR 0053). */
  persistPreferences: (
    root: string,
    preferences: ViewPreferences
  ): Promise<boolean> =>
    ipcRenderer.invoke("codarch:persist-preferences", root, preferences),
  /** La línea del tiempo del repositorio analizado. */
  history: (): Promise<DesktopHistory | null> => ipcRenderer.invoke("codarch:history"),
  /**
   * Las cadenas de los símbolos.
   *
   * Con "symbol" devuelve la de ese símbolo; sin él, el calor del repo ✓.
   */
  chains: (symbol?: string | null): Promise<unknown | null> =>
    ipcRenderer.invoke("codarch:chains", symbol ?? null),
  /** Una foto concreta del historial. */
  historySnapshot: (name: string): Promise<unknown | null> =>
    ipcRenderer.invoke("codarch:history-snapshot", name),
  /**
   * Si hay una versión más nueva de la app (ADR 0032).
   *
   * Lo pregunta el proceso principal a las releases de GitHub ✓.
   */
  checkUpdate: (): Promise<DesktopUpdate> =>
    ipcRenderer.invoke("codarch:check-update"),
  /** Descarga la actualización y reinicia la app con ella. */
  installUpdate: (): Promise<DesktopInstallResult> =>
    ipcRenderer.invoke("codarch:install-update"),
  /** Abre una página en el navegador del sistema ✓. */
  openExternal: (url: string): Promise<void> =>
    ipcRenderer.invoke("codarch:open-external", url),
  /**
   * Escucha la orden de abrir los ajustes ✓.
   *
   * Devuelve la función para dejar de escuchar ✓.
   */
  onOpenSettings: (callback: () => void): (() => void) => {
    const listener = (): void => callback();
    ipcRenderer.on("codarch:open-settings", listener);
    return () => ipcRenderer.removeListener("codarch:open-settings", listener);
  },
  /**
   * Escucha si el proceso principal está vigilando el repo (ADR 0050).
   *
   * Devuelve la función para dejar de escuchar.
   */
  onWatch: (callback: (live: boolean) => void): (() => void) => {
    const listener = (_event: unknown, live: boolean): void => callback(live);
    ipcRenderer.on("codarch:watch", listener);
    return () => ipcRenderer.removeListener("codarch:watch", listener);
  },
  /**
   * Escucha lo que llega desde el menú o desde "abrir con".
   *
   * Devuelve la función para dejar de escuchar.
   */
  onTarget: (callback: (target: DesktopTarget) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, target: DesktopTarget): void =>
      callback(target);
    ipcRenderer.on("codarch:target", listener);
    return () => ipcRenderer.removeListener("codarch:target", listener);
  }
};

contextBridge.exposeInMainWorld("codarch", api);

export type CodarchDesktop = typeof api;
