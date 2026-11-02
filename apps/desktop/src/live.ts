import {
  protectedRootReason,
  watchRepository,
  type RepositoryWatcher
} from "@codarch/parsers";
import type { RepoAnalyzer } from "./analyzer";
import { sendHeadReport } from "./head-report";
import {
  isDirectory,
  persistedChecksum,
  persistedHistoryChecksum,
  readPersistedLint,
  storeParseCache,
  storeRest,
  storeRestLint,
  sweepState,
  writeSnapshot
} from "./persistence";
import type { DesktopTarget } from "./preload";
import { snapshotChecksum, snapshotHistoryChecksum } from "./snapshot-state";

/**
 * El repo vivo: se vigila y, cuando cambia, se reanaliza solo (ADR 0050).
 *
 * Si el pulso dice que no hay nada nuevo, no se analiza ni se escribe
 * (ADR 0056); si hay snapshot nuevo, se guarda en `.codarch/` cuando su
 * checksum cambió, y el renderer recibe el estado por el mismo canal que
 * «abrir con». Todo lo de disco lo pone `persistence`; aquí solo está el cuándo.
 */

export interface LiveOptions {
  analyzer(): RepoAnalyzer;
  send(target: DesktopTarget): void;
  sendWatch(live: boolean): void;
}

export interface Live {
  /** Vigila esa raíz, o avisa de que no se puede. */
  watch(root: string): void;
  stop(): void;
  /** ¿Hay un repo vigilado ahora mismo? */
  running(): boolean;
  /** Reanaliza solo si el pulso trae algo nuevo. */
  refresh(root: string, hints?: readonly string[]): Promise<void>;
}

export function createLive(options: LiveOptions): Live {
  let watcher: RepositoryWatcher | null = null;
  let watchingRoot: string | null = null;

  const headReport = (root: string, report: unknown | null): void =>
    sendHeadReport(root, report, options.send);

  const live: Live = {
    watch(root) {
      const denied = protectedRootReason(root);
      if (denied) {
        console.error(`no se vigila ${denied}`);
        options.sendWatch(false);
        return;
      }
      if (watchingRoot === root && watcher) {
        options.sendWatch(true);
        return;
      }
      void watcher?.close();
      watcher = null;
      watchingRoot = root;
      try {
        watcher = watchRepository(root, {
          onChange: (paths) => void live.refresh(root, paths)
        });
        options.sendWatch(true);
      } catch (cause) {
        console.error(`no se pudo vigilar ${root}: ${(cause as Error).message}`);
        options.sendWatch(false);
      }
    },

    stop() {
      void watcher?.close();
      watcher = null;
      watchingRoot = null;
    },

    running() {
      return watcher !== null;
    },

    async refresh(root, hints = []) {
      if (!isDirectory(root)) return;
      try {
        const outcome = await options.analyzer().refresh(root, hints);
        if (outcome.kind === "unchanged") {
          // El snapshot no cambió, pero el HEAD se reenvía: la pestaña Cambios
          // no puede quedarse con un reporte viejo (ADR 0072).
          headReport(root, outcome.headReport);
          return;
        }
        storeParseCache(root, outcome.parseCache);
        sweepState(root);
        // El checksum del resto es suyo (ADR 0093): un documento que cambia no
        // mueve el del código, así que este cambio también se avisa.
        const restChanged = storeRest(root, outcome.rest);
        const restLintChanged = storeRestLint(root, outcome.restLint);
        const checksum = snapshotChecksum(outcome.snapshot);
        const historyChecksum = snapshotHistoryChecksum(outcome.snapshot) ?? "";
        // Mismo código **y** mismo historial: si cambió el calor, hay que
        // escribir el snapshot y avisar, o la app sigue con el viejo (ADR 0103).
        if (
          checksum !== null &&
          persistedChecksum(root) === checksum &&
          persistedHistoryChecksum(root) === historyChecksum
        ) {
          if (!restChanged && !restLintChanged) return;
          options.send({
            kind: "snapshot",
            snapshot: outcome.snapshot,
            rest: outcome.rest,
            lint: readPersistedLint(root),
            restLint: outcome.restLint,
            label: root,
            refresh: true
          });
          headReport(root, outcome.headReport);
          return;
        }
        writeSnapshot(root, outcome.snapshot);
        // `refresh`: es el mismo repo, así que el renderer mantiene la vista.
        options.send({
          kind: "snapshot",
          snapshot: outcome.snapshot,
          rest: outcome.rest,
          lint: readPersistedLint(root),
          restLint: outcome.restLint,
          label: root,
          refresh: true
        });
        headReport(root, outcome.headReport);
      } catch (cause) {
        console.error(`no se pudo reanalizar ${root}: ${(cause as Error).message}`);
      }
    }
  };

  return live;
}
