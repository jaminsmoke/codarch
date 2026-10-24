import { utilityProcess, type UtilityProcess } from "electron";
import { PendingAnalyses } from "./pending-analyses";
import type {
  AnalyzeOutcome,
  AnalyzeRequest,
  AnalyzeResponse
} from "./analyze-protocol";

/**
 * El cliente del proceso que analiza.
 *
 * Arranca el `utilityProcess` la primera vez que hace falta y une las
 * peticiones con una cola: una análisis a la vez, y las que llegan mientras
 * corre se agrupan. Así el vigilante puede avisar diez veces de una ráfaga de
 * guardados sin lanzar diez análisis.
 *
 * Si el proceso auxiliar se cae, sus peticiones fallan y la siguiente vuelve a
 * arrancarlo: un análisis roto no deja la app sin analizar hasta reiniciar.
 */

export interface RepoAnalyzer {
  analyze(root: string): Promise<AnalyzeOutcome>;
  /** Corta el proceso auxiliar (al cerrar la app). */
  close(): void;
}

export function createAnalyzer(workerPath: string): RepoAnalyzer {
  let worker: UtilityProcess | null = null;
  let nextId = 1;
  const waiting = new Map<
    number,
    {
      resolve: (value: AnalyzeOutcome) => void;
      reject: (cause: unknown) => void;
    }
  >();

  /** Rechaza todo lo que esperaba respuesta (el proceso se fue). */
  const failWaiting = (cause: Error): void => {
    for (const waiter of waiting.values()) waiter.reject(cause);
    waiting.clear();
  };

  const spawn = (): UtilityProcess => {
    const spawned = utilityProcess.fork(workerPath, [], {
      serviceName: "CodArch: análisis"
    });
    spawned.on("message", (message: AnalyzeResponse) => {
      const waiter = waiting.get(message.id);
      if (!waiter) return;
      waiting.delete(message.id);
      if (message.ok) waiter.resolve(message.result);
      else waiter.reject(new Error(message.error));
    });
    spawned.on("exit", (code) => {
      if (worker === spawned) worker = null;
      failWaiting(new Error(`el proceso de análisis terminó (código ${code})`));
    });
    worker = spawned;
    return spawned;
  };

  const ask = (root: string): Promise<AnalyzeOutcome> =>
    new Promise<AnalyzeOutcome>((resolve, reject) => {
      const id = nextId++;
      waiting.set(id, { resolve, reject });
      try {
        const request: AnalyzeRequest = { id, root };
        (worker ?? spawn()).postMessage(request);
      } catch (cause) {
        waiting.delete(id);
        reject(cause);
      }
    });

  /** Una sola cosa a la vez; la cola vive en `PendingAnalyses`. */
  const queue = new PendingAnalyses<AnalyzeOutcome>(ask);

  return {
    analyze: (root) => queue.analyze(root),
    close: () => {
      const running = worker;
      worker = null;
      failWaiting(new Error("la app se está cerrando"));
      running?.kill();
    }
  };
}
