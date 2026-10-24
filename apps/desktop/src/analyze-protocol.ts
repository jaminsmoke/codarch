import type { CcJson } from "@codarch/schema";

/**
 * Lo que el proceso principal le pide al que analiza, y lo que le contesta.
 *
 * El análisis tarda segundos y es CPU puro: si corriera en el proceso
 * principal, Electron no podría despachar clics ni IPC mientras tanto y la app
 * entera se quedaría congelada. Por eso vive en un `utilityProcess` y solo
 * cruza por aquí lo justo (`analyze-worker.ts` y `analyzer.ts`).
 */

export interface AnalyzeRequest {
  /** Correlaciona la respuesta con la petición. */
  id: number;
  root: string;
}

/** Lo que el análisis devuelve; el snapshot entra en `.codarch/` en el principal. */
export interface AnalyzeOutcome {
  snapshot: CcJson;
  files: number;
  edges: number;
  warnings: string[];
}

export type AnalyzeResponse =
  | { id: number; ok: true; result: AnalyzeOutcome }
  | { id: number; ok: false; error: string };
