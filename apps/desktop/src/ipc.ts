import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { ipcMain, shell } from "electron";
import {
  ensureStateIgnored,
  protectedRootReason,
  readFileDiff,
  readSourceFile,
  readSourceSnippet
} from "@codarch/parsers";
import { repoAddons } from "@codarch/addons/node";
import {
  chainsPayload,
  historyLocation,
  readHistoryIndex
} from "@codarch/schema";
import { parsePreferences } from "@codarch/ui/storage";
import { pickFile, pickFolder } from "./dialogs";
import type { Live } from "./live";
import {
  isDirectory,
  persistProject,
  readPersistedLint,
  restoreProject,
  storeParseCache,
  storeRest,
  sweepState,
  writeSnapshot
} from "./persistence";
import { readRepoPreferences, writeRepoPreferences } from "./preferences";
import { analyzer, currentRoot, setCurrentRoot } from "./session";
import { checkUpdate, installUpdate } from "./updater";

/**
 * Lo que el renderer puede pedir al proceso principal.
 *
 * Los cuerpos de los manejadores viven aquí, juntos, en vez de repartidos por
 * el arranque: el renderer habla por IPC y esta es su única puerta. Lo que
 * necesita de la ventana, del repo vigilado o del proceso de análisis se lo
 * pasa `main.ts`.
 */

export interface IpcOptions {
  live: Live;
}

