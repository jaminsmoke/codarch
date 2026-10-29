import http from "node:http";
import path from "node:path";
import { ConfigError } from "@codarch/metrics";
import { protectedRootReason } from "@codarch/parsers";
import { directoryProblem } from "../io";
import { findWebRoot } from "../web-root";
import { createHandler } from "./serve-routes";
import { startLive } from "./serve-live";

export type { AnalysisState } from "./serve-live";
export { analyzeState } from "./serve-live";
export {
  browseDirectories,
  computeHeadReport,
  readCodarchJson
} from "./serve-routes";

export interface ServeOptions {
  root?: string;
  port: number;
  host: string;
  watch: boolean;
  /** `false` para modo API sin servir la app (Vite ya la sirve). */
  web: boolean;
  help: boolean;
}

/**
 * Servidor local: analiza el repo, sirve el build web y permite cambiar la
 * carpeta y el modo live desde la propia app.
 *
 * No monitoriza GitHub ni es un servicio remoto: escucha en loopback por
 * defecto y no toca el árbol de trabajo. Lo que escribe es estado derivado y
 * ignorado —el libro de cadenas y la caché de parseo— dentro del `.codarch/`
 * del repo (ADR 0050 y ADR 0089).
 *
 * El arranque solo comprueba, monta y escucha: el estado que cambia vive en
 * `serve-live` y las respuestas en `serve-routes`.
 */
export function runServe(options: ServeOptions): number {
  const root = path.resolve(options.root ?? ".");
  const denied = protectedRootReason(root);
  if (denied) {
    console.error(
      `codarch no analiza ${denied}: elige la carpeta de un proyecto`
    );
    return 1;
  }

  // Un servidor sobre una ruta que no existe sirve el vacío: mejor decirlo.
  const problem = directoryProblem(root);
  if (problem) {
    console.error(`no se puede servir ${problem}`);
    return 1;
  }
  const webRoot = options.web === false ? null : findWebRoot();
  if (options.web !== false && !webRoot) {
    console.error(
      "no se encontró el build web. Ejecuta `npm run web:build` o usa el paquete publicado."
    );
    return 1;
  }

  const clients = new Set<http.ServerResponse>();
  let live;
  let watchWarning: string | null = null;
  try {
    const started = startLive(root, options.watch, clients);
    live = started.live;
    watchWarning = started.watchWarning;
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(`configuración inválida: ${error.message}`);
      return 1;
    }
    throw error;
  }
  if (watchWarning) {
    console.error(`watch no disponible; se sirve el análisis inicial: ${watchWarning}`);
  }

  const handle = createHandler({
    origin: { host: options.host, port: options.port },
    webRoot,
    live
  });
  const server = http.createServer((request, response) => {
    void handle(request, response);
  });

  server.on("error", (error) => {
    console.error(`no se pudo escuchar en ${options.host}:${options.port}: ${error.message}`);
    process.exitCode = 1;
  });

  server.listen(options.port, options.host, () => {
    const state = live.current();
    const url = `http://${options.host}:${options.port}`;
    const lines = [
      "",
      "  CodArch · serve",
      "",
      `  raíz         ${state.root}`,
      `  web          ${webRoot ?? "modo API (la sirve Vite)"}`,
      `  URL          ${url}`,
      `  snapshot     ${state.files} ficheros · checksum ${state.checksum.slice(0, 8)}`,
      `  resto        ${state.restFiles} ficheros`,
      `  modo         ${state.watch ? "watch activo (SSE)" : "solo análisis inicial"}`,
      ""
    ];
    console.log(lines.join("\n"));
  });

  const shutdown = (): void => {
    live.close();
    server.close(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  return 0;
}
