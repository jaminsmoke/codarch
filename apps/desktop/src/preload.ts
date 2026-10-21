import { contextBridge, ipcRenderer } from "electron";

/**
 * Puente entre el renderer y el proceso principal.
 *
 * El renderer no tiene acceso a Node: solo a lo que se expone aquí. Así la
 * app de escritorio mantiene la misma frontera de seguridad que la web.
 */

export interface DesktopAnalysis {
  snapshot: unknown;
  files: number;
  edges: number;
  warnings: string[];
  durationMs: number;
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
    ipcRenderer.invoke("codarch:read-json", file)
};

contextBridge.exposeInMainWorld("codarch", api);

export type CodarchDesktop = typeof api;
