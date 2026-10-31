import type { HistoryEntry, SymbolHeat } from "@codarch/schema/browser";
import type {
  CodeRequest,
  CodeSnippet,
  EditorRequest,
  FileDiffView,
  Plataforma
} from "../platform";

/**
 * Las puertas opcionales de la plataforma.
 *
 * El historial, el calor, el diff de un fichero, el código real y el editor no
 * existen en todas las plataformas: la web no abre un editor, el escritorio no
 * sirve dos snapshots. La app pregunta igual y recibe `null` o `false`, sin un
 * `if` por cada puerta repartido por el hook. Lo que no está se dice con la
 * ausencia, no se completa.
 */
export interface PlatformBridges {
  /** El historial del repo, si la plataforma lo sabe leer. */
  loadHistory: () => Promise<HistoryEntry[] | null>;
  /** El calor de los símbolos, si la plataforma lo sabe leer. */
  loadHeat: () => Promise<SymbolHeat[] | null>;
  /** El diff de un fichero contra el último commit (ADR 0077). */
  loadDiff: (path: string) => Promise<FileDiffView | null>;
  /** Lee el código real de un símbolo (ADR 0067). */
  leerCodigo: (request: CodeRequest) => Promise<CodeSnippet | null>;
  /** Abre un fichero en el editor del usuario (ADR 0068). */
  abrirEnEditor: (request: EditorRequest) => Promise<boolean>;
}

/** Las cinco puertas de una plataforma, con las que faltan apagadas. */
export function platformBridges(plataforma: Plataforma): PlatformBridges {
  return {
    loadHistory: async () =>
      plataforma.historial ? plataforma.historial() : null,
    loadHeat: async () => (plataforma.calor ? plataforma.calor() : null),
    loadDiff: async (path) => (plataforma.diff ? plataforma.diff(path) : null),
    leerCodigo: async (request) =>
      plataforma.codigo ? plataforma.codigo(request) : null,
    abrirEnEditor: async (request) =>
      plataforma.abrirEnEditor ? plataforma.abrirEnEditor(request) : false
  };
}
