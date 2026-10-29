import type { RepoAddons } from "@codarch/addons";
import type { HistoryEntry, SymbolHeat } from "@codarch/schema/browser";
import type { PluginStore } from "./plugins";
import type { ViewPreferences, SavedProject } from "./storage";

/** Lo que devuelve analizar una carpeta, venga de donde venga. */
export interface ResultadoAnalisis {
  snapshot: unknown;
  /** El mapa de lo que no es código, de la misma pasada (ADR 0093). */
  rest?: unknown;
  files: number;
  edges: number;
  warnings: string[];
  durationMs: number;
  addons: RepoAddons;
  /** Las preferencias que el repo ya tenía guardadas (ADR 0053). */
  preferences?: ViewPreferences | null;
}

/** Lo que se pide para enseñar el código de un símbolo (ADR 0067). */
export interface CodeRequest {
  path: string;
  start: number;
  end: number;
  /** El fichero entero, con el tope de fichero y no el de muestra (ADR 0087). */
  whole?: boolean;
}

export interface CodeSnippet {
  path: string;
  start: number;
  end: number;
  total: number;
  lines: string[];
}

/** Abrir un fichero en el editor del usuario (ADR 0068). */
export interface EditorRequest {
  path: string;
  line: number;
}

/** Una línea de la vista de diferencias. */
export interface FileDiffRow {
  type: "same" | "add" | "del" | "gap";
  text: string;
  /** Línea en la base, 1-based; `null` si la línea no está ahí. */
  baseLine: number | null;
  headLine: number | null;
}

/** El diff de un fichero contra el último commit (ADR 0077). */
export interface FileDiffView {
  path: string;
  status: "added" | "removed" | "changed";
  /** `null` cuando el fichero era demasiado grande para medirlo. */
  added: number | null;
  removed: number | null;
  rows: FileDiffRow[];
  truncated: boolean;
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
  escribirProyecto: (project: SavedProject) => boolean | Promise<boolean>;
  /** Borra el proyecto guardado. */
  borrarProyecto: () => void;
  /** Las cadenas de los símbolos. */
  cadenas?: (symbol: string) => Promise<unknown | null>;
  /** El código real de un símbolo, si la plataforma puede leerlo (ADR 0067). */
  codigo?: (request: CodeRequest) => Promise<CodeSnippet | null>;
  /** Abre un fichero en el editor del usuario, si la plataforma puede (ADR 0068). */
  abrirEnEditor?: (request: EditorRequest) => Promise<boolean>;
  /** El diff de un fichero contra el último commit, si lo puede leer (ADR 0077). */
  diff?: (path: string) => Promise<FileDiffView | null>;
  /** La línea del tiempo del repo, si la plataforma la sirve. */
  historial?: () => Promise<HistoryEntry[] | null>;
  /** El calor de los símbolos, si la plataforma lo sirve. */
  calor?: () => Promise<SymbolHeat[] | null>;
  /** Almacenamiento de plugins activados. */
  plugins: PluginStore;
}

export type { RepoAddon } from "@codarch/addons";

/**
 * Las entradas del historial, del payload que sirva cada plataforma.
 *
 * La web lo lee de `data/history.json` y el escritorio del puente: cambia el
 * transporte, no la forma, así que la proyección se escribe una vez. Un payload
 * que no se entiende es `null`, y los paneles no pintan ni eso ni una lista
 * vacía.
 */
export function historyEntries(payload: unknown): HistoryEntry[] | null {
  if (typeof payload !== "object" || payload === null) return null;
  const entries = (payload as { entries?: unknown }).entries;
  return Array.isArray(entries) ? (entries as HistoryEntry[]) : null;
}

/**
 * El calor de los símbolos, del payload de cadenas de cada plataforma.
 *
 * Va por el mismo camino que el historial: `data/chains.json` en la web, el
 * puente en el escritorio, y una sola forma de sacarlo.
 */
export function symbolHeat(payload: unknown): SymbolHeat[] | null {
  if (typeof payload !== "object" || payload === null) return null;
  const heat = (payload as { heat?: unknown }).heat;
  return Array.isArray(heat) ? (heat as SymbolHeat[]) : null;
}
