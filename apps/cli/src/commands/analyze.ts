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
  writeParseCache
} from "@codarch/parsers";
import { CcJsonError, parseCcJson } from "@codarch/schema";
import { loadProjectIgnore } from "../config";
import { directoryProblem, formatBytes } from "../io";
import { saveHistory } from "@codarch/schema";
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

const numberFormat = new Intl.NumberFormat("es-ES");

function num(value: number): string {
  return numberFormat.format(value);
}

function field(label: string, value: string): string {
  return `  ${label.padEnd(12)} ${value}`;
}

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

  let ignore = options.ignore ?? [];

  try {
    const fromConfig = loadProjectIgnore(root, {
      config: options.config,
      noConfig: options.noConfig
    });
    // El `--ignore` puntual suma; no reemplaza la política del repo.
    ignore = [...fromConfig, ...ignore];
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(`configuración inválida: ${error.message}`);
      return 1;
    }
    throw error;
  }

  const rootPath = path.resolve(root);
  const outDirectory = path.resolve(
    options.out ?? path.join(rootPath, ".codarch")
  );
  // El parseo de esta pasada: el de la vez anterior y el de los alcances de
  // debajo. Se lee hacia abajo y nunca hacia arriba (ADR 0089): una carpeta que
  // el padre no mira no es un alcance suyo, y su caché no se usa.
  const cache = new ParseCache();
  let nested: ScopeEntry[] = [];
  let reused = { scopes: 0, entries: 0 };
  let scopePaths: string[] = [];
  try {
    loadOwnParseCache(cache, rootPath, outDirectory);
    scopePaths = discoverScopePaths(rootPath, ignore);
    reused = loadScopeParseCaches(cache, rootPath, scopePaths);
  } catch {
    // Sin alcances legibles se analiza entero: la caché es solo tiempo.
  }

  let result;

  try {
    result = analyzeRepository(root, {
      ignore,
      projectName: options.projectName,
      git: options.git,
      cache
    });
  } catch (error) {
    console.error(`no se pudo analizar ${root}: ${(error as Error).message}`);
    return 1;
  }

  // Un repo que no es TS/JS da un snapshot vacío y nadie se entera: se dice.
  if (result.files === 0) {
    console.warn(
      `aviso: no hay ningún fichero TypeScript/JavaScript en ${root}; el snapshot sale vacío`
    );
    console.warn(
      "  CodArch v1 dibuja TS/JS; otro lenguaje cuenta en la lente de migración, no en el mapa."
    );
  }

  let cc;
  try {
    cc = parseCcJson(result.snapshot);
  } catch (error) {
    if (error instanceof CcJsonError) {
      console.error(`el snapshot generado no es cc.json válido: ${error.message}`);
      return 1;
    }
    throw error;
  }

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
    fs.writeFileSync(
      snapshotPath,
      `${JSON.stringify(cc, null, 2)}\n`,
      "utf8"
    );
  } catch (error) {
    console.error(
      `no se pudo escribir ${snapshotPath}: ${(error as Error).message}`
    );
    return 1;
  }

  const snapshotBytes = Buffer.byteLength(
    fs.readFileSync(snapshotPath),
    "utf8"
  );

  const lines: string[] = [];
  lines.push("");
  lines.push("  CodArch · análisis");
  lines.push("");
  lines.push(field("raíz", path.resolve(root)));
  lines.push(field("snapshot", `${snapshotPath} (${formatBytes(snapshotBytes)})`));
  lines.push(
    field(
      "estructura",
      `${num(result.files)} ficheros · ${num(result.folders)} carpetas · ${num(
        result.edges
      )} aristas · ${num(result.cycles.length)} ciclos`
    )
  );
  lines.push(
    field(
      "imports",
      `${num(result.externalImports)} externos · ${num(
        result.builtinImports
      )} builtins · ${num(result.typeOnlyImports)} type-only · ${num(
        result.unresolvedImports
      )} sin resolver`
    )
  );
  const migrationLanguages = Object.entries(result.migration.languages)
    .map(([language, stats]) => `${language} ${num(stats?.rloc ?? 0)}`)
    .join(" · ");
  lines.push(
    field(
      "migración",
      `${migrationLanguages || "—"} · ${num(
        result.migration.bridgeFiles
      )} puentes · ${num(result.migration.ffiEdges)} FFI · deuda ${num(
        result.migration.migrationDebt
      )}`
    )
  );
  // La caché de parseo de esta pasada, para el análisis que venga por encima.
  try {
    writeParseCache(outDirectory, rootPath, cache);
    lines.push(
      field(
        "parseo",
        `${num(result.cache.hits)} reutilizados · ${num(
          result.cache.misses
        )} parseados${
          reused.entries > 0
            ? ` · ${num(reused.entries)} de alcances de debajo`
            : ""
        }`
      )
    );
  } catch (error) {
    lines.push(
      field("parseo", `no se pudo guardar la caché: ${(error as Error).message}`)
    );
  }

  // El padre apunta qué alcances tiene por debajo (ADR 0089). Solo se lee
  // hacia abajo: el `.codarch/` del hijo lo escribe quien analiza el hijo.
  try {
    nested = readScopes(rootPath, scopePaths);
    const stale = nested.filter((scope) =>
      scopeHasNewerFiles(rootPath, scope.path)
    ).length;
    // Sin alcances y sin registro, no se crea un fichero vacío; con registro,
    // se reescribe aunque ya no quede ninguno, para no dejar fantasmas.
    if (nested.length > 0 || fs.existsSync(scopesFile(outDirectory))) {
      writeScopeRegister(outDirectory, nested);
    }
    lines.push(
      field(
        "alcances",
        nested.length === 0
          ? "—"
          : `${num(nested.length)} anidados${
              stale > 0 ? ` · ${num(stale)} con ficheros más nuevos` : ""
            }`
      )
    );
  } catch (error) {
    lines.push(
      field("alcances", `no se pudo registrar: ${(error as Error).message}`)
    );
  }
  lines.push(field("tiempo", `${num(result.durationMs)} ms`));
  if (options.history) {
    try {
      const saved = saveHistory(path.resolve(root), cc, new Date());
      lines.push(
        field(
          "historial",
          saved.saved
            ? `guardado ${saved.file}`
            : "sin cambios; ya había una foto igual"
        )
      );
    } catch (error) {
      lines.push(field("historial", `no se pudo guardar: ${(error as Error).message}`));
    }
  }
  lines.push(
    field(
      "churn",
      result.git.enabled
        ? `${num(result.git.commits)} commits · ${num(
            result.git.authors
          )} autores${result.git.shallow ? " · shallow" : ""}`
        : // Sin ficheros TS/JS no hay a qué atribuir commits: decir «sin git»
          // en un repo git era mentira.
          result.files === 0
          ? "sin ficheros TS/JS; se omite churn"
          : "sin git; se omite churn"
    )
  );

  for (const warning of result.warnings.slice(0, 10)) {
    lines.push(field("aviso", warning));
  }
  if (result.warnings.length > 10) {
    lines.push(field("aviso", `y ${num(result.warnings.length - 10)} más`));
  }

  for (const issue of result.unresolved.slice(0, 5)) {
    lines.push(
      field(
        "sin resolver",
        `${issue.file}:${issue.line} ${issue.specifier} (${issue.reason})`
      )
    );
  }
  if (result.unresolved.length > 5) {
    lines.push(
      field("sin resolver", `y ${num(result.unresolved.length - 5)} más`)
    );
  }

  lines.push("");
  console.log(lines.join("\n"));
  // Un mapa vacío no es un análisis correcto: se dice con código de error para
  // que un script no crea que ha mapeado un repo de Python.
  return result.files === 0 ? 1 : 0;
}
