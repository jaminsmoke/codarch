import type { CcJson } from "@codarch/schema/browser";
import type { DiffReport } from "@codarch/metrics/browser";
import type { RepoAddons } from "@codarch/addons";
import type { HistoryEntry, HistoryIndex } from "@codarch/schema/browser";
import type { SymbolChain } from "@codarch/schema/browser";
import type { PluginStore } from "./plugins";
import type { ViewPreferences, SavedProject } from "./storage";

/**
 * Adaptador de plataforma para `useCodarchApp`.
 *
 * Cada app (web, escritorio) implementa este contrato. El hook no sabe de
 * HTTP ni de IPC: solo llama a estos métodos.
 */
export interface Plataforma {
  /** Analiza una carpeta y devuelve el resultado. */
  analizar: (root: string) => Promise<{
    snapshot: unknown;
    files: number;
    edges: number;
    warnings: string[];
    durationMs: number;
    addons: RepoAddons;
  }>;
  /** Elige una carpeta con el diálogo del sistema. */
  elegirCarpeta: () => Promise<string | null>;
  /** Elige un fichero JSON con el diálogo del sistema. */
  elegirFichero: () => Promise<string | null>;
  /** Lee un JSON del disco o de la red. */
  leerJson: (file: string) => Promise<unknown>;
  /** Lee las preferencias de vista. */
  leerPreferencias: () => ViewPreferences | null;
  /** Escribe las preferencias de vista. */
  escribirPreferencias: (prefs: ViewPreferences) => void;
  /** Lee el proyecto guardado (snapshot + reporte). */
  leerProyecto: () => SavedProject | null;
  /** Escribe el proyecto guardado. */
  escribirProyecto: (project: SavedProject) => boolean;
  /** Borra el proyecto guardado. */
  borrarProyecto: () => void;
  /** La línea del tiempo del repo analizado. */
  historial: () => Promise<HistoryIndex | null>;
  /** Una foto concreta del historial. */
  fotoHistorial: (name: string) => Promise<unknown | null>;
  /** Las cadenas de los símbolos. */
  cadenas: (symbol: string | null) => Promise<unknown | null>;
  /** Abre una URL en el navegador del sistema. */
  abrirExterno: (url: string) => Promise<void>;
  /** Almacenamiento de plugins activados. */
  plugins: PluginStore;
}

export type { HistoryIndex } from "@codarch/schema/browser";
export type { RepoAddon } from "@codarch/addons";
