import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface DevServer {
  port: number;
  stop: () => void;
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const START_PORT = 4173;
const END_PORT = 4200;

/**
 * Arranca `codarch serve --no-web` para el frontend de Vite y lo para al cerrar
 * la app. Si ya hay un servidor en el puerto, lo reutiliza sin apropiarse de él.
 */
export async function startDevServer(): Promise<DevServer | null> {
  if (process.env.CODARCH_NO_AUTOSERVE === "1") return null;

  const configured = process.env.CODARCH_SERVE_PORT
    ? Number(process.env.CODARCH_SERVE_PORT)
    : null;
  const port = configured ?? (await findFreePort());
  if (!port) {
    console.warn("[codarch] no hay puerto libre para el servidor; la app usará la demo");
    return null;
  }

  const tsxCli = path.join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");
  if (!fs.existsSync(tsxCli)) {
    console.warn("[codarch] no se encontró tsx; la app usará la demo");
    return null;
  }

  let child: ChildProcess | null = spawn(
    process.execPath,
    [
      tsxCli,
      path.join("apps", "cli", "src", "index.ts"),
      "serve",
      ROOT,
      "--port",
      String(port),
      "--no-web"
    ],
    {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env }
    }
  );

  child.stdout?.on("data", (chunk: Buffer) => {
    process.stdout.write(`[codarch] ${chunk.toString()}`);
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    process.stderr.write(`[codarch] ${chunk.toString()}`);
  });
  child.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.warn(`[codarch] el servidor terminó con código ${code}`);
    }
    child = null;
  });

  const stop = (): void => {
    if (!child) return;
    child.kill();
    child = null;
  };

  process.once("exit", stop);

  for (let attempt = 0; attempt < 80; attempt++) {
    if (await isUp(port)) {
      return { port, stop };
    }
    await sleep(250);
  }

  console.warn("[codarch] el servidor no respondió; la app usará la demo");
  stop();
  return null;
}

async function findFreePort(): Promise<number> {
  for (let port = START_PORT; port <= END_PORT; port++) {
    if (await isPortFree(port)) return port;
  }
  return 0;
}

function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

async function isUp(port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/data/meta.json`, {
      signal: AbortSignal.timeout(500)
    });
    return response.ok;
  } catch {
    return false;
  }
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
