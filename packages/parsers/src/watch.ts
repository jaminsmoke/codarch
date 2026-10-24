import path from "node:path";
import { watch, type FSWatcher } from "chokidar";

/**
 * Vigila un repositorio y avisa de los cambios agrupados.
 *
 * Lo comparten `codarch serve` y el escritorio (ADR 0050): una sola lista de
 * exclusiones y una sola forma de agrupar las ráfagas de guardado. Chokidar se
 * encarga de las diferencias entre sistemas y de los renombrados de los
 * editores; nosotros solo decidimos qué se ignora y cuándo avisar.
 */
const IGNORED = new Set([
  ".git",
  "node_modules",
  ".codarch",
  ".codarch-history",
  "dist",
  "coverage",
  ".next",
  "out",
  "target"
]);

export interface WatchRepositoryOptions {
  /** Las rutas que cambiaron, relativas a la raíz. */
  onChange: (paths: string[]) => void;
  /** Retardo para agrupar una ráfaga de cambios (ms). */
  delayMs?: number;
}

export interface RepositoryWatcher {
  close(): Promise<void>;
}

export function watchRepository(
  root: string,
  options: WatchRepositoryOptions
): RepositoryWatcher {
  const delayMs = options.delayMs ?? 300;
  const pending = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const watcher: FSWatcher = watch(root, {
    ignoreInitial: true,
    // Un editor puede escribir el fichero en dos pasos; esperamos a que acabe.
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    ignored: (candidate) => {
      const relative = path.relative(root, candidate);
      if (relative === "") return false;
      return relative.split(path.sep).some((part) => IGNORED.has(part));
    }
  });

  const flush = (): void => {
    timer = null;
    if (pending.size === 0) return;
    const paths = [...pending];
    pending.clear();
    options.onChange(paths);
  };

  watcher.on("all", (_event, changed) => {
    pending.add(path.relative(root, changed));
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, delayMs);
  });

  return {
    async close() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      await watcher.close();
    }
  };
}
