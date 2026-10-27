import type { CcJson } from "@codarch/schema";
import type { DiffReport } from "@codarch/metrics";
import type { ParseCachePayload } from "@codarch/parsers";

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
  /**
   * Las rutas que avisó el vigilante.
   *
   * Con git sobran —git sabe mejor qué cambió, y un commit no toca el árbol—,
   * pero sin git son la única pista de qué mirar (ADR 0056).
   */
  hints?: string[];
  /** `true` cuando lo pide el usuario: analiza aunque nada haya cambiado. */
  force?: boolean;
}

/** El snapshot nuevo, o la constancia de que no hay nada que rehacer. */
export type AnalyzeOutcome =
  | {
      kind: "snapshot";
      snapshot: CcJson;
      files: number;
      edges: number;
      warnings: string[];
      /**
       * Lo tocado desde el último commit: el HEAD contra el working tree.
       * `null` si el repo no tiene commits o el export del HEAD falló.
       */
      headReport: DiffReport | null;
      /**
       * El parseo de esta pasada, para que lo guarde quien persiste el estado
       * (ADR 0089). El proceso de análisis no escribe en `.codarch/`.
       */
      parseCache: ParseCachePayload;
    }
  /**
   * Nada nuevo: el snapshot sigue igual, pero el reporte HEAD se devuelve
   * igualmente, porque la pestaña Cambios no debe quedarse con uno viejo.
   */
  | { kind: "unchanged"; headReport: DiffReport | null };

export type AnalyzeResponse =
  | { id: number; ok: true; result: AnalyzeOutcome }
  | { id: number; ok: false; error: string };
