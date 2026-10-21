import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeRepository } from "@codarch/parsers";
import { historyLocation, readHistoryIndex } from "@codarch/schema";
import { chainsPayload } from "./chains-payload";

export interface ServeOptions {
  root?: string;
  port: number;
  host: string;
  watch: boolean;
  /** `false` para modo API sin servir la app (Vite ya la sirve). */
  web: boolean;
  help: boolean;
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm"
};

const IGNORED_WATCH =
  /(^|\/)(node_modules|\.git|\.codarch|dist|coverage|\.next|out|target)(\/|$)/;

const IGNORED_BROWSE = new Set([
  ".git",
  "node_modules",
  ".codarch",
  "dist",
  "coverage",
  ".next",
  "out",
  "target"
]);

interface AnalysisState {
  root: string;
  snapshot: ReturnType<typeof analyzeRepository>["snapshot"];
  files: number;
  checksum: string;
  warnings: string[];
  updatedAt: string;
  watch: boolean;
}

interface BrowseEntry {
  name: string;
  path: string;
  kind: "directory";
}

/**
 * Servidor local de solo lectura: analiza el repo, sirve el build web y permite
 * cambiar la carpeta y el modo live desde la propia app.
 *
 * No monitoriza GitHub ni es un servicio remoto: escucha en loopback por
 * defecto y no escribe en el repositorio.
 */
export function runServe(options: ServeOptions): number {
  const root = path.resolve(options.root ?? ".");
  const webRoot = options.web === false ? null : findWebRoot();
  if (options.web !== false && !webRoot) {
    console.error(
      "no se encontró el build web. Ejecuta `npm run web:build` o usa el paquete publicado."
    );
    return 1;
  }

  let state = analyzeState(root, options.watch);
  let watcher: fs.FSWatcher | null = null;
  let timer: NodeJS.Timeout | undefined;
  const clients = new Set<http.ServerResponse>();

  const startWatcher = (): string | null => {
    if (watcher) return null;
    try {
      watcher = fs.watch(state.root, { recursive: true }, (_event, filename) => {
        if (!filename) return;
        const relative = filename.toString().replace(/\\/g, "/");
        if (IGNORED_WATCH.test(relative)) return;
        scheduleRefresh();
      });
      return null;
    } catch (error) {
      watcher = null;
      return (error as Error).message;
    }
  };

  const stopWatcher = (): void => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
    watcher?.close();
    watcher = null;
  };

  const closeClients = (): void => {
    for (const client of clients) client.end();
    clients.clear();
  };

  const refresh = (): void => {
    if (!state.watch) return;
    try {
      const next = analyzeState(state.root, state.watch);
      state = next;
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

  const scheduleRefresh = (): void => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      refresh();
    }, 350);
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

  const meta = () => ({
    root: path.basename(state.root),
    rootPath: state.root,
    watch: state.watch,
    files: state.files,
    checksum: state.checksum,
    warnings: state.warnings,
    updatedAt: state.updatedAt
  });

  const server = http.createServer(async (request, response) => {
    try {
      const host = request.headers.host ?? `${options.host}:${options.port}`;
      const url = new URL(request.url ?? "/", `http://${host}`);
      const pathname = url.pathname;

      if (request.method === "POST") {
        if (!originAllowed(request, options)) {
          sendError(response, 403, "origen no permitido");
          return;
        }

        if (pathname === "/api/root") {
          const body = await readBody(request);
          const nextRoot =
            typeof body === "object" && body !== null && typeof (body as { path?: unknown }).path === "string"
              ? ((body as { path: string }).path)
              : "";
          if (!nextRoot.trim()) {
            sendError(response, 400, "falta la ruta de la carpeta");
            return;
          }
          const next = switchRoot(nextRoot);
          sendJson(response, {
            ...meta(),
            rootPath: next.root,
            watch: next.watch
          });
          return;
        }

        if (pathname === "/api/watch") {
          const body = await readBody(request);
          const enabled =
            typeof body === "object" &&
            body !== null &&
            (body as { enabled?: unknown }).enabled === true;
          try {
            setWatch(enabled);
          } catch (error) {
            sendError(response, 400, (error as Error).message);
            return;
          }
          sendJson(response, meta());
          return;
        }

        sendError(response, 404, "endpoint desconocido");
        return;
      }

      if (request.method !== "GET" && request.method !== "HEAD") {
        response.writeHead(405, { Allow: "GET, HEAD, POST" });
        response.end();
        return;
      }

      if (pathname === "/api/browse") {
        try {
          sendJson(response, browseDirectories(state.root, url.searchParams.get("path")));
        } catch (error) {
          sendError(response, 400, (error as Error).message);
        }
        return;
      }

      if (pathname === "/data/snapshot.cc.json") {
        sendJson(response, state.snapshot);
        return;
      }

      if (pathname === "/data/meta.json") {
        sendJson(response, meta());
        return;
      }

      if (pathname === "/data/report.json") {
        const report = readReport(state.root);
        if (report === null) {
          // No hay reporte: es normal en un repo sin histórico. Un 204 no
          // ensucia la consola del navegador como sí lo hace un 404.
          response.writeHead(204, {
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff"
          });
          response.end();
          return;
        }
        sendJson(response, report);
        return;
      }

      if (pathname === "/data/history.json") {
        sendJson(response, readHistoryIndex(state.root));
        return;
      }

      if (pathname === "/data/chains.json") {
        // Las cadenas de los símbolos: "?symbol=nombre" trae la de ese
        // símbolo; sin él, el calor de los más reescritos ✓.
        const symbol = url.searchParams.get("symbol");
        sendJson(response, chainsPayload(state.root, symbol));
        return;
      }

      if (pathname.startsWith("/data/history/")) {
        const name = pathname.slice("/data/history/".length);
        const file = path.join(historyLocation(state.root).directory, name);
        // Nada fuera del historial: el nombre viene de la URL.
        if (!file.startsWith(historyLocation(state.root).directory)) {
          sendError(response, 403, "ruta fuera del historial");
          return;
        }
        let body: Buffer;
        try {
          body = fs.readFileSync(file);
        } catch {
          sendError(response, 404, "no hay esa foto en el historial");
          return;
        }
        response.writeHead(200, {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Length": body.length,
          "Cache-Control": "no-store"
        });
        response.end(body);
        return;
      }

      if (pathname === "/events") {
        if (!state.watch) {
          response.writeHead(204);
          response.end();
          return;
        }
        response.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-store",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no"
        });
        response.write(
          `event: ready\ndata: ${JSON.stringify({
            checksum: state.checksum,
            files: state.files
          })}\n\n`
        );
        clients.add(response);
        request.on("close", () => clients.delete(response));
        return;
      }

      if (!webRoot) {
        sendError(response, 404, "servidor en modo API: la web la sirve otro proceso");
        return;
      }
      serveStatic(webRoot, pathname, request.method === "HEAD", response);
    } catch (error) {
      if (!response.headersSent) {
        sendError(response, 500, (error as Error).message);
      } else {
        response.end();
      }
    }
  });

  if (state.watch) {
    const error = startWatcher();
    if (error) {
      state = { ...state, watch: false };
      console.error(`watch no disponible; se sirve el análisis inicial: ${error}`);
    }
  }

  server.on("error", (error) => {
    console.error(`no se pudo escuchar en ${options.host}:${options.port}: ${error.message}`);
    process.exitCode = 1;
  });

  server.listen(options.port, options.host, () => {
    const url = `http://${options.host}:${options.port}`;
    const lines = [
      "",
      "  CodArch · serve",
      "",
      `  raíz         ${state.root}`,
      `  web          ${webRoot ?? "modo API (la sirve Vite)"}`,
      `  URL          ${url}`,
      `  snapshot     ${state.files} ficheros · checksum ${state.checksum.slice(0, 8)}`,
      `  modo         ${state.watch ? "watch activo (SSE)" : "solo análisis inicial"}`,
      ""
    ];
    console.log(lines.join("\n"));
  });

  const shutdown = (): void => {
    stopWatcher();
    closeClients();
    server.close(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  return 0;
}

function analyzeState(root: string, watch: boolean): AnalysisState {
  const result = analyzeRepository(root, { git: true });
  return {
    root,
    snapshot: result.snapshot,
    files: result.files,
    checksum: result.snapshot.meta.checksum ?? "",
    warnings: result.warnings.slice(0, 5),
    updatedAt: new Date().toISOString(),
    watch
  };
}

export function browseDirectories(root: string, requested: string | null): {
  path: string;
  parent: string | null;
  entries: BrowseEntry[];
} {
  const target = requested?.trim() ? path.resolve(requested) : root;
  const stat = fs.statSync(target);
  if (!stat.isDirectory()) throw new Error("la ruta no es un directorio");

  const entries = fs
    .readdirSync(target, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !IGNORED_BROWSE.has(entry.name))
    .sort((left, right) => left.name.localeCompare(right.name))
    .slice(0, 500)
    .map((entry) => ({
      name: entry.name,
      path: path.join(target, entry.name),
      kind: "directory" as const
    }));

  const parent = path.dirname(target);
  return {
    path: target,
    parent: parent === target ? null : parent,
    entries
  };
}

async function readBody(request: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 64 * 1024) throw new Error("cuerpo demasiado grande");
    chunks.push(buffer);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? (JSON.parse(text) as unknown) : {};
}

