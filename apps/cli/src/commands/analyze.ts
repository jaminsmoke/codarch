import fs from "node:fs";
import path from "node:path";
import { ConfigError } from "@codarch/metrics";
import {
  ParseCache,
  analyzeRepository,
  ensureGitignoreEntry,
  loadOwnParseCache,
  loadScopeParseCaches,
  protectedRootReason,
  writeParseCache,
  writeRestSnapshot
} from "@codarch/parsers";
import { CcJsonError, parseCcJson, saveHistory } from "@codarch/schema";
import type { CcJson } from "@codarch/schema";
import { loadProjectIgnore } from "../config";
import { directoryProblem, formatBytes } from "../io";
import {
  discoverScopePaths,
  readScopes,
  scopeHasNewerFiles,
  scopesFile,
  type ScopeEntry,
  writeScopeRegister
} from "../scopes";

export interface AnalyzeCommandOptions {
  root?: string;
  out?: string;
  ignore?: string[];
  /** Fichero de alcance; si falta, se busca `.codarch.yml` en la raíz. */
  config?: string;
  noConfig?: boolean;
  projectName?: string;
  /** `false` desactiva churn de git. */
  git?: boolean;
  /** Guarda la foto en el historial del repo. */
  history?: boolean;
  help: boolean;
}

/** Lo que devuelve el análisis del repo, ya con git y la caché resueltos. */
type Analysis = ReturnType<typeof analyzeRepository>;

/** Lo que se reutilizó de los alcances de debajo (ADR 0089). */
interface Reused {
  scopes: number;
  entries: number;
}

const numberFormat = new Intl.NumberFormat("es-ES");

function num(value: number): string {
  return numberFormat.format(value);
}

function field(label: string, value: string): string {
  return `  ${label.padEnd(12)} ${value}`;
}

/**
 * `codarch analyze`: analiza una carpeta, escribe su `cc.json` y cuenta lo que
 * ha visto.
 *
 * El comando solo ordena las fases. Cada una es su función —la política del
 * proyecto, las cachés, el snapshot y el resumen— porque tienen motivos
 * distintos para fallar y para cambiar: el resumen es presentación y el resto
 * es el análisis.
 */
export function runAnalyze(options: AnalyzeCommandOptions): number {
  const root = options.root ?? ".";
  const denied = protectedRootReason(root);
  if (denied) {
    console.error(
      `codarch no analiza ${denied}: elige la carpeta de un proyecto`
    );
    return 1;
  }

  // Antes de tocar nada: una ruta mal escrita no se crea, se dice.
  const problem = directoryProblem(root);
  if (problem) {
    console.error(`no se puede analizar ${problem}`);
    return 1;
  }

  const policy = readIgnore(root, options);
  if ("error" in policy) {
    console.error(policy.error);
    return 1;
  }

  const rootPath = path.resolve(root);
  const outDirectory = path.resolve(
    options.out ?? path.join(rootPath, ".codarch")
  );
  const { cache, reused, scopePaths } = loadCaches(
    rootPath,
    outDirectory,
    policy.ignore
  );

  let result: Analysis;
  try {
    result = analyzeRepository(root, {
      ignore: policy.ignore,
      projectName: options.projectName,
      git: options.git,
      cache
    });
  } catch (error) {
    console.error(`no se pudo analizar ${root}: ${(error as Error).message}`);
    return 1;
  }

  warnIfEmpty(result, root);

  let cc: CcJson;
  try {
    cc = parseCcJson(result.snapshot);
  } catch (error) {
    if (error instanceof CcJsonError) {
      console.error(`el snapshot generado no es cc.json válido: ${error.message}`);
      return 1;
    }
    throw error;
  }

  const snapshotPath = writeSnapshot(outDirectory, rootPath, cc);
  if (snapshotPath === null) return 1;

  // El resto va a su propio fichero: el checksum del código no puede depender
  // de un documento (ADR 0093).
  const restPath = result.rest ? writeRest(outDirectory, result.rest) : null;
  if (result.rest && restPath === null) return 1;

  const lines = reportLines({
    root,
    rootPath,
    outDirectory,
    snapshotPath,
    restPath,
    cc,
    result,
    cache,
    reused,
    scopePaths,
    history: options.history === true
  });
  console.log(lines.join("\n"));
  // Un mapa vacío no es un análisis correcto: se dice con código de error para
  // que un script no crea que ha mapeado un repo de Python.
  return result.files === 0 ? 1 : 0;
}

/** La política del repo, más los `--ignore` puntuales de esta pasada. */
function readIgnore(
  root: string,
  options: AnalyzeCommandOptions
): { ignore: string[] } | { error: string } {
  try {
    const fromConfig = loadProjectIgnore(root, {
      config: options.config,
      noConfig: options.noConfig
    });
    // El `--ignore` puntual suma; no reemplaza la política del repo.
    return { ignore: [...fromConfig, ...(options.ignore ?? [])] };
  } catch (error) {
    if (error instanceof ConfigError) {
      return { error: `configuración inválida: ${error.message}` };
    }
    throw error;
  }
}

