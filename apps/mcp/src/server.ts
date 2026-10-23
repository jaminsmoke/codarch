import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { McpDataError, type ArchitectureStore } from "./store";
import {
  checkChangeImpact,
  explainModule,
  findHotspots,
  getArchitectureMap,
  getHistory,
  getMigrationPlan,
  getProjectConfig,
  getSymbolChain,
  listViolations
} from "./tools";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false
} as const;

export function createServer(store: ArchitectureStore): McpServer {
  const server = new McpServer(
    { name: "codarch", version: "0.0.0" },
    {
      instructions:
        "Servidor CodArch de arquitectura. Consulta un snapshot cc.json y, si existe, un report.json de diff. Todas las rutas son relativas al proyecto; también se aceptan ids de nodo. Las herramientas son de solo lectura y devuelven JSON observado, sin texto inventado. Si falta el reporte, las consultas de cambios y violaciones lo indican explícitamente."
    }
  );

  server.registerTool(
    "get_architecture_map",
    {
      title: "Mapa de arquitectura",
      description:
        "Devuelve un árbol compacto de carpetas y ficheros con tamaño, complejidad máxima, riesgo compuesto y cambios del report. Usa depth para limitar niveles y limit para hijos por carpeta. Las rutas son relativas al proyecto. Incluye el resumen de símbolos: cuántos hay y cuáles son las funciones más complejas del repo.",
      inputSchema: {
        folder: z
          .string()
          .optional()
          .describe("Carpeta relativa desde la que empezar; vacío = raíz"),
        depth: z
          .number()
          .int()
          .min(1)
          .max(6)
          .optional()
          .describe("Niveles de descendientes a incluir (por defecto 2)"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Máximo de hijos por carpeta (por defecto 20)"),
        includeFiles: z
          .boolean()
          .optional()
          .describe("Incluir hojas de fichero (por defecto true)")
      },
      annotations: READ_ONLY
    },
    (args) => invoke(() => getArchitectureMap(store, args))
  );

  server.registerTool(
    "find_hotspots",
    {
      title: "Buscar hotspots",
      description:
        "Ranking de ficheros por riesgo compuesto o por una métrica del snapshot. Con scope=diff usa los hotspots del report.json (delta base→head). Filtra por carpeta y limita el resultado.",
      inputSchema: {
        scope: z
          .enum(["snapshot", "diff"])
          .optional()
          .describe("snapshot = valores actuales; diff = deltas del reporte"),
        metric: z
          .string()
          .optional()
          .describe("Métrica del snapshot o 'risk'; en diff debe coincidir con el reporte"),
        folder: z.string().optional().describe("Carpeta relativa para filtrar"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Número de hotspots (por defecto 10)"),
        minValue: z
          .number()
          .optional()
          .describe("Valor mínimo exclusivo (por defecto 0)")
      },
      annotations: READ_ONLY
    },
    (args) => invoke(() => findHotspots(store, args))
  );

  server.registerTool(
    "check_change_impact",
    {
      title: "Impacto de un cambio",
      description:
        "Calcula dependientes (quién importa) y/o dependencias (a quién importa) de un fichero o carpeta, hasta depth saltos. Incluye pertenencia a ciclos, cambios observados y violaciones relacionadas del reporte.",
      inputSchema: {
        path: z
          .string()
          .min(1)
          .describe("Ruta relativa o id de un fichero o carpeta"),
        direction: z
          .enum(["dependents", "dependencies", "both"])
          .optional()
          .describe("Dirección del impacto (por defecto dependents)"),
        depth: z
          .number()
          .int()
          .min(1)
          .max(8)
          .optional()
          .describe("Saltos máximos (por defecto 2)"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(200)
          .optional()
          .describe("Máximo de nodos impactados (por defecto 50)")
      },
      annotations: READ_ONLY
    },
    (args) => invoke(() => checkChangeImpact(store, args))
  );

  server.registerTool(
    "list_violations",
    {
      title: "Listar violaciones",
      description:
        "Lista las violaciones de reglas del report.json separando introducidas, existentes y resueltas. Permite filtrar por severidad, tipo y nombre de regla.",
      inputSchema: {
        status: z
          .enum(["all", "introduced", "existing", "resolved"])
          .optional()
          .describe("Estado respecto a la base (por defecto all)"),
        severity: z
          .enum(["all", "info", "warn", "error"])
          .optional()
          .describe("Severidad (por defecto all)"),
        type: z
          .enum(["all", "forbidden", "threshold", "cycles"])
          .optional()
          .describe("Tipo de regla (por defecto all)"),
        rule: z.string().optional().describe("Nombre exacto de regla"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Máximo de violaciones (por defecto 20)")
      },
      annotations: READ_ONLY
    },
    (args) => invoke(() => listViolations(store, args))
  );

  server.registerTool(
    "explain_module",
    {
      title: "Explicar módulo",
      description:
        "Ficha de un fichero o carpeta: métricas, riesgo, aristas de entrada/salida, ciclo, cambios del reporte y violaciones. Para una carpeta agrega sus ficheros y muestra los de mayor riesgo. Para un fichero, lista también sus símbolos (funciones, clases, tipos) con su complejidad, de la más compleja a la más simple.",
      inputSchema: {
        path: z
          .string()
          .min(1)
          .describe("Ruta relativa o id de un fichero o carpeta"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe("Máximo de aristas/ficheros de detalle (por defecto 5)")
      },
      annotations: READ_ONLY
    },
    (args) => invoke(() => explainModule(store, args))
  );

  server.registerTool(
    "get_migration_plan",
    {
      title: "Plan de migración",
      description:
        "Plan de migración a otro lenguaje: estado por lenguaje y categoría, deuda total, cruces FFI, los ficheros con más deuda y cómo ha cambiado respecto a la base del report.json.",
      inputSchema: {
        folder: z
          .string()
          .optional()
          .describe("Carpeta relativa desde la que empezar; vacío = raíz"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Máximo de ficheros listados (por defecto 15)")
      },
      annotations: READ_ONLY
    },
    (args) => invoke(() => getMigrationPlan(store, args))
  );

  server.registerTool(
    "get_symbol_chain",
    {
      title: "La vida de un símbolo",
      description:
        "La cadena de un símbolo a lo largo del historial: cuándo nació, cómo se renombró o se mudó, cuántas veces cambió su complejidad y cuándo desapareció. Con `symbol` busca solo símbolos, por su nombre o ruta actuales o anteriores; sin él, devuelve el calor del repo: los símbolos más reescritos.",
      inputSchema: {
        symbol: z
          .string()
          .optional()
          .describe(
            "El símbolo: el nombre de la función, la clase o el tipo; sin él, solo el calor"
          ),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe("Máximo de cadenas (por defecto 10)")
      },
      annotations: READ_ONLY
    },
    (args) => invoke(() => getSymbolChain(store, args))
  );

  server.registerTool(
    "get_history",
    {
      title: "Línea del tiempo",
      description:
        "La línea del tiempo del repositorio: las fotos de arquitectura guardadas con `codarch analyze --history`, con su fecha, tamaño, calor y los ficheros más tocados. Con `snapshot` devuelve además esa foto.",
      inputSchema: {
        snapshot: z
          .string()
          .optional()
          .describe("Foto concreta: un trozo de su fecha o de su checksum"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Máximo de entradas (por defecto 10)")
      },
      annotations: READ_ONLY
    },
    (args) => invoke(() => getHistory(store, args))
  );

  server.registerTool(
    "get_project_config",
    {
      title: "Configuración del proyecto",
      description:
        "Lee la configuración del repo (.codarch.yml) igual que el CLI: el perfil de dominio en uso, las capas con sus patrones, las reglas efectivas con su origen (config, profile o addon:<nombre>) y los addons declarados con sus perfiles y sus vistas guardadas. Es la contraparte del mapa: el snapshot dice cómo es el código y la configuración dice qué se espera de él.",
      inputSchema: {},
      annotations: READ_ONLY
    },
    () => invoke(() => getProjectConfig(store))
  );

  return server;
}

function invoke(callback: () => unknown): CallToolResult {
  try {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(callback(), null, 2)
        }
      ]
    };
  } catch (error) {
    const message =
      error instanceof McpDataError
        ? error.message
        : error instanceof Error
          ? error.message
          : String(error);
    return {
      isError: true,
      content: [{ type: "text", text: message }]
    };
  }
}