function originAllowed(
  request: http.IncomingMessage,
  options: ServeOptions
): boolean {
  const origin = request.headers.origin;
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== "http:") return false;
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      return true;
    }
    return origin === `http://${options.host}:${options.port}`;
  } catch {
    return false;
  }
}

function findWebRoot(): string | null {
  const candidates = [
    fileURLToPath(new URL("./web", import.meta.url)),
    path.resolve(process.cwd(), "apps", "web", "dist"),
    path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "..",
      "..",
      "..",
      "web",
      "dist"
    )
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "index.html"))) return candidate;
  }
  return null;
}

function readReport(root: string): unknown | null {
  const file = path.join(root, ".codarch", "report.json");
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as unknown;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error(`no se pudo leer ${file}: ${(error as Error).message}`);
    }
    return null;
  }
}

function serveStatic(
  webRoot: string,
  pathname: string,
  headOnly: boolean,
  response: http.ServerResponse
): void {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    response.writeHead(400);
    response.end();
    return;
  }

  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  let file = path.resolve(webRoot, relative);
  if (!isWithin(webRoot, file) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    file = path.join(webRoot, "index.html");
  }

  try {
    const body = fs.readFileSync(file);
    response.writeHead(200, {
      "Content-Type": MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream",
      "Content-Length": body.length,
      "Cache-Control": file.includes(`${path.sep}assets${path.sep}`)
        ? "public, max-age=31536000, immutable"
        : "no-store",
      "X-Content-Type-Options": "nosniff"
    });
    if (headOnly) response.end();
    else response.end(body);
  } catch (error) {
    response.writeHead(500);
    response.end((error as Error).message);
  }
}

function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function sendJson(response: http.ServerResponse, value: unknown): void {
  const body = `${JSON.stringify(value)}\n`;
  response.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(body);
}

function sendError(
  response: http.ServerResponse,
  status: number,
  message: string
): void {
  const body = `${JSON.stringify({ error: message })}\n`;
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store"
  });
  response.end(body);
}

function broadcast(
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
