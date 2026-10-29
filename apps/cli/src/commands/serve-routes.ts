/**
 * Las rutas del servidor local: qué contesta a cada verbo y a cada ruta.
 *
 * Cada ruta es su función y el despacho es una tabla. Antes todo esto era una
 * cadena de `if (pathname === …)` dentro del arranque, que era la función más
 * compleja del CLI y no dejaba ver la forma del API.
 */

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import type { DiffReport } from "@codarch/metrics";
import {
  ensureGitignoreEntry,
  headReportFor,
  readFileDiff,
  readSourceFile,
  readSourceSnippet
} from "@codarch/parsers";
import { historyLocation, readHistoryIndex } from "@codarch/schema";
import { repoAddons } from "@codarch/addons/node";
import { chainsPayload } from "./chains-payload";
import type { Live } from "./serve-live";

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

/** Las fotos del historial: el nombre es el resto de la ruta. */
const HISTORY_PREFIX = "/data/history/";

interface RouteContext {
  request: http.IncomingMessage;
  response: http.ServerResponse;
  url: URL;
  live: Live;
}

type Route = (context: RouteContext) => void | Promise<void>;

/** Lo que necesita el despacho: dónde escucha, qué sirve y el estado vivo. */
export interface RouteDeps {
  /** El origen propio, el único que puede mandar POST. */
  origin: { host: string; port: number };
  /** El build web, o `null` en modo API. */
  webRoot: string | null;
  live: Live;
}

/**
 * Devuelve el `handle` del servidor: atrapa sus errores, porque el
 * `http.createServer` no espera la promesa.
 */
export function createHandler(deps: RouteDeps): (
  request: http.IncomingMessage,
  response: http.ServerResponse
) => Promise<void> {
  const { origin, webRoot, live } = deps;

  return async (request, response) => {
    try {
      const host = request.headers.host ?? `${origin.host}:${origin.port}`;
      const url = new URL(request.url ?? "/", `http://${host}`);
      const context: RouteContext = { request, response, url, live };

      if (request.method === "POST") {
        await handlePost(context, origin);
        return;
      }
      if (request.method !== "GET" && request.method !== "HEAD") {
        response.writeHead(405, { Allow: "GET, HEAD, POST" });
        response.end();
        return;
      }
      await handleGet(context, webRoot, request.method === "HEAD");
    } catch (error) {
      if (!response.headersSent) {
        sendError(response, 500, (error as Error).message);
      } else {
        response.end();
      }
    }
  };
}

async function handlePost(
  context: RouteContext,
  origin: RouteDeps["origin"]
): Promise<void> {
  if (!originAllowed(context.request, origin)) {
    sendError(context.response, 403, "origen no permitido");
    return;
  }
  const route = POST_ROUTES[context.url.pathname];
  if (!route) {
    sendError(context.response, 404, "endpoint desconocido");
    return;
  }
  await route(context);
}

async function handleGet(
  context: RouteContext,
  webRoot: string | null,
  headOnly: boolean
): Promise<void> {
  const route = GET_ROUTES[context.url.pathname];
  if (route) {
    await route(context);
    return;
  }
  if (context.url.pathname.startsWith(HISTORY_PREFIX)) {
    historyPhoto(context);
    return;
  }
  if (context.url.pathname === "/events") {
    events(context);
    return;
  }
  if (!webRoot) {
    sendError(
      context.response,
      404,
      "servidor en modo API: la web la sirve otro proceso"
    );
    return;
  }
  serveStatic(webRoot, context.url.pathname, headOnly, context.response);
}

/** Cambiar la carpeta que se analiza (ADR 0034). */
async function postRoot(context: RouteContext): Promise<void> {
  const body = await readBody(context.request);
  const nextRoot = readField(body, "path");
  const requested = typeof nextRoot === "string" ? nextRoot : "";
  if (!requested.trim()) {
    sendError(context.response, 400, "falta la ruta de la carpeta");
    return;
  }
  const next = context.live.switchRoot(requested);
  sendJson(context.response, {
    ...context.live.meta(),
    rootPath: next.root,
    watch: next.watch
  });
}

