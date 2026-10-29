import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createHandler, type RouteDeps } from "../src/commands/serve-routes";
import { startLive, type Live } from "../src/commands/serve-live";

const tempDirs: string[] = [];
const openServers: http.Server[] = [];
const openLives: Live[] = [];

function tempRepo(files: Record<string, string>): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "codarch-routes-"));
  tempDirs.push(directory);
  for (const [relative, content] of Object.entries(files)) {
    const file = path.join(directory, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return directory;
}

afterEach(async () => {
  for (const live of openLives.splice(0)) live.close();
  await Promise.all(
    openServers.splice(0).map(
      (server) => new Promise<void>((resolve) => server.close(() => resolve()))
    )
  );
  for (const directory of tempDirs.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

/** Levanta el servidor tal cual lo monta `runServe`, en un puerto libre. */
async function serve(
  root: string,
  overrides: Partial<RouteDeps> = {}
): Promise<string> {
  const clients = new Set<http.ServerResponse>();
  const { live } = startLive(root, false, clients);
  openLives.push(live);
  const handler = createHandler({
    origin: { host: "127.0.0.1", port: 0 },
    webRoot: null,
    live,
    ...overrides
  });
  const server = http.createServer((request, response) => {
    void handler(request, response);
  });
  openServers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("el servidor no escucha en un puerto");
  }
  return `http://127.0.0.1:${address.port}`;
}

describe("las rutas del servidor", () => {
  it("sirve el snapshot y la meta del análisis", async () => {
    const root = tempRepo({ "src/a.ts": "export const a = 1;\n" });
    const base = await serve(root);

    const snapshot = await fetch(`${base}/data/snapshot.cc.json`);
    expect(snapshot.status).toBe(200);
    const body = (await snapshot.json()) as { files?: unknown };
    expect(Array.isArray(body.files)).toBe(true);

    const meta = (await (await fetch(`${base}/data/meta.json`)).json()) as {
      rootPath: string;
      files: number;
    };
    expect(meta.rootPath).toBe(root);
    expect(meta.files).toBe(1);
  });

  it("sirve el resto de la misma pasada y lo deja en el repo", async () => {
    const root = tempRepo({
      "src/a.ts": "export const a = 1;\n",
      "README.md": "# Hola\n"
    });
    const base = await serve(root);

    const rest = await fetch(`${base}/data/rest.cc.json`);
    expect(rest.status).toBe(200);
    const body = (await rest.json()) as {
      files?: unknown;
      lenses?: { rest?: unknown };
    };
    expect(Array.isArray(body.files)).toBe(true);
    expect(body.lenses?.rest).toBeTruthy();
    // Es un artefacto más del repo, en el mismo `.codarch/` que el código.
    expect(fs.existsSync(path.join(root, ".codarch", "rest.cc.json"))).toBe(
      true
    );
  });

  it("da código por ruta y se queja si falta", async () => {
    const root = tempRepo({ "src/a.ts": "export const saludo = 'hola';\n" });
    const base = await serve(root);

    const fuente = await fetch(`${base}/api/source?path=src/a.ts&whole=1`);
    expect(fuente.status).toBe(200);
    expect(JSON.stringify(await fuente.json())).toContain("hola");

    const sinRuta = await fetch(`${base}/api/source`);
    expect(sinRuta.status).toBe(400);
    expect(await sinRuta.json()).toEqual({ error: "falta path" });
  });

  it("no deja que otra pestaña cambie la carpeta", async () => {
    const root = tempRepo({ "src/a.ts": "export const a = 1;\n" });
    const base = await serve(root);

    const post = await fetch(`${base}/api/root`, {
      method: "POST",
      headers: { origin: "http://malicioso.example", "content-type": "application/json" },
      body: JSON.stringify({ path: root })
    });

    expect(post.status).toBe(403);
    expect(await post.json()).toEqual({ error: "origen no permitido" });
  });

  it("cambia de carpeta con un POST del propio loopback", async () => {
    const first = tempRepo({ "src/a.ts": "export const a = 1;\n" });
    const second = tempRepo({ "src/b.ts": "export const b = 2;\n" });
    const base = await serve(first);

    const post = await fetch(`${base}/api/root`, {
      method: "POST",
      headers: { origin: "http://127.0.0.1", "content-type": "application/json" },
      body: JSON.stringify({ path: second })
    });

    expect(post.status).toBe(200);
    const meta = (await post.json()) as { rootPath: string; files: number };
    expect(meta.rootPath).toBe(second);
    expect(meta.files).toBe(1);

    const sinRuta = await fetch(`${base}/api/root`, {
      method: "POST",
      headers: { origin: "http://127.0.0.1" },
      body: JSON.stringify({ path: "  " })
    });
    expect(sinRuta.status).toBe(400);
    expect(await sinRuta.json()).toEqual({ error: "falta la ruta de la carpeta" });
  });

  it("contesta 204 al latido cuando no hay watch", async () => {
    const root = tempRepo({ "src/a.ts": "export const a = 1;\n" });
    const base = await serve(root);

    expect((await fetch(`${base}/events`)).status).toBe(204);
  });

  it("separa lo que no conoce de lo que no permite", async () => {
    const root = tempRepo({ "src/a.ts": "export const a = 1;\n" });
    const base = await serve(root);

    const desconocido = await fetch(`${base}/api/nada`, { method: "POST" });
    expect(desconocido.status).toBe(404);
    expect(await desconocido.json()).toEqual({ error: "endpoint desconocido" });

    const verbo = await fetch(`${base}/data/meta.json`, { method: "DELETE" });
    expect(verbo.status).toBe(405);
    expect(verbo.headers.get("allow")).toBe("GET, HEAD, POST");

    const sinWeb = await fetch(`${base}/index.html`);
    expect(sinWeb.status).toBe(404);
    expect((await sinWeb.json()) as { error: string }).toMatchObject({
      error: expect.stringContaining("modo API") as unknown as string
    });
  });
});
