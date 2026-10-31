import fs from "node:fs";
import path from "node:path";
import { ConfigError } from "@codarch/metrics";
import {
  ParseCache,
  analyzeRepository,
  ensureStateIgnored,
  loadOwnParseCache,
  loadScopeParseCaches,
  protectedRootReason,
  sweepCodarch,
  writeParseCache,
  writeRestSnapshot
} from "@codarch/parsers";
import {
  CODARCH_DIR,
  CcJsonError,
  SNAPSHOT_FILE,
  codarchDir,
  parseCcJson,
  saveHistory
} from "@codarch/schema";
import type { CcJson } from "@codarch/schema";
import {
  lintTotals,
  type LintArtifact,
  type LintProcessRunner
} from "@codarch/lint";
import { loadProjectIgnore } from "../config";
import { directoryProblem } from "../io";
import {
  reportLines,
  type LintLine,
  type ReportFacts
} from "../analyze-report";
import { runProjectLint } from "../lint-store";
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
  /** No ejecuta el lint del proyecto en esta pasada. */
  noLint?: boolean;
  /** Cómo se lanzan las herramientas; por defecto, un proceso por herramienta. */
  lintRun?: LintProcessRunner;
  help: boolean;
}

/** Lo que devuelve el análisis del repo, ya con git y la caché resueltos. */
type Analysis = ReturnType<typeof analyzeRepository>;

/** Lo que se reutilizó de los alcances de debajo (ADR 0089). */
interface Reused {
  scopes: number;
  entries: number;
}

/**
 * `codarch analyze`: analiza una carpeta, escribe su `cc.json` y cuenta lo que
 * ha visto.
 *
 * El comando solo ordena las fases. Cada una es su función —la política del
 * proyecto, las cachés, el snapshot, el lint y el resumen— porque tienen
 * motivos distintos para fallar y para cambiar: el resumen es presentación y
 * el resto es el análisis.
 *
 * El lint se mide aquí, en la misma pasada (ADR 0099): es una lente del mapa y
 * las lentes se calculan al analizar. Se ejecuta el lint que el proyecto ya
 * tiene —su configuración y su binario—, no uno inventado, y el artefacto
 * queda firmado con el checksum del snapshot que se acaba de escribir.
 */
export async function runAnalyze(
  options: AnalyzeCommandOptions
): Promise<number> {
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
  const outDirectory = path.resolve(options.out ?? codarchDir(rootPath));
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

  // El lint, en la misma pasada y firmado con el árbol que se acaba de medir.
  const lint = options.noLint
    ? ({ kind: "skipped" } as const)
    : await measureLint(rootPath, outDirectory, cc, options.lintRun);

  // Lo que se escribe y lo que se cuenta: la pasada deja sus artefactos y el
  // resumen recibe los números hechos (`analyze-report.ts`).
  const facts = collectReport({
    root,
    rootPath,
    outDirectory,
    snapshotPath,
    restPath,
    lint,
    cc,
    result,
    cache,
    reused,
    scopePaths,
    history: options.history === true
  });
  // La carpeta es del producto: lo que no reconoce se va, con aviso (ADR 0101).
  // Se hace al final, cuando ya está escrito todo lo de esta pasada, y solo si
  // se escribe en el `.codarch/` del repo y no en una salida de `--out`.
  const swept =
    outDirectory === codarchDir(rootPath) ? sweepCodarch(rootPath) : [];
  if (swept.length > 0) console.warn(sweptWarning(swept));

  console.log(reportLines(facts).join("\n"));
  // Un mapa vacío no es un análisis correcto: se dice con código de error para
  // que un script no crea que ha mapeado un repo de Python.
  return result.files === 0 ? 1 : 0;
}

/**
 * El aviso de la limpieza: qué se fue y por qué.
 *
 * Lleva los nombres porque el que lo lee tiene que poder recuperar lo que
 * hubiera dentro: la carpeta no se escribe a mano.
 */
