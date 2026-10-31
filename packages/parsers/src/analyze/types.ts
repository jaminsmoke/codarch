import type { CcDuplicationSummary, CcJson, CcMigrationSummary } from "@codarch/schema/browser";
import type { ParseCache } from "../cache";
import type { FileSystem } from "../fs";
import type { SourceParser } from "../types";

/**
 * El contrato del núcleo del análisis.
 *
 * Lo que entra y lo que sale, sin saber cómo se recorre nada: `analyzeFiles`
 * recibe un puerto de ficheros y los parsers, y devuelve el mismo `cc.json` que
 * el CLI. Los tipos viven aquí para que el orquestador (`analyze-core.ts`) y
 * las piezas —medir, resolver, cerrar espacios de nombres— compartan la forma
 * sin importarse entre sí.
 */

export interface ChurnMetric {
  commits: number;
  authors: number;
}

export interface ChurnResult {
  metrics: Map<string, ChurnMetric>;
  warnings: string[];
  enabled: boolean;
  commits: number;
  authors: number;
  shallow: boolean;
}

export interface AnalyzeCoreOptions {
  /** Puerto de ficheros: el disco en el CLI, memoria en el navegador. */
  fileSystem: FileSystem;
  /** Raíz virtual del análisis. */
  root?: string;
  /**
   * Nombre del proyecto cuando no hay `package.json`.
   *
   * El nombre de la raíz entra en el checksum, así que el CLI y el navegador
   * tienen que usar el mismo: el de la carpeta.
   */
  fallbackName?: string;
  projectName?: string;
  ignore?: readonly string[];
  extensions?: readonly string[];
  /**
   * Los parsers del análisis: se elige por extensión (ADR 0090).
   *
   * El nativo del CLI y el WASM del navegador cubren TS/JS. Un repositorio
   * que solo tenga esos ficheros da el mismo resultado que con un parser
   * único: el registro no añade nada.
   */
  parsers: readonly SourceParser[];
  /**
   * El parseo de la vez anterior, si hay (ADR 0056).
   *
   * Un puerto sin `stat` (el navegador) no la usa: analiza entero, que es lo
   * que hace hoy porque analiza una vez la carpeta que se elige.
   */
  cache?: ParseCache;
  /** El commit del repo, si el puerto de ficheros lo conoce (el CLI con git). */
  commitHash?: string;
  /**
   * Métricas de historial por ruta relativa.
   *
   * El navegador no tiene git, así que no lo pasa: su snapshot sale sin
   * churn, como el del CLI con `--no-git`.
   */
  churn?: (relativePaths: string[]) => ChurnResult;
  /**
   * Mide también lo que no es código (ADR 0093).
   *
   * Por defecto, sí: el snapshot del resto sale de la misma pasada. Quien no lo
   * quiera —la acción de GitHub no lo publica— lo apaga y se ahorra leer lo que
   * no va a usar.
   */
  rest?: boolean;
  /**
   * Avisa del progreso fichero a fichero.
   *
   * El navegador lo usa para pintar una barra y para saber cuándo puede
   * cancelar: el análisis es síncrono y solo se puede interrumpir entre
   * ficheros.
   */
  onProgress?: (progress: AnalyzeProgress) => void;
}

export interface AnalyzeProgress {
  /** Ficheros ya procesados. */
  done: number;
  /** Ficheros totales. */
  total: number;
  /** Ruta del fichero en curso. */
  current: string;
}

export interface UnresolvedImportIssue {
  file: string;
  /** Línea 1-based. */
  line: number;
  specifier: string;
  reason: string;
}

export interface AnalyzeCoreResult {
  snapshot: CcJson;
  files: number;
  /** Carpetas del árbol, sin contar la raíz sintética. */
  folders: number;
  edges: number;
  cycles: string[][];
  metricNames: string[];
  warnings: string[];
  unresolved: UnresolvedImportIssue[];
  externalImports: number;
  builtinImports: number;
  typeOnlyImports: number;
  unresolvedImports: number;
  migration: CcMigrationSummary;
  /** Resumen de la duplicación medida (ADR 0102). */
  duplication: CcDuplicationSummary;
  /** Resumen del historial, si lo hubo. */
  churn: ChurnResult | null;
  /** Ficheros reutilizados de la caché y ficheros parseados de nuevo. */
  cache: { hits: number; misses: number };
  /**
   * El snapshot de lo que no es código (ADR 0093), o `null` si se apagó.
   *
   * Es un cc.json aparte: su checksum no tiene nada que ver con el del código.
   */
  rest: CcJson | null;
  /** Ficheros del resto que entraron en su snapshot. */
  restFiles: number;
  durationMs: number;
}
