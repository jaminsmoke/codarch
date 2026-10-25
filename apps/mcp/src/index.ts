#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { MCP_VERSION } from "@codarch/versions";
import {
  McpDataError,
  loadArchitectureStore,
  type ArchitectureStore
} from "./store";
import { createServer } from "./server";

export { createServer } from "./server";
export {
  checkChangeImpact,
  explainModule,
  findHotspots,
  getArchitectureMap,
  getProjectConfig,
  listViolations
} from "./tools";
export {
  ArchitectureStore,
  McpDataError,
  loadArchitectureStore
} from "./store";
export type {
  DiffCounts,
  LoadStoreOptions,
  ReportFileState,
  StatusViolation,
  StoreEdge,
  StoreFile,
  StoreFolder,
  StoreOptions,
  StoreSummary,
  ViolationStatus
} from "./store";
export type {
  ArchitectureMap,
  ArchitectureMapInput,
  CheckChangeImpactInput,
  CheckChangeImpactResult,
  EdgeView,
  ExplainModuleInput,
  ExplainModuleResult,
  FindHotspotsInput,
  FindHotspotsResult,
  HotspotEntry,
  HotspotScope,
  ImpactDirection,
  ImpactNode,
  ListViolationsInput,
  ListViolationsResult,
  MapNode,
  ProjectConfigResult,
  ViolationStatusFilter
} from "./tools";

const VERSION = MCP_VERSION;

const USAGE = `
CodArch MCP — arquitectura para agentes

Uso:
  codarch-mcp [opciones]

Opciones:
  -s, --snapshot <file>  snapshot cc.json (por defecto .codarch/snapshot.cc.json)
  -r, --report <file>    report.json del diff (por defecto .codarch/report.json)
  --no-report            no cargar reporte
  --root <dir>           raíz del proyecto (por defecto el cwd)
  -h, --help             esta ayuda
  -v, --version          versión

El servidor habla MCP por stdio. stdout queda reservado para el protocolo;
los mensajes de estado van a stderr.

Ejemplo de configuración:
  command: node
  args: ["/ruta/repo/apps/mcp/bin/codarch-mcp.mjs",
         "--root", "/ruta/repo",
         "--snapshot", ".codarch/snapshot.cc.json",
         "--report", ".codarch/report.json"]
`;

interface CliOptions {
  root?: string;
  snapshot?: string;
  report?: string | null;
}

function parseArgs(argv: string[]): CliOptions | number {
  const options: CliOptions = {};
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index] as string;
    if (arg === "--snapshot" || arg === "-s") {
      const value = argv[++index];
      if (!value) {
        console.error("--snapshot necesita una ruta");
        return 1;
      }
      options.snapshot = value;
    } else if (arg.startsWith("--snapshot=")) {
      options.snapshot = arg.slice("--snapshot=".length);
    } else if (arg === "--report" || arg === "-r") {
      const value = argv[++index];
      if (!value) {
        console.error("--report necesita una ruta");
        return 1;
      }
      options.report = value;
    } else if (arg.startsWith("--report=")) {
      options.report = arg.slice("--report=".length);
    } else if (arg === "--no-report") {
      options.report = null;
    } else if (arg === "--root") {
      const value = argv[++index];
      if (!value) {
        console.error("--root necesita una ruta");
        return 1;
      }
      options.root = value;
    } else if (arg.startsWith("--root=")) {
      options.root = arg.slice("--root=".length);
    } else if (arg === "--help" || arg === "-h") {
      console.log(USAGE);
      return 0;
    } else if (arg === "--version" || arg === "-v") {
      console.log(VERSION);
      return 0;
    } else {
      console.error(`opción desconocida: ${arg}`);
      return 1;
    }
  }
  return options;
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  const parsed = parseArgs(argv);
  if (typeof parsed === "number") return parsed;

  let store: ArchitectureStore;
  try {
    store = loadArchitectureStore({
      root: parsed.root,
      ...(parsed.snapshot ? { snapshot: parsed.snapshot } : {}),
      ...(parsed.report !== undefined ? { report: parsed.report } : {})
    });
  } catch (error) {
    const message =
      error instanceof McpDataError
        ? error.message
        : error instanceof Error
          ? error.message
          : String(error);
    console.error(`codarch-mcp: ${message}`);
    return 1;
  }

  const server = createServer(store);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `codarch-mcp ${VERSION} listo: ${store.snapshotPath}${
      store.reportPath ? ` + ${store.reportPath}` : " (sin reporte)"
    }`
  );
  return 0;
}

function isMain(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return path.resolve(entry) === fileURLToPath(import.meta.url);
}

if (isMain()) {
  main()
    .then((code) => {
      if (code !== 0) process.exitCode = code;
    })
    .catch((error) => {
      console.error(
        `codarch-mcp: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exitCode = 1;
    });
}
