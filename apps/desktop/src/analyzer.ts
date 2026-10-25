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
 * Las pistas del vigilante se acumulan por raíz y viajan con la petición: si
 * llegan dos avisos mientras uno corre, la repetición ve los dos ficheros. Un
 * «analiza» del usuario marca la raíz como forzada, porque ahí no se puede
 * contestar «no cambió».
 *
 * Si el proceso auxiliar se cae, sus peticiones fallan y la siguiente vuelve a
 * arrancarlo: un análisis roto no deja la app sin analizar hasta reiniciar.
 */

export interface RepoAnalyzer {
  /** Analiza solo si el pulso trae algo nuevo; si no, `unchanged`. */
  refresh(root: string, hints?: readonly string[]): Promise<AnalyzeOutcome>;
  /** Analiza aunque no haya cambiado nada. */
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
  /** Las rutas que el vigilante avisó y aún no se han mandado, por raíz. */
  const hints = new Map<string, Set<string>>();
  /** Las raíces que el usuario pidió analizar: la próxima no se salta. */
  const forced = new Set<string>();

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
      const request: AnalyzeRequest = {
        id,
        root,
        hints: [...(hints.get(root) ?? [])],
        force: forced.has(root)
      };
      waiting.set(id, { resolve, reject });
      try {
        (worker ?? spawn()).postMessage(request);
      } catch (cause) {
        waiting.delete(id);
        reject(cause);
        return;
      }
      // Ya viajan con esta petición: lo que llegue mientras corre se acumula
      // para la repetición, no se pierde.
      hints.delete(root);
      forced.delete(root);
    });

  /** Una sola cosa a la vez; la cola vive en `PendingAnalyses`. */
  const queue = new PendingAnalyses<AnalyzeOutcome>(ask);

  return {
    refresh: (root, paths = []) => {
      if (paths.length > 0) {
        let pending = hints.get(root);
        if (!pending) {
          pending = new Set();
          hints.set(root, pending);
        }
        for (const path of paths) pending.add(path);
      }
      return queue.analyze(root);
    },
    analyze: (root) => {
      forced.add(root);
      return queue.analyze(root);
    },
    close: () => {
      const running = worker;
      worker = null;
      failWaiting(new Error("la app se está cerrando"));
      running?.kill();
    }
  };
}