/**
 * El parseo de esta pasada: el de la vez anterior y el de los alcances de
 * debajo.
 *
 * Se lee hacia abajo y nunca hacia arriba (ADR 0089): una carpeta que el padre
 * no mira no es un alcance suyo, y su caché no se usa.
 */
function loadCaches(
  rootPath: string,
  outDirectory: string,
  ignore: readonly string[]
): { cache: ParseCache; reused: Reused; scopePaths: string[] } {
  const cache = new ParseCache();
  try {
    loadOwnParseCache(cache, rootPath, outDirectory);
    const scopePaths = discoverScopePaths(rootPath, ignore);
    const reused = loadScopeParseCaches(cache, rootPath, scopePaths);
    return { cache, reused, scopePaths };
  } catch {
    // Sin alcances legibles se analiza entero: la caché es solo tiempo.
    return { cache, reused: { scopes: 0, entries: 0 }, scopePaths: [] };
  }
}

/** Un repo cuya lengua no se lee da un snapshot vacío y nadie se entera. */
function warnIfEmpty(result: Analysis, root: string): void {
  if (result.files > 0) return;
  console.warn(
    `aviso: no hay ningún fichero que el análisis sepa leer en ${root}; el snapshot sale vacío`
  );
  console.warn(
    "  Dibuja TS/JS, Java, Python, Go y C#; de otro lenguaje solo se mide la lente de migración."
  );
}

/** Escribe el `cc.json`, o devuelve `null` y deja el error dicho. */
function writeSnapshot(
  outDirectory: string,
  rootPath: string,
  cc: CcJson
): string | null {
  const snapshotPath = path.join(outDirectory, "snapshot.cc.json");
  try {
    // El estado es local: si `.codarch/` nace aquí, se ignora en el repo. Si
    // ya existía (o el usuario quitó la línea), no se toca el `.gitignore`
    // (ADR 0050).
    if (
      outDirectory === path.join(rootPath, ".codarch") &&
      !fs.existsSync(outDirectory)
    ) {
      ensureGitignoreEntry(rootPath, ".codarch/");
    }
    fs.mkdirSync(outDirectory, { recursive: true });
    fs.writeFileSync(snapshotPath, `${JSON.stringify(cc, null, 2)}\n`, "utf8");
    return snapshotPath;
  } catch (error) {
    console.error(
      `no se pudo escribir ${snapshotPath}: ${(error as Error).message}`
    );
    return null;
  }
}

/** Escribe el snapshot del resto, o devuelve `null` y deja el error dicho. */
function writeRest(outDirectory: string, rest: CcJson): string | null {
  try {
    return writeRestSnapshot(outDirectory, rest).path;
  } catch (error) {
    console.error(
      `no se pudo escribir el resto en ${outDirectory}: ${(error as Error).message}`
    );
    return null;
  }
}

/** Lo que necesita el resumen para contar la pasada. */
interface ReportContext {
  root: string;
  rootPath: string;
  outDirectory: string;
  snapshotPath: string;
  /** El snapshot del resto, si esta pasada lo escribió. */
  restPath: string | null;
  cc: CcJson;
  result: Analysis;
  cache: ParseCache;
  reused: Reused;
  scopePaths: string[];
  history: boolean;
}

/** La salida del comando: cabecera, métricas, estado guardado y avisos. */
function reportLines(context: ReportContext): string[] {
  const { result, rootPath, outDirectory, scopePaths, cache, cc } = context;
  const snapshotBytes = Buffer.byteLength(
    fs.readFileSync(context.snapshotPath),
    "utf8"
  );
  const lines = [
    "",
    "  CodArch · análisis",
    "",
    field("raíz", rootPath),
    field(
      "snapshot",
      `${context.snapshotPath} (${formatBytes(snapshotBytes)})`
    ),
    ...restLines(context),
    field(
      "estructura",
      `${num(result.files)} ficheros · ${num(result.folders)} carpetas · ${num(
        result.edges
      )} aristas · ${num(result.cycles.length)} ciclos`
    ),
    field(
      "imports",
      `${num(result.externalImports)} externos · ${num(
        result.builtinImports
      )} builtins · ${num(result.typeOnlyImports)} type-only · ${num(
        result.unresolvedImports
      )} sin resolver`
    ),
    field("migración", migrationText(result)),
    parseField(outDirectory, rootPath, cache, result, context.reused),
    field("alcances", scopesText(rootPath, outDirectory, scopePaths)),
    field("tiempo", `${num(result.durationMs)} ms`)
  ];

  if (context.history) {
    lines.push(field("historial", historyText(context.root, cc)));
  }
  lines.push(field("churn", churnText(result)));
  lines.push(...warningLines(result));
  lines.push(...unresolvedLines(result));
  lines.push("");
  return lines;
}