function sweptWarning(removed: readonly string[]): string {
  const list = removed.join(", ");
  const what = removed.length === 1 ? "entrada" : "entradas";
  return `aviso: ${CODARCH_DIR}/ es del producto, no un cajón: se borraron ${removed.length} ${what} que no reconoce (${list})`;
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
  const snapshotPath = path.join(outDirectory, SNAPSHOT_FILE);
  try {
    // El estado es local: si `.codarch/` nace aquí, se ignora en el repo. Si
    // ya existía (o el usuario quitó la línea), no se toca el `.gitignore`
    // (ADR 0050).
    if (outDirectory === codarchDir(rootPath)) ensureStateIgnored(rootPath);
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

/** Lo que pasó con el lint en esta pasada. */
type LintMeasure =
  | { kind: "measured"; path: string; artifact: LintArtifact }
  | { kind: "none" }
  | { kind: "failed"; error: string }
  | { kind: "skipped" };

/**
 * Mide el lint que declara el proyecto y lo escribe junto al snapshot.
 *
 * Falla blando: el análisis ya está escrito y un linter que no está o revienta
 * no puede tirarlo. `runProjectLint` devuelve `null` cuando el repo no declara
 * ninguna herramienta, que no es un fallo: es que no hay lint que medir.
 */
async function measureLint(
  rootPath: string,
  outDirectory: string,
  cc: CcJson,
  run?: LintProcessRunner
): Promise<LintMeasure> {
  let measured;
  try {
    measured = await runProjectLint(rootPath, {
      out: outDirectory,
      tree: cc.meta.checksum ?? "",
      ...(run ? { run } : {})
    });
  } catch (error) {
    return { kind: "failed", error: (error as Error).message };
  }
  if (!measured) return { kind: "none" };
  if (!measured.artifact || !measured.path) {
    const reason = measured.runs.find((entry) => !entry.ok)?.error;
    return {
      kind: "failed",
      error: reason ?? "ninguna herramienta respondió"
    };
  }
  return {
    kind: "measured",
    path: measured.path,
    artifact: measured.artifact
  };
}

/** Lo que necesita el resumen para contar la pasada. */
interface ReportInput {
  root: string;
  rootPath: string;
  outDirectory: string;
  snapshotPath: string;
  restPath: string | null;
  lint: LintMeasure;
  cc: CcJson;
  result: Analysis;
  cache: ParseCache;
  reused: Reused;
  scopePaths: string[];
  history: boolean;
}

/**
 * Deja escritos los artefactos de la pasada y devuelve lo que se cuenta.
 *
 * Las tres escrituras que colgaban del resumen —la caché de parseo, el registro
 * de alcances y la foto del historial— viven aquí: el formateador recibe los
 * números hechos y no toca el disco (`analyze-report.ts`).
 */
function collectReport(input: ReportInput): ReportFacts {
  const { rootPath, outDirectory, result, reused } = input;
  return {
    rootPath,
    snapshot: {
      path: input.snapshotPath,
      bytes: fileBytes(input.snapshotPath)
    },
    rest: restFacts(input.restPath, result),
    lint: lintFacts(input.lint),
    structure: {
      files: result.files,
      folders: result.folders,
      edges: result.edges,
      cycles: result.cycles.length
    },
    imports: {
      external: result.externalImports,
      builtin: result.builtinImports,
      typeOnly: result.typeOnlyImports,
      unresolved: result.unresolvedImports
    },
    migration: {
      languages: Object.entries(result.migration.languages).map(
        ([language, stats]) => [language, stats?.rloc ?? 0] as [string, number]
      ),
      bridges: result.migration.bridgeFiles,
      ffi: result.migration.ffiEdges,
      debt: result.migration.migrationDebt
    },
    parse: parseFacts(outDirectory, rootPath, input.cache, result, reused),
    scopes: scopesFacts(rootPath, outDirectory, input.scopePaths),
    durationMs: result.durationMs,
    history: input.history ? historyFacts(input.root, input.cc) : null,
    churn: {
      enabled: result.git.enabled,
      commits: result.git.commits,
      authors: result.git.authors,
      shallow: result.git.shallow,
      files: result.files
    },
    warnings: result.warnings,
    unresolved: result.unresolved
  };
}

/** Los bytes de un fichero que se acaba de escribir. */
function fileBytes(file: string): number {
  return Buffer.byteLength(fs.readFileSync(file), "utf8");
}

/** El mapa del resto, si esta pasada lo escribió (ADR 0093). */
function restFacts(
  restPath: string | null,
  result: Analysis
): ReportFacts["rest"] {
  if (!restPath) return null;
  return {
    path: restPath,
    bytes: fileBytes(restPath),
    files: result.restFiles,
    links: result.rest?.lenses?.dependency?.edges?.length ?? 0
  };
}

/** El lint, con su cobertura si la herramienta la dio (ADR 0098). */
function lintFacts(lint: LintMeasure): LintLine {
  if (lint.kind !== "measured") return lint;
  const totals = lintTotals(lint.artifact);
  const measured = lint.artifact.summary.measured;
  return {
    kind: "measured",
    path: lint.path,
    bytes: fileBytes(lint.path),
    totals: totals
      ? {
          errors: totals.errors,
          warnings: totals.warnings,
          info: totals.info,
          files: totals.files
        }
      : null,
    ...(measured === undefined ? {} : { measured })
  };
}

/** La caché de parseo de esta pasada, para el análisis que venga por encima. */
function parseFacts(
  outDirectory: string,
  rootPath: string,
  cache: ParseCache,
  result: Analysis,
  reused: Reused
): ReportFacts["parse"] {
  try {
    writeParseCache(outDirectory, rootPath, cache);
    return {
      hits: result.cache.hits,
      misses: result.cache.misses,
      fromScopes: reused.entries
    };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

/**
 * Los alcances de debajo (ADR 0089).
 *
 * Sin alcances y sin registro, no se crea un fichero vacío; con registro, se
 * reescribe aunque ya no quede ninguno, para no dejar fantasmas.
 */
function scopesFacts(
  rootPath: string,
  outDirectory: string,
  scopePaths: readonly string[]
): ReportFacts["scopes"] {
  try {
    const nested: ScopeEntry[] = readScopes(rootPath, scopePaths);
    const stale = nested.filter((scope) =>
      scopeHasNewerFiles(rootPath, scope.path)
    ).length;
    if (nested.length > 0 || fs.existsSync(scopesFile(outDirectory))) {
      writeScopeRegister(outDirectory, nested);
    }
    return { nested: nested.length, stale };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

/** La foto de esta pasada en el historial, si se pidió. */
function historyFacts(
  root: string,
  cc: CcJson
): NonNullable<ReportFacts["history"]> {
  try {
    const saved = saveHistory(path.resolve(root), cc, new Date());
    return saved.saved ? { saved: saved.file } : { unchanged: true };
  } catch (error) {
    return { error: (error as Error).message };
  }
}
