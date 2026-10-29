/**
 * El estado vivo del servidor: el análisis, el vigilante y el cambio de raíz.
 *
 * Vive aparte del arranque y de las rutas porque es lo único que cambia
 * mientras el servidor escucha: un guardado reanaliza, la app pide live o
 * pausa, y la carpeta puede ser otra. Todo lo demás —escuchar, responder— es
 * estático.
 */

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {
  analyzeRepo,
  watchRepository,
  writeParseCachePayload,
  writeRestSnapshot,
  type RepoAnalysis,
  type RepositoryWatcher
} from "@codarch/parsers";
import type { CcJson } from "@codarch/schema";
import { VERSION } from "../version";

export interface AnalysisState {
  root: string;
  snapshot: CcJson;
  /**
   * El mapa de lo que no es código (ADR 0093), de la misma pasada que el
   * snapshot del código. `null` si esa pasada no lo midió.
   */
  rest: CcJson | null;
  files: number;
  restFiles: number;
  checksum: string;
  warnings: string[];
  updatedAt: string;
  watch: boolean;
}

/** Lo que la app lee de `meta.json`. */
export interface ServerMeta {
  version: string;
  root: string;
  rootPath: string;
  watch: boolean;
  files: number;
  checksum: string;
  warnings: string[];
  updatedAt: string;
}

export interface Live {
  /** Las conexiones SSE abiertas: el latido y el aviso de cambios. */
  clients: Set<http.ServerResponse>;
  /** El estado de ahora: cambia al cambiar de raíz o de modo. */
  current(): AnalysisState;
  meta(): ServerMeta;
  /**
   * Reanaliza si el pulso trae algo nuevo (ADR 0056).
   *
   * Un `git add`, un guardado sin cambios o compilar en `dist/` no llegan
   * aquí: la sesión los reconoce y contesta sin analizar.
   */
  refresh(hints?: readonly string[]): void;
  /** Enciende o apaga el live. Lanza si el vigilante no está disponible. */
  setWatch(enabled: boolean): void;
  /** Sirve otra carpeta. Lanza si no es un directorio. */
  switchRoot(nextRoot: string): AnalysisState;
  /** Cierra el vigilante y las conexiones abiertas. */
  close(): void;
}

export interface StartedLive {
  live: Live;
  /** Por qué no quedó en live, si pidió live y no se pudo. */
  watchWarning: string | null;
}

/**
 * Arranca el estado vivo: analiza una vez y, si toca, empieza a vigilar.
 *
 * El análisis inicial puede lanzar `ConfigError` (un `.codarch.yml` inválido);
 * quien llama decide qué contarle al usuario.
 */
export function startLive(
  root: string,
  watch: boolean,
  clients: Set<http.ServerResponse>
): StartedLive {
  let state = analyzeState(root, watch);
  let watcher: RepositoryWatcher | null = null;

  const stopWatcher = (): void => {
    void watcher?.close();
    watcher = null;
  };

  const closeClients = (): void => {
    for (const client of clients) client.end();
    clients.clear();
  };

  const refresh = (hints: readonly string[] = []): void => {
    if (!state.watch) return;
    try {
      // El alcance se relee en cada análisis y el reporte HEAD viejo se tira:
      // las dos cosas las hace el flujo compartido (ADR 0074).
      const result = analyzeRepo(state.root, { hints });
      if (result.kind === "unchanged") return;
      storeParseCache(state.root, result);
      storeRest(state.root, result);
      state = stateFrom(state.root, result, state.watch);
      broadcast(clients, "update", {
        checksum: state.checksum,
        files: state.files
      });
      console.log(
        `  ↻ ${state.files} ficheros · checksum ${state.checksum.slice(0, 8)}`
      );
    } catch (error) {
      const message = (error as Error).message;
      console.error(`  no se pudo reanalizar: ${message}`);
      broadcast(clients, "error", { message });
    }
  };

  const startWatcher = (): string | null => {
    if (watcher) return null;
    try {
      watcher = watchRepository(state.root, {
        onChange: (paths) => refresh(paths)
      });
      return null;
    } catch (error) {
      watcher = null;
      return (error as Error).message;
    }
  };

  const setWatch = (enabled: boolean): void => {
    if (enabled === state.watch) return;
    if (enabled) {
      const error = startWatcher();
      if (error) throw new Error(`watch no disponible: ${error}`);
      state = { ...state, watch: true };
    } else {
      stopWatcher();
      closeClients();
      state = { ...state, watch: false };
    }
    broadcast(clients, "watch", { watch: state.watch });
  };

  const switchRoot = (nextRoot: string): AnalysisState => {
    const resolved = path.resolve(nextRoot);
    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) throw new Error("la ruta no es un directorio");

    const next = analyzeState(resolved, state.watch);
    stopWatcher();
    state = next;
    if (state.watch) {
      const error = startWatcher();
      if (error) {
        state = { ...state, watch: false };
        console.error(`watch no disponible en ${resolved}: ${error}`);
      }
    }
    broadcast(clients, "update", {
      checksum: state.checksum,
      files: state.files
    });
    console.log(
      `  → ${state.root} · ${state.files} ficheros · ${state.watch ? "live" : "servido"}`
    );
    return state;
  };

  const meta = (): ServerMeta => ({
    version: VERSION === "0.0.0" ? "dev" : VERSION,
    root: path.basename(state.root),
    rootPath: state.root,
    watch: state.watch,
    files: state.files,
    checksum: state.checksum,
    warnings: state.warnings,
    updatedAt: state.updatedAt
  });

  let watchWarning: string | null = null;
  if (state.watch) {
    watchWarning = startWatcher();
    if (watchWarning) state = { ...state, watch: false };
  }

  return {
    live: {
      clients,
      current: () => state,
      meta,
      refresh,
      setWatch,
      switchRoot,
      close: () => {
        stopWatcher();
        closeClients();
      }
    },
    watchWarning
  };
}