/** Encender o apagar el live sin reiniciar. */
async function postWatch(context: RouteContext): Promise<void> {
  const body = await readBody(context.request);
  try {
    context.live.setWatch(readField(body, "enabled") === true);
  } catch (error) {
    sendError(context.response, 400, (error as Error).message);
    return;
  }
  sendJson(context.response, context.live.meta());
}

/** El selector de carpeta de la app: solo directorios, sin los internos. */
export function browseDirectories(
  root: string,
  requested: string | null
): { path: string; parent: string | null; entries: BrowseEntry[] } {
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

interface BrowseEntry {
  name: string;
  path: string;
  kind: "directory";
}

function getBrowse(context: RouteContext): void {
  try {
    sendJson(
      context.response,
      browseDirectories(
        context.live.current().root,
        context.url.searchParams.get("path")
      )
    );
  } catch (error) {
    sendError(context.response, 400, (error as Error).message);
  }
}

/** El código de un fichero: un trozo con su rango, o el fichero entero. */
function getSource(context: RouteContext): void {
  const relative = context.url.searchParams.get("path");
  if (!relative) {
    sendError(context.response, 400, "falta path");
    return;
  }
  const root = context.live.current().root;
  const whole = context.url.searchParams.get("whole") === "1";
  const start = Number(context.url.searchParams.get("start") ?? "1");
  const end = Number(context.url.searchParams.get("end") ?? "400");
  const snippet = whole
    ? readSourceFile(root, relative)
    : readSourceSnippet(root, relative, start, end);
  if (!snippet) {
    sendError(context.response, 404, "no hay código para esa ruta");
    return;
  }
  sendJson(context.response, snippet);
}

function getDiff(context: RouteContext): void {
  const relative = context.url.searchParams.get("path");
  if (!relative) {
    sendError(context.response, 400, "falta path");
    return;
  }
  const diff = readFileDiff(context.live.current().root, relative);
  if (!diff) {
    sendError(context.response, 404, "no hay diff para esa ruta");
    return;
  }
  sendJson(context.response, diff);
}

function getHeadReport(context: RouteContext): void {
  const head = computeHeadReport(context.live.current().root);
  if (head === null) {
    sendEmpty(context.response);
    return;
  }
  sendJson(context.response, head);
}

function getReport(context: RouteContext): void {
  const report = readReport(context.live.current().root);
  if (report === null) {
    // No hay reporte: es normal en un repo sin histórico. Un 204 no ensucia la
    // consola del navegador como sí lo hace un 404.
    sendEmpty(context.response);
    return;
  }
  sendJson(context.response, report);
}

/**
 * Las cadenas de los símbolos: "?symbol=nombre" trae la de ese símbolo; sin
 * él, el calor de los más reescritos. El libro se cachea en `.codarch/` (es
 * derivado); si nace aquí, se ignora en git.
 */
function getChains(context: RouteContext): void {
  const root = context.live.current().root;
  if (!fs.existsSync(path.join(root, ".codarch"))) {
    ensureGitignoreEntry(root, ".codarch/");
  }
  sendJson(
    context.response,
    chainsPayload(root, context.url.searchParams.get("symbol"))
  );
}

/** Una foto del historial, por nombre; nada fuera de su carpeta. */
function historyPhoto(context: RouteContext): void {
  const directory = historyLocation(context.live.current().root).directory;
  const name = context.url.pathname.slice(HISTORY_PREFIX.length);
  const file = path.join(directory, name);
  // El nombre viene de la URL: nada fuera del historial.
  if (!file.startsWith(directory)) {
    sendError(context.response, 403, "ruta fuera del historial");
    return;
  }
  let body: Buffer;
  try {
    body = fs.readFileSync(file);
  } catch {
    sendError(context.response, 404, "no hay esa foto en el historial");
    return;
  }
  context.response.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": body.length,
    "Cache-Control": "no-store"
  });
  context.response.end(body);
}

