import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";

/**
 * Puente entre el renderer y el proceso principal.
 *
 * El renderer no tiene acceso a Node: solo a lo que se expone aquí. Así la
 * app de escritorio mantiene la misma frontera de seguridad que la web.
 */

/** Lo que el proceso principal le pasa al renderer. */
export type DesktopTarget =
  | { kind: "snapshot"; snapshot: unknown; label: string }
  | { kind: "report"; report: unknown; label: string };

export interface DesktopAnalysis {
  snapshot: unknown;
  files: number;
  edges: number;
  warnings: string[];
  durationMs: number;
}

/** La línea del tiempo del repositorio analizado. */
export interface DesktopHistory {
  version: 1;
  entries: Array<{
    date: string;
    checksum: string;
    commit: string;
    files: number;
    rloc: number;
    debt: number;
    commits: number;
    authors: number;
    hottest: Array<{ path: string; commits: number; authors: number }>;
  }>;
}

const api = {
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