export function registerIpcHandlers({ live }: IpcOptions): void {
  /** Restaura lo guardado y deja el repo en vivo, sin bloquear la respuesta. */
  const restore = (root: string): ReturnType<typeof restoreProject> => {
    if (protectedRootReason(root)) return null;
    const restored = restoreProject(root);
    if (!restored) return null;
    setCurrentRoot(root);
    live.watch(root);
    // Lo guardado se pinta al instante; el análisis de verdad llega detrás, en
    // su proceso, para ver lo que cambió sin la app abierta antes de ponerse
    // en live.
    setTimeout(() => void live.refresh(root), 400);
    return restored;
  };

  ipcMain.handle("codarch:pick-folder", async () => pickFolder());
  ipcMain.handle("codarch:pick-file", async () => pickFile());

  /** Restaura snapshot, reporte y addons de `.codarch/` (ADR 0048). */
  ipcMain.handle("codarch:restore-project", async (_event, root: string) => {
    if (typeof root !== "string" || !root) return null;
    return restore(root);
  });

  /** Persiste el proyecto en `.codarch/` del repo. */
  ipcMain.handle(
    "codarch:persist-project",
    async (
      _event,
      root: string,
      snapshot: unknown,
      report: unknown | null
    ) => {
      if (typeof root !== "string" || !root) return false;
      // Un fichero suelto no es un proyecto: no se escribe en ningún repo y se
      // deja de vigilar el anterior para no mezclar estados (ADR 0050).
      if (!isDirectory(root)) {
        live.stop();
        setCurrentRoot(null);
        return false;
      }
      return persistProject(root, snapshot, report);
    }
  );

  ipcMain.handle("codarch:analyze", async (_event, root: string) => {
    const denied = protectedRootReason(root);
    if (denied) {
      throw new Error(
        `CodArch no analiza ${denied}; abre la carpeta de un proyecto`
      );
    }
    const started = Date.now();
    const outcome = await analyzer().analyze(root);
    if (outcome.kind === "unchanged") {
      throw new Error("el análisis no devolvió un snapshot");
    }
    setCurrentRoot(root);
    ensureStateIgnored(root);
    writeSnapshot(root, outcome.snapshot);
    storeRest(root, outcome.rest);
    storeParseCache(root, outcome.parseCache);
    sweepState(root);
    live.watch(root);
    return {
      snapshot: outcome.snapshot,
      rest: outcome.rest,
      lint: readPersistedLint(root),
      files: outcome.files,
      edges: outcome.edges,
      warnings: outcome.warnings,
      durationMs: Date.now() - started,
      // Los addons que el repo declara (ADR 0029): sus vistas guardadas se
      // ofrecen en el mapa, sin leer nada más desde el renderer.
      addons: repoAddons(root),
      // Las preferencias que el repo ya tenía (ADR 0053).
      preferences: readRepoPreferences(root)
    };
  });

  ipcMain.handle("codarch:read-json", async (_event, file: string) => {
    try {
      return JSON.parse(readFileSync(file, "utf8")) as unknown;
    } catch (cause) {
      throw new Error(`No se pudo leer ${file}: ${(cause as Error).message}`);
    }
  });

  /** Lee el código de un símbolo del repo abierto (ADR 0067). */
  ipcMain.handle(
    "codarch:read-source",
    (
      _event,
      request: {
        path?: unknown;
        start?: unknown;
        end?: unknown;
        whole?: unknown;
      } | null
    ) => {
      const root = currentRoot();
      if (!root || !request || typeof request.path !== "string") return null;
      // El fichero entero, para verlo en el escenario (ADR 0087).
      if (request.whole === true) return readSourceFile(root, request.path);
      return readSourceSnippet(
        root,
        request.path,
        typeof request.start === "number" ? request.start : 1,
        typeof request.end === "number" ? request.end : 400
      );
    }
  );

  /** El diff de un fichero contra el último commit (ADR 0077). */
  ipcMain.handle(
    "codarch:read-diff",
    (_event, request: { path?: unknown } | null) => {
      const root = currentRoot();
      if (!root || !request || typeof request.path !== "string") return null;
      return readFileDiff(root, request.path);
    }
  );

  /** Abre el fichero en VS Code, en la línea pedida (ADR 0068). */
  ipcMain.handle(
    "codarch:open-editor",
    async (_event, request: { path?: unknown; line?: unknown } | null) => {
      const root = currentRoot();
      if (!root || !request || typeof request.path !== "string") return false;
      const resolvedRoot = path.resolve(root);
      const file = path.resolve(resolvedRoot, request.path);
      const prefix = resolvedRoot.endsWith(path.sep)
        ? resolvedRoot
        : `${resolvedRoot}${path.sep}`;
      if (!file.startsWith(prefix)) return false;
      // Un symlink dentro del repo no puede abrir un fichero de fuera. Si el
      // fichero no existe (borrado en el árbol y aún en el mapa), vale la ruta
      // del snapshot: el editor lo abrirá vacío, como hacía.
      try {
        const realRoot = realpathSync(resolvedRoot);
        const realFile = realpathSync(file);
        const realPrefix = realRoot.endsWith(path.sep)
          ? realRoot
          : `${realRoot}${path.sep}`;
        if (!realFile.startsWith(realPrefix)) return false;
      } catch {
        // Sin fichero real no hay enlace que comprobar.
      }
      const line =
        typeof request.line === "number" && request.line > 0
          ? Math.trunc(request.line)
          : 1;
      const normalized = file.replaceAll("\\", "/");
      const prefixUri = /^[A-Za-z]:\//.test(normalized)
        ? "vscode://file/"
        : "vscode://file";
      try {
        await shell.openExternal(
          `${prefixUri}${encodeURI(normalized)}:${line}`
        );
        return true;
      } catch {
        return false;
      }
    }
  );

  /** Guarda las preferencias de vista en el `.codarch/` del repo (ADR 0053). */
  ipcMain.handle(
    "codarch:persist-preferences",
    async (_event, root: string, preferences: unknown) => {
      if (typeof root !== "string" || !root) return false;
      if (!isDirectory(root)) return false;
      const parsed = parsePreferences(preferences);
      if (!parsed) return false;
      return writeRepoPreferences(root, parsed);
    }
  );

  /** La línea del tiempo del repositorio analizado. */
  ipcMain.handle("codarch:history", async () => {
    const root = currentRoot();
    if (!root) return null;
    return readHistoryIndex(root);
  });

  /**
   * Las cadenas de los símbolos.
   *
   * Con "symbol" devuelve la de ese símbolo; sin él, el calor del repo ✓.
   */
  ipcMain.handle("codarch:chains", async (_event, symbol: string | null) => {
    const root = currentRoot();
    if (!root) return null;
    return chainsPayload(root, symbol);
  });

  /** Una foto concreta del historial. */
  ipcMain.handle("codarch:history-snapshot", async (_event, name: string) => {
    const root = currentRoot();
    if (!root) return null;
    const directory = historyLocation(root).directory;
    const file = path.join(directory, path.basename(name));
    if (!file.startsWith(directory)) {
      throw new Error("ruta fuera del historial");
    }
    try {
      return JSON.parse(readFileSync(file, "utf8")) as unknown;
    } catch (cause) {
      throw new Error(`No se pudo leer ${file}: ${(cause as Error).message}`);
    }
  });

  ipcMain.handle("codarch:check-update", async () => checkUpdate());

  ipcMain.handle("codarch:install-update", async () => installUpdate());

  /** Abre una página (la release, el npm) en el navegador del sistema. */
  ipcMain.handle("codarch:open-external", async (_event, url: string) => {
    if (!url.startsWith("https://")) {
      throw new Error(`no es una URL de https: ${url}`);
    }
    await shell.openExternal(url);
  });
}