/**
 * El fichero del resto: dónde quedó, cuánto ocupa y qué tiene.
 *
 * Es una línea más del resumen porque el resto es un artefacto más: quien
 * mira `.codarch/` tiene que saber que hay dos mapas y cuál es cuál.
 */
function restLines(context: ReportContext): string[] {
  const file = context.restPath;
  if (!file) return [];
  const edges = context.result.rest?.lenses?.dependency?.edges?.length ?? 0;
  const bytes = Buffer.byteLength(fs.readFileSync(file), "utf8");
  return [
    field(
      "resto",
      `${file} (${formatBytes(bytes)}) · ${num(
        context.result.restFiles
      )} ficheros · ${num(edges)} enlaces`
    )
  ];
}

/** Las líneas de migración: qué hay de cada lengua y cuánto pesa. */
function migrationText(result: Analysis): string {
  const languages = Object.entries(result.migration.languages)
    .map(([language, stats]) => `${language} ${num(stats?.rloc ?? 0)}`)
    .join(" · ");
  return `${languages || "—"} · ${num(
    result.migration.bridgeFiles
  )} puentes · ${num(result.migration.ffiEdges)} FFI · deuda ${num(
    result.migration.migrationDebt
  )}`;
}

/** La caché de parseo de esta pasada, para el análisis que venga por encima. */
function parseField(
  outDirectory: string,
  rootPath: string,
  cache: ParseCache,
  result: Analysis,
  reused: Reused
): string {
  try {
    writeParseCache(outDirectory, rootPath, cache);
    const fromScopes =
      reused.entries > 0 ? ` · ${num(reused.entries)} de alcances de debajo` : "";
    return field(
      "parseo",
      `${num(result.cache.hits)} reutilizados · ${num(
        result.cache.misses
      )} parseados${fromScopes}`
    );
  } catch (error) {
    return field(
      "parseo",
      `no se pudo guardar la caché: ${(error as Error).message}`
    );
  }
}

/**
 * Los alcances de debajo (ADR 0089).
 *
 * El padre apunta qué alcances tiene por debajo. Solo se lee hacia abajo: el
 * `.codarch/` del hijo lo escribe quien analiza el hijo.
 */
function scopesText(
  rootPath: string,
  outDirectory: string,
  scopePaths: readonly string[]
): string {
  try {
    const nested: ScopeEntry[] = readScopes(rootPath, scopePaths);
    const stale = nested.filter((scope) =>
      scopeHasNewerFiles(rootPath, scope.path)
    ).length;
    // Sin alcances y sin registro, no se crea un fichero vacío; con registro,
    // se reescribe aunque ya no quede ninguno, para no dejar fantasmas.
    if (nested.length > 0 || fs.existsSync(scopesFile(outDirectory))) {
      writeScopeRegister(outDirectory, nested);
    }
    if (nested.length === 0) return "—";
    return `${num(nested.length)} anidados${
      stale > 0 ? ` · ${num(stale)} con ficheros más nuevos` : ""
    }`;
  } catch (error) {
    return `no se pudo registrar: ${(error as Error).message}`;
  }
}

/** La foto de esta pasada en el historial, si se pidió. */
function historyText(root: string, cc: CcJson): string {
  try {
    const saved = saveHistory(path.resolve(root), cc, new Date());
    return saved.saved
      ? `guardado ${saved.file}`
      : "sin cambios; ya había una foto igual";
  } catch (error) {
    return `no se pudo guardar: ${(error as Error).message}`;
  }
}

/** El historial de git: commits, autores y si el clon está recortado. */
function churnText(result: Analysis): string {
  if (result.git.enabled) {
    return `${num(result.git.commits)} commits · ${num(
      result.git.authors
    )} autores${result.git.shallow ? " · shallow" : ""}`;
  }
  // Sin ficheros analizados no hay a qué atribuir commits: decir «sin git» en
  // un repo git era mentira.
  return result.files === 0
    ? "sin ficheros que analizar; se omite churn"
    : "sin git; se omite churn";
}

function warningLines(result: Analysis): string[] {
  const lines = result.warnings
    .slice(0, 10)
    .map((warning) => field("aviso", warning));
  if (result.warnings.length > 10) {
    lines.push(field("aviso", `y ${num(result.warnings.length - 10)} más`));
  }
  return lines;
}

function unresolvedLines(result: Analysis): string[] {
  const lines = result.unresolved
    .slice(0, 5)
    .map((issue) =>
      field(
        "sin resolver",
        `${issue.file}:${issue.line} ${issue.specifier} (${issue.reason})`
      )
    );
  if (result.unresolved.length > 5) {
    lines.push(
      field("sin resolver", `y ${num(result.unresolved.length - 5)} más`)
    );
  }
  return lines;
}