/** Analiza la raíz entera: al arrancar, al cambiar de raíz y en los tests. */
export function analyzeState(root: string, watch: boolean): AnalysisState {
  // La sesión y el alcance los lleva el flujo compartido (ADR 0074).
  const result = analyzeRepo(root, { force: true });
  if (result.kind === "unchanged") {
    throw new Error("un análisis forzado no puede contestar que no hay cambios");
  }
  storeParseCache(root, result);
  storeRest(root, result);
  return stateFrom(root, result, watch);
}

/**
 * Guarda el parseo de esta pasada en el `.codarch/` del repo (ADR 0089).
 *
 * Es derivado, como el libro de cadenas: hace que el análisis siguiente —el
 * suyo, el del escritorio o el de `codarch analyze`— no vuelva a parsear lo que
 * ya está parseado. Si no se puede escribir, se sigue sirviendo: cuesta tiempo,
 * no resultado.
 */
function storeParseCache(
  root: string,
  result: Extract<RepoAnalysis, { kind: "snapshot" }>
): void {
  try {
    writeParseCachePayload(path.join(root, ".codarch"), result.parseCache);
  } catch (cause) {
    console.error(
      `  no se pudo guardar la caché de parseo: ${(cause as Error).message}`
    );
  }
}

/**
 * Guarda el resto de esta pasada en el `.codarch/` del repo (ADR 0093).
 *
 * Es el mismo artefacto que deja `codarch analyze`, y no se reescribe si el
 * checksum no cambió. Si no se puede escribir, se sigue sirviendo desde la
 * memoria del proceso: cuesta el fichero, no el mapa.
 */
function storeRest(
  root: string,
  result: Extract<RepoAnalysis, { kind: "snapshot" }>
): void {
  if (!result.rest) return;
  try {
    writeRestSnapshot(path.join(root, ".codarch"), result.rest);
  } catch (cause) {
    console.error(
      `  no se pudo guardar el resto: ${(cause as Error).message}`
    );
  }
}

function stateFrom(
  root: string,
  result: Extract<RepoAnalysis, { kind: "snapshot" }>,
  watch: boolean
): AnalysisState {
  return {
    root,
    snapshot: result.snapshot,
    rest: result.rest,
    files: result.files,
    restFiles: result.restFiles,
    checksum: result.snapshot.meta.checksum ?? "",
    warnings: result.warnings.slice(0, 5),
    updatedAt: new Date().toISOString(),
    watch
  };
}

/** Un aviso para todas las conexiones abiertas; la que falla se va. */
export function broadcast(
  clients: Set<http.ServerResponse>,
  event: string,
  data: unknown
): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    try {
      client.write(payload);
    } catch {
      clients.delete(client);
    }
  }
}
