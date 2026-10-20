import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeRepository } from "@codarch/parsers";

export interface ServeOptions {
  root?: string;
  port: number;
  host: string;
  watch: boolean;
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

interface SnapshotState {
  snapshot: ReturnType<typeof analyzeRepository>["snapshot"];
  files: number;
  checksum: string;
  warnings: string[];
}

/**
 * Servidor local de solo lectura: analiza el repo al arrancar, sirve el build
 * web y expone snapshot/report. Con `--watch`, reanaliza y avisa por SSE.
 *
 * No monitoriza GitHub ni es un servicio remoto: escucha en loopback por
 * defecto y no escribe en el repositorio.
 */
export function runServe(options: ServeOptions): number {
  const root = path.resolve(options.root ?? ".");
  const webRoot = findWebRoot();
  if (!webRoot) {
    console.error(
      "no se encontró el build web. Ejecuta `npm run web:build` o usa el paquete publicado."
    );
    return 1;
  }

  let state = analyze(root);
  const clients = new Set<http.ServerResponse>();

  const refresh = (): void => {
    try {
      state = analyze(root);
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

  const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    const pathname = url.pathname;

    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" });
      response.end();
      return;
    }

    if (pathname === "/data/snapshot.cc.json") {
      sendJson(response, state.snapshot);
      return;
    }

    if (pathname === "/data/meta.json") {
      sendJson(response, {
        root: path.basename(root),
        watch: options.watch,
        files: state.files,
        checksum: state.checksum,
        warnings: state.warnings,
        updatedAt: new Date().toISOString()
      });
      return;
    }

    if (pathname === "/data/report.json") {
      const report = readReport(root);
      if (report === null) {
        response.writeHead(404, { "Content-Type": "application/json" });
        response.end('{"error":"no hay .codarch/report.json"}');
        return;
      }
      sendJson(response, report);
      return;
    }

    if (pathname === "/events") {
      if (!options.watch) {
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

    serveStatic(webRoot, pathname, request.method === "HEAD", response);
  });

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
      `  raíz         ${root}`,
      `  web          ${webRoot}`,
      `  URL          ${url}`,
      `  snapshot     ${state.files} ficheros · checksum ${state.checksum.slice(0, 8)}`,
      `  modo         ${options.watch ? "watch activo (SSE)" : "solo análisis inicial"}`,
      ""
    ];
    console.log(lines.join("\n"));
  });

  if (options.watch) {
    let timer: NodeJS.Timeout | undefined;
    const schedule = (): void => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = undefined;
        refresh();
      }, 350);
    };

    try {
      const watcher = fs.watch(root, { recursive: true }, (_event, filename) => {
        if (!filename) return;
        const relative = filename.toString().replace(/\\/g, "/");
        if (IGNORED_WATCH.test(relative)) return;
        schedule();
      });
      process.on("SIGINT", () => {
        watcher.close();
        shutdown(server, clients);
      });
      process.on("SIGTERM", () => {
        watcher.close();
        shutdown(server, clients);
      });
    } catch (error) {
      console.error(
        `watch no disponible; se sirve el análisis inicial: ${(error as Error).message}`
      );
    }
  } else {
    process.on("SIGINT", () => shutdown(server, clients));
    process.on("SIGTERM", () => shutdown(server, clients));
  }

  return 0;
}

function analyze(root: string): SnapshotState {
  const result = analyzeRepository(root, { git: true });
  return {
    snapshot: result.snapshot,
    files: result.files,
    checksum: result.snapshot.meta.checksum ?? "",
    warnings: result.warnings.slice(0, 5)
  };
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

function shutdown(
  server: http.Server,
  clients: Set<http.ServerResponse>
): void {
  for (const client of clients) client.end();
  clients.clear();
  server.close(() => process.exit(0));
}
