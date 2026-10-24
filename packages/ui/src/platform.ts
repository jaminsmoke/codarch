import type { RepoAddons } from "@codarch/addons";
import type { PluginStore } from "./plugins";
import type { ViewPreferences, SavedProject } from "./storage";

/** Lo que devuelve analizar una carpeta, venga de donde venga. */
export interface ResultadoAnalisis {
  snapshot: unknown;
  files: number;
  edges: number;
  warnings: string[];
  durationMs: number;
  addons: RepoAddons;
}

/**
 * Adaptador de plataforma para `useCodarchApp`.
 *
 * Cada app (web, escritorio) implementa este contrato. El hook no sabe de
 * HTTP ni de IPC: solo llama a estos métodos. Lo que una plataforma no puede
 * hacer se queda fuera (opcional) y el hook no lo ofrece.
 */
export interface Plataforma {
  /** Analiza una carpeta y devuelve el resultado. */
  analizar?: (root: string) => Promise<ResultadoAnalisis>;
  /** Elige una carpeta con el diálogo del sistema. */
  elegirCarpeta?: () => Promise<string | null>;
  /** Elige un fichero JSON con el diálogo del sistema. */
  elegirFichero?: () => Promise<string | null>;
  /** Lee un JSON del disco o de la red. */
  leerJson?: (file: string) => Promise<unknown>;
  /** Lee las preferencias de vista. */
  leerPreferencias: () => ViewPreferences | null;
  /** Escribe las preferencias de vista. */
  escribirPreferencias: (prefs: ViewPreferences) => void;
  /** Lee el proyecto guardado (snapshot + reporte). */
  leerProyecto: () => SavedProject | null;
  /**
   * Restaura el proyecto al arrancar, si la plataforma lo guarda en disco.
   *
   * El escritorio prefiere `.codarch/` del repo; la web no lo implementa y
   * lleva su propio arranque (servidor, URL, demo) (ADR 0048).
   */
  restaurarProyecto?: () => Promise<SavedProject | null>;
  /** Escribe el proyecto guardado. */
  escribirProyecto: (project: SavedProject) => boolean;
  /** Borra el proyecto guardado. */
  borrarProyecto: () => void;
  /** Las cadenas de los símbolos. */
  cadenas?: (symbol: string) => Promise<unknown | null>;
  /** Almacenamiento de plugins activados. */
  plugins: PluginStore;
}

export type { RepoAddon } from "@codarch/addons";
