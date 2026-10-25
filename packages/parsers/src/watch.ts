import fs from "node:fs";
import path from "node:path";
import { watch as chokidarWatch, type FSWatcher } from "chokidar";
import { isLiveIgnored } from "./pulse";

/**
 * Vigila un repositorio y avisa de los cambios agrupados.
 *
 * **Dos handles por repo, nunca uno por carpeta** (ADR 0056):
 *
 * 1. Un `fs.watch` **recursivo** sobre la raíz. En Windows, macOS y Linux
 *    modernos el sistema hace el trabajo y aquí solo se decide qué se ignora y
 *    cuándo avisar.
 * 2. Un `fs.watch` **no recursivo** sobre `.git`, para los cambios que no tocan
 *    el árbol: un commit o un cambio de rama mueven el índice y `HEAD`, y eso
 *    cambia el churn y por tanto el snapshot.
 *
 * Nada de escuchar `refs/` carpeta por carpeta: lo que mueve el mapa es `HEAD`
 * y el índice, y ambos viven en `.git`.
 *
 * Donde `recursive` no existe se cae a chokidar, que sigue siendo una
 * dependencia y ya resolvía las diferencias entre sistemas.
 */

/** La ruta que se manda cuando lo que cambió es el metadato de git. */
export const GIT_CHANGED = ".git";

/** Cómo se enteró el vigilante: lo dicen los diagnósticos y los tests. */
export type WatchMode = "git" | "archivos";

export interface WatchRepositoryOptions {
  /** Las rutas que cambiaron, relativas a la raíz. */
  onChange: (paths: string[]) => void;
  /** Retardo para agrupar una ráfaga de cambios (ms). */
  delayMs?: number;
}

export interface RepositoryWatcher {
  /** Si el repo es de git, se escucha también su metadato. */
  readonly mode: WatchMode;
  close(): Promise<void>;
}

export function watchRepository(
  root: string,
  options: WatchRepositoryOptions
): RepositoryWatcher {
  const delayMs = options.delayMs ?? 300;
  const pending = new Set<string>();
  const watchers: fs.FSWatcher[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;
  /** Un commit o un cambio de rama: no hay ficheros, pero el mapa cambia. */
  let gitChanged = false;

  const flush = (): void => {
    timer = null;
    if (closed) return;
    const changed = new Set(pending);
    pending.clear();
    if (gitChanged) {
      changed.add(GIT_CHANGED);
      gitChanged = false;
    }
    if (changed.size === 0) return;
    options.onChange([...changed].sort());
  };

  const schedule = (): void => {
    if (closed) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, delayMs);
  };

  const note = (relative: string): void => {
    if (relative === "" || isLiveIgnored(relative)) return;
    // Se guarda con el separador de la plataforma, como hacía `path.relative`.
    pending.add(relative);
    schedule();
  };

  let recursive = true;
  try {
    watchers.push(
      fs.watch(root, { recursive: true }, (_event, filename) => {
        if (filename) note(filename.toString());
      })
    );
  } catch {
    recursive = false;
  }

  if (!recursive) {
    for (const watcher of watchers) watcher.close();
    return chokidarWatcherFor(root, delayMs, options);
  }

  // Un commit no escribe en el árbol de trabajo: se escucha a git.
  let git = false;
  try {
    watchers.push(
      fs.watch(path.join(root, ".git"), { recursive: false }, () => {
        gitChanged = true;
        schedule();
      })
    );
    git = true;
  } catch {
    // Sin `.git` no hay nada que escuchar: el árbol manda.
  }

  return {
    mode: git ? "git" : "archivos",
    async close() {
      closed = true;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      for (const watcher of watchers) watcher.close();
    }
  };
}

/** La reserva: chokidar, con un handle por carpeta. */
function chokidarWatcherFor(
  root: string,
  delayMs: number,
  options: WatchRepositoryOptions
): RepositoryWatcher {
  const pending = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const watcher: FSWatcher = chokidarWatch(root, {
    ignoreInitial: true,
    // Un editor puede escribir el fichero en dos pasos; esperamos a que acabe.
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    ignored: (candidate) => {
      const relative = path.relative(root, candidate);
      if (relative === "") return false;
      return isLiveIgnored(relative);
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
    mode: "archivos",
    async close() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      await watcher.close();
    }
  };
}