/** El latido: una conexión por pestaña, que se va al cerrarla. */
function events(context: RouteContext): void {
  const state = context.live.current();
  if (!state.watch) {
    context.response.writeHead(204);
    context.response.end();
    return;
  }
  context.response.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-store",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no"
  });
  context.response.write(
    `event: ready\ndata: ${JSON.stringify({
      checksum: state.checksum,
      files: state.files
    })}\n\n`
  );
  context.live.clients.add(context.response);
  context.request.on("close", () => context.live.clients.delete(context.response));
}

function getJson(value: (context: RouteContext) => unknown): Route {
  return (context) => sendJson(context.response, value(context));
}

/** Un JSON que puede no existir: contesta 204 en vez de `null`. */
function getOptionalJson(value: (context: RouteContext) => unknown): Route {
  return (context) => {
    const data = value(context);
    if (data === null || data === undefined) sendEmpty(context.response);
    else sendJson(context.response, data);
  };
}

/** Una ruta que contesta 204 cuando el dato no existe. */
function sendEmpty(response: http.ServerResponse): void {
  response.writeHead(204, {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end();
}

const POST_ROUTES: Record<string, Route> = {
  "/api/root": postRoot,
  "/api/watch": postWatch
};

const GET_ROUTES: Record<string, Route> = {
  "/api/browse": getBrowse,
  "/api/source": getSource,
  "/api/diff": getDiff,
  "/data/snapshot.cc.json": getJson((context) => context.live.current().snapshot),
  // El mapa del resto sale de la misma pasada que el del código (ADR 0093):
  // no se lee de disco, así que los dos no se pueden desincronizar aquí.
  "/data/rest.cc.json": getOptionalJson(
    (context) => context.live.current().rest
  ),
  "/data/meta.json": getJson((context) => context.live.meta()),
  "/data/head-report.json": getHeadReport,
  "/data/report.json": getReport,
  "/data/history.json": getJson((context) =>
    readHistoryIndex(context.live.current().root)
  ),
  // Los addons que el repo declara, con sus vistas guardadas: la app los
  // enseña tal cual, sin leer ficheros (ADR 0029).
  "/data/addons.json": getJson((context) =>
    repoAddons(context.live.current().root)
  ),
  "/data/chains.json": getChains
};

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

/** Un campo del cuerpo, si el cuerpo es un objeto. */
function readField(body: unknown, key: string): unknown {
  if (typeof body !== "object" || body === null) return undefined;
  return (body as Record<string, unknown>)[key];
}

/**
 * ¿La petición viene de donde dice el navegador?
 *
 * Solo loopback o el propio servidor: un POST desde otra pestaña no cambia la
 * carpeta que se analiza.
 */
function originAllowed(
  request: http.IncomingMessage,
  origin: RouteDeps["origin"]
): boolean {
  const header = request.headers.origin;
  if (!header) return true;
  try {
    const parsed = new URL(header);
    if (parsed.protocol !== "http:") return false;
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      return true;
    }
    return header === `http://${origin.host}:${origin.port}`;
  } catch {
    return false;
  }
}

function readReport(root: string): unknown | null {
  return readCodarchJson(root, "report.json");
}

/**
 * Lo tocado desde el último commit, tal como lo sirve la app (ADR 0072).
 *
 * Lo calcula el servidor, que tiene git; el `.codarch/head-report.json` del
 * escritorio es el respaldo cuando el cálculo no es posible —un repo sin
 * commits, por ejemplo—. El escritorio manda el suyo desde su proceso de
 * análisis, y un test comprueba que las dos plataformas dicen lo mismo sobre
 * el mismo árbol.
 */
export function computeHeadReport(root: string): DiffReport | null {
  const warnings: string[] = [];
  const computed = headReportFor(root, warnings);
  for (const warning of warnings) console.error(`  ${warning}`);
  return computed ?? (readCodarchJson(root, "head-report.json") as DiffReport | null);
}

/** Un JSON de `.codarch/`, o `null` si falta o no se puede leer. */
export function readCodarchJson(root: string, name: string): unknown | null {
  const file = path.join(root, ".codarch", name);
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
