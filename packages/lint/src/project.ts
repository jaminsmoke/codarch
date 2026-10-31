import fs from "node:fs";
import path from "node:path";
import {
  CODARCH_DIR,
  LINT_RULES_FILE,
  codarchDir,
  codarchPath
} from "@codarch/schema";
import type { LintFormat } from "./config";
import type { LintRule, LintSeverity, LintSystem } from "./format";
import { defaultLintRunner, type LintProcessRunner } from "./run";

/**
 * El lint que **tiene** el proyecto (ADR 0096).
 *
 * No se inventa: se busca su configuración y su herramienta instalada. Los
 * sistemas que se pueden leer se ejecutan con el binario del repo; los que no
 * se declaran con su config y el motivo por el que no se miden o no se pueden
 * enumerar sus reglas. Nunca se descarga nada: si la herramienta no está, se
 * dice.
 */

export interface DetectedLintSystem {
  /** `eslint`, `oxlint`, `biome`, `ruff`, `checkstyle`, `go-vet`, `dotnet`… */
  name: string;
  /** La config del repo, relativa y con `/`; `null` si no tiene. */
  config: string | null;
  /** El dialecto que sabemos normalizar; `null` si aún no hay lector. */
  format: LintFormat | null;
  /** El comando de medida con el binario del proyecto, o `null`. */
  command: string | null;
  note?: string;
  /** Un fichero de muestra para resolver reglas. */
  sample?: string | null;
  /** El comando que imprime la config resuelta (ESLint) o el catálogo (Ruff). */
  rulesCommand?: string;
  /** El comando que dice la versión de la herramienta, para cachear su catálogo. */
  versionCommand?: string;
}

const ESLINT_CONFIGS = [
  "eslint.config.js",
  "eslint.config.mjs",
  "eslint.config.cjs",
  "eslint.config.ts",
  "eslint.config.mts",
  "eslint.config.cts",
  ".eslintrc.js",
  ".eslintrc.cjs",
  ".eslintrc.json",
  ".eslintrc.yml",
  ".eslintrc.yaml",
  ".eslintrc"
];

const OXLINT_CONFIGS = ["oxlint.json", ".oxlintrc.json", ".oxlintrc"];

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  CODARCH_DIR,
  "dist",
  "coverage",
  "build",
  "out"
]);

/** Las extensiones que ESLint resuelve con la config del proyecto. */
const SAMPLE_EXTENSIONS = /\.(tsx?|jsx?|mjs|cjs)$/;

/** Un fichero de config no es una muestra: no es lo que el lint mide. */
const CONFIG_FILE = /(^|\/)([^/]+\.config\.[cm]?[jt]s|\.?[^/]*rc\.[cm]?[jt]s)$/;

/**
 * Los sistemas de lint que declara un proyecto.
 *
 * Un sistema entra si tiene configuración propia o si la herramienta está
 * instalada: una config sin herramienta es «declarado y no ejecutable», y se
 * dice en `note` en vez de completarla con una versión que el repo no eligió.
 */
export function detectLintSystems(root: string): DetectedLintSystem[] {
  const systems: DetectedLintSystem[] = [];
  const pkg = readJson(path.join(root, "package.json"));

  const eslintConfig =
    firstExisting(root, ESLINT_CONFIGS) ??
    (isRecord(pkg?.eslintConfig) ? "package.json" : null);
  const eslintBin = "node_modules/eslint/bin/eslint.js";
  if (eslintConfig || exists(root, eslintBin) || dependency(pkg, "eslint")) {
    const installed = exists(root, eslintBin);
    const sample = installed ? findSample(root) : null;
    systems.push({
      name: "eslint",
      config: eslintConfig,
      format: "eslint-json",
      command: installed ? `node ${eslintBin} . --format json` : null,
      ...(installed
        ? {
            sample,
            ...(sample
              ? { rulesCommand: `node ${eslintBin} --print-config ${sample}` }
              : {})
          }
        : {
            note: "el repo declara ESLint, pero su binario no está instalado: no se puede medir"
          })
    });
  }

  const oxlintConfig = firstExisting(root, OXLINT_CONFIGS);
  const oxlintBin = "node_modules/oxlint/bin/oxlint";
  if (oxlintConfig || exists(root, oxlintBin) || dependency(pkg, "oxlint")) {
    const installed = exists(root, oxlintBin);
    systems.push({
      name: "oxlint",
      config: oxlintConfig,
      format: "oxlint-json",
      command: installed ? `node ${oxlintBin} --format json .` : null,
      ...(installed
        ? {}
        : {
            note: "el repo declara oxlint, pero su binario no está instalado: no se puede medir"
          })
    });
  }

  const biomeConfig = firstExisting(root, ["biome.json", "biome.jsonc"]);
  const biomeBin = "node_modules/@biomejs/biome/bin/biome";
  if (biomeConfig || exists(root, biomeBin) || dependency(pkg, "@biomejs/biome")) {
    const installed = exists(root, biomeBin);
    systems.push({
      name: "biome",
      config: biomeConfig,
      format: "biome-json",
      command: installed ? `node ${biomeBin} lint --reporter=json .` : null,
      ...(installed
        ? {}
        : {
            note: "el repo declara Biome, pero su binario no está instalado: no se puede medir"
          })
    });
  }

  const ruffConfig = firstExisting(root, ["ruff.toml", ".ruff.toml"]) ??
    (contains(path.join(root, "pyproject.toml"), "[tool.ruff]") ? "pyproject.toml" : null);
  if (ruffConfig) {
    systems.push({
      name: "ruff",
      config: ruffConfig,
      format: "ruff-json",
      // Ruff no vive en `node_modules`: se lanza el que tenga el PATH, que es
      // el que eligió el proyecto. Si no está, el fallo blando lo dice.
      command: "ruff check --output-format=json .",
      // El catálogo de reglas sale de la versión de Ruff del proyecto, no de
      // una lista nuestra: expande los selectores a reglas de verdad.
      rulesCommand: "ruff rule --all --output-format=json",
      versionCommand: "ruff --version",
      note: "corre el `ruff` del PATH"
    });
  }

  const checkstyleConfig =
    firstExisting(root, ["checkstyle.xml", "config/checkstyle/checkstyle.xml"]) ??
    (contains(path.join(root, "build.gradle"), "checkstyle") ||
    contains(path.join(root, "build.gradle.kts"), "checkstyle")
      ? "build.gradle"
      : null);
  if (checkstyleConfig) {
    // Su CLI necesita el XML: el plugin de Gradle no dice cuál usa.
    const xml = checkstyleConfig.endsWith(".xml") ? checkstyleConfig : null;
    systems.push({
      name: "checkstyle",
      config: checkstyleConfig,
      format: "checkstyle-xml",
      // Como Ruff, Checkstyle no vive en `node_modules`: se lanza el del PATH.
      command: xml ? `checkstyle -c "${xml}" -f xml .` : null,
      ...(xml
        ? { note: "corre el `checkstyle` del PATH" }
        : { note: "el plugin de Gradle no dice qué XML usa: no se puede medir" })
    });
  }

  if (exists(root, "go.mod")) {
    systems.push({
      name: "go-vet",
      config: null,
      format: "govet-text",
      // `go vet` escribe a stderr; se junta en el comando, que es el mismo en
      // las dos cáscaras.
      command: "go vet ./... 2>&1",
      note: "corre el `go vet` del PATH; sus analizadores van con la versión de Go"
    });
  }

  // La solución manda sobre un proyecto suelto: un `.sln` cubre todo el repo.
  const dotnet = firstWithExtension(root, [".sln"]) ??
    firstWithExtension(root, [".csproj"]);
  if (dotnet) {
    systems.push({
      name: "dotnet",
      config: dotnet,
      format: "dotnet-text",
      command: `dotnet format "${dotnet}" analyzers --verify-no-changes --no-restore --severity info 2>&1`,
      note: "corre `dotnet format` con el SDK del PATH; sus reglas van con el SDK y AnalysisLevel"
    });
  }

  return systems;
}

/**
 * Los sistemas con su config y sus reglas activas.
 *
 * ESLint se resuelve de verdad con `--print-config`, que lee la config del
 * proyecto —flat config, plugins y overrides incluidos— en vez de interpretar
 * el fichero a mano. Oxlint se lee de su JSON. Lo que no se pueda enumerar se
 * dice: nunca se rellena con una lista plausible.
 */
export async function describeLintSystems(
  root: string,
  detected: readonly DetectedLintSystem[],
  options: { run?: LintProcessRunner; timeoutMs?: number } = {}
): Promise<LintSystem[]> {
  const run = options.run ?? defaultLintRunner;
  const timeoutMs = options.timeoutMs ?? 30_000;

  const described = await Promise.all(
    detected.map((system) => describeSystem(root, system, run, timeoutMs))
  );
  return described;
}

/** Un lector de sistema: cada herramienta sabe qué se puede enumerar de ella. */
type SystemDescriber = (
  root: string,
  system: DetectedLintSystem,
  base: LintSystem,
  run: LintProcessRunner,
  timeoutMs: number
) => LintSystem | Promise<LintSystem>;

/** Los sistemas con lector de reglas; el resto se queda con su ficha. */
const DESCRIBERS: Record<string, SystemDescriber> = {
  eslint: describeEslint,
  oxlint: describeOxlint,
  biome: describeBiome,
  ruff: describeRuff,
  checkstyle: describeCheckstyle
};

/** La ficha de partida: nombre, config y el motivo que dio el detector. */
function systemBase(system: DetectedLintSystem): LintSystem {
  return {
    name: system.name,
    config: system.config,
    ...(system.note ? { note: system.note } : {})
  };
}

/**
 * Un sistema con sus reglas activas.
 *
 * Se despacha a su lector; si no lo tiene —`go vet`, `dotnet format`—, se
 * devuelve la ficha tal cual: no se inventan reglas que no hemos leído.
 */
async function describeSystem(
  root: string,
  system: DetectedLintSystem,
  run: LintProcessRunner,
  timeoutMs: number
): Promise<LintSystem> {
  const base = systemBase(system);
  const describe = DESCRIBERS[system.name];
  if (!describe) return base;
  return describe(root, system, base, run, timeoutMs);
}

/** ESLint se resuelve con `--print-config`, sobre un fichero de muestra. */
async function describeEslint(
  root: string,
  system: DetectedLintSystem,
  base: LintSystem,
  run: LintProcessRunner,
  timeoutMs: number
): Promise<LintSystem> {
  if (!system.rulesCommand || !system.sample) {
    return {
      ...base,
      note: base.note ?? "sin fichero de muestra para resolver sus reglas"
    };
  }
  try {
    const output = await run(system.rulesCommand, root, timeoutMs);
    const config = JSON.parse(output.stdout) as unknown;
    const rules = parseEslintConfigRules(config);
    return rules.length > 0
      ? { ...base, rules }
      : { ...base, note: base.note ?? "su config no activa ninguna regla" };
  } catch (error) {
    return {
      ...base,
      note: `${base.note ? `${base.note}. ` : ""}no se pudieron enumerar sus reglas: ${
        firstLine((error as Error).message) || "falló --print-config"
      }`
    };
  }
}

/** Oxlint se lee de su JSON; sin config corre sus correcciones por defecto. */
function describeOxlint(
  root: string,
  system: DetectedLintSystem,
  base: LintSystem
): LintSystem {
  if (!system.config) {
    return {
      ...base,
      note: base.note ?? "corre sus correcciones por defecto; no se enumeran"
    };
  }
  const config = readJson(path.join(root, system.config));
  const rules = parseOxlintConfigRules(config);
  if (rules.length > 0) return { ...base, rules };
  return {
    ...base,
    note:
      base.note ??
      "sin reglas en su config: corre sus correcciones por defecto"
  };
}

/** Biome se lee de su JSON; lo recomendado se dice, no se enumera. */
function describeBiome(
  root: string,
  system: DetectedLintSystem,
  base: LintSystem
): LintSystem {
  if (!system.config) {
    return {
      ...base,
      note: joinNote(
        base.note,
        "corre las recomendadas por defecto; no se enumeran"
      )
    };
  }
  const config = readJson(path.join(root, system.config));
  if (!config) {
    return {
      ...base,
      note: joinNote(
        base.note,
        `su config (${system.config}) no es JSON: sus reglas no se enumeran`
      )
    };
  }
  const rules = parseBiomeConfigRules(config);
  const recommended = biomeUsesRecommended(config);
  const note = recommended
    ? "las reglas recomendadas de su config no se enumeran"
    : rules.length === 0
      ? "su config no activa ninguna regla"
      : null;
  const joined = joinNote(base.note, note);
  return {
    ...base,
    ...(rules.length > 0 ? { rules } : {}),
    ...(joined ? { note: joined } : {})
  };
}

/** Ruff: sus selectores se expanden con el catálogo de su propia versión. */
async function describeRuff(
  root: string,
  system: DetectedLintSystem,
  base: LintSystem,
  run: LintProcessRunner,
  timeoutMs: number
): Promise<LintSystem> {
  if (!system.config) return base;

  const text = readText(path.join(root, system.config));
  if (text === null) {
    return { ...base, note: joinNote(base.note, "no se pudo leer su config") };
  }
  const options = { pyproject: system.config === "pyproject.toml" };
  const selection = parseRuffSelectors(text, options);
  const selectors = parseRuffConfigRules(text, options);
  if (selectors.length === 0) {
    return {
      ...base,
      note: joinNote(
        base.note,
        "sin `select` en su config: corren las reglas por defecto; no se enumeran"
      )
    };
  }

  if (!system.rulesCommand) {
    return {
      ...base,
      rules: selectors,
      note: joinNote(
        base.note,
        "son selectores de su config: cada uno puede agrupar varias reglas"
      )
    };
  }

  // El catálogo lo da el propio Ruff del proyecto: expandir prefijos a mano
  // exigiría una lista de reglas por versión que envejecería sola. Se guarda
  // en `.codarch/` y solo se vuelve a pedir cuando cambia la versión.
  const version = system.versionCommand
    ? await readCommandLine(run, system.versionCommand, root, timeoutMs)
    : null;
  const cached = version ? readRuffCatalog(root, version) : null;
  if (cached) {
    const rules = expandRuffSelectors(selection, cached);
    return {
      ...base,
      ...(rules.length > 0 ? { rules } : {}),
      note: joinNote(base.note, RUFF_CATALOG_NOTE)
    };
  }

  try {
    const output = await run(system.rulesCommand, root, timeoutMs);
    const catalog = parseRuffRuleCatalog(JSON.parse(output.stdout));
    if (version) writeRuffCatalog(root, version, catalog);
    const rules = expandRuffSelectors(selection, catalog);
    return {
      ...base,
      ...(rules.length > 0 ? { rules } : {}),
      note: joinNote(base.note, RUFF_CATALOG_NOTE)
    };
  } catch (error) {
    return {
      ...base,
      rules: selectors,
      note: joinNote(
        base.note,
        `sin el catálogo de reglas de Ruff (${
          firstLine((error as Error).message) || "falló `ruff rule`"
        }): se listan sus selectores`
      )
    };
  }
}

/** Checkstyle: los `<module>` de su XML son sus reglas activas. */
function describeCheckstyle(
  root: string,
  system: DetectedLintSystem,
  base: LintSystem
): LintSystem {
  if (!system.config || !system.config.endsWith(".xml")) return base;
  const xml = readText(path.join(root, system.config));
  if (xml === null) {
    return { ...base, note: joinNote(base.note, "no se pudo leer su config") };
  }
  const rules = parseCheckstyleConfigRules(xml);
  if (rules.length === 0) {
    return {
      ...base,
      note: joinNote(base.note, "su config no activa ningún módulo")
    };
  }
  return {
    ...base,
    rules,
    note: joinNote(
      base.note,
      "módulos de su config; la severidad la da cada hallazgo"
    )
  };
}

/**
 * Los módulos que activa la config de Checkstyle.
 *
 * Un `<module name="…">` es una regla, salvo los contenedores (`Checker`,
 * `TreeWalker`) y los filtros de supresión, que no miden nada. La config no
 * pone severidad a cada módulo; la trae el hallazgo.
 */
export function parseCheckstyleConfigRules(xml: string): LintRule[] {
  const containers = new Set([
    "Checker",
    "TreeWalker",
    "BeforeExecutionExclusionFileFilter",
    "SuppressionFilter",
    "SuppressionCommentFilter",
    "SuppressionXpathFilter",
    "SuppressionSingleFilter"
  ]);
  const names = new Set<string>();
  for (const match of xml.matchAll(/<module\s+name="([^"]+)"/g)) {
    const name = (match[1] ?? "").trim();
    if (name && !containers.has(name)) names.add(name);
  }
  return sortRules(
    [...names]
      .sort()
      .map((id) => ({ id, severity: "error" as LintSeverity }))
  );
}

/**
 * Las reglas que **escribe** la config de Biome.
 *
 * `style.useConst: "error"` da `style/useConst`; `off` no entra. Las de
 * `recommended` dependen de la versión de Biome y no se listan: eso se dice en
 * la nota del sistema, no se rellena con una lista que envejece.
 */
export function parseBiomeConfigRules(config: unknown): LintRule[] {
  if (!isRecord(config)) return [];
  const linter = isRecord(config.linter) ? config.linter : null;
  if (!linter || linter.enabled === false) return [];
  const rules = isRecord(linter.rules) ? linter.rules : null;
  if (!rules) return [];

  const active: LintRule[] = [];
  for (const [group, value] of Object.entries(rules)) {
    // `recommended` y `all` son interruptores, no reglas.
    if (group === "recommended" || group === "all") continue;
    const direct = biomeLevel(value);
    if (direct) {
      active.push({ id: group, severity: direct });
      continue;
    }
    if (!isRecord(value)) continue;
    for (const [rule, level] of Object.entries(value)) {
      const severity = biomeLevel(level);
      if (severity) active.push({ id: `${group}/${rule}`, severity });
    }
  }
  return sortRules(active);
}

/** Si la config deja a Biome con sus recomendadas (el defecto es que sí). */
export function biomeUsesRecommended(config: unknown): boolean {
  if (!isRecord(config)) return false;
  const linter = isRecord(config.linter) ? config.linter : null;
  if (linter?.enabled === false) return false;
  const rules = linter && isRecord(linter.rules) ? linter.rules : null;
  return !rules || rules.recommended !== false;
}

/**
 * Los selectores de Ruff de su config: `select` y `extend-select`, menos los
 * que `ignore` y `extend-ignore` apagan por prefijo.
 *
 * Son selectores, no reglas sueltas: `E` agrupa decenas y `E501` es una. Se
 * listan tal cual porque expandirlos exige el catálogo de la versión de Ruff
 * del proyecto, y eso no se adivina. Se lee la tabla `[lint]` de `ruff.toml`
 * y `[tool.ruff.lint]` de `pyproject.toml`; el resto de TOML no se interpreta.
 */
export function parseRuffConfigRules(
  text: string,
  options: { pyproject?: boolean } = {}
): LintRule[] {
  const { select, ignore } = parseRuffSelectors(text, options);
  const active = select.filter(
    (code) => !ignore.some((prefix) => code.startsWith(prefix))
  );
  return sortRules(
    active.map((id) => ({ id, severity: "error" as LintSeverity }))
  );
}

/** Los selectores de Ruff, tal y como los escribe su config. */
export interface RuffSelection {
  select: string[];
  ignore: string[];
}

/** Los selectores de `select` y `extend-select`, y los de `ignore` y `extend-ignore`. */
export function parseRuffSelectors(
  text: string,
  options: { pyproject?: boolean } = {}
): RuffSelection {
  const table = options.pyproject ? "tool.ruff.lint" : "lint";
  const codes = (key: string): string[] =>
    tomlStringArray(text, table, key)
      .map((code) => code.trim())
      .filter(Boolean);

  return {
    select: [...new Set([...codes("select"), ...codes("extend-select")])],
    ignore: [...new Set([...codes("ignore"), ...codes("extend-ignore")])]
  };
}

/** El catálogo de reglas de `ruff rule --all --output-format=json`. */
export function parseRuffRuleCatalog(raw: unknown): { code: string }[] {
  if (!Array.isArray(raw)) return [];
  const codes = new Set<string>();
  for (const item of raw) {
    if (isRecord(item) && typeof item.code === "string" && item.code.trim()) {
      codes.add(item.code.trim());
    }
  }
  return [...codes].sort().map((code) => ({ code }));
}

/**
 * Expande los selectores a las reglas del catálogo de Ruff.
 *
 * Ruff decide por prefijo y por especificidad: gana el selector más concreto y,
 * si empatan, el ignorado. `select = ["E"], ignore = ["E501"]` deja fuera
 * E501; `select = ["E501"], ignore = ["E"]` la deja dentro. `ALL` vale por
 * cualquier regla.
 */
export function expandRuffSelectors(
  selection: RuffSelection,
  catalog: readonly { code: string }[]
): LintRule[] {
  const rules = catalog
    .filter((rule) => isRuffRuleSelected(rule.code, selection))
    .map((rule) => ({ id: rule.code, severity: "error" as LintSeverity }));
  return sortRules(rules);
}

function isRuffRuleSelected(
  code: string,
  selection: RuffSelection
): boolean {
  const selected = selectorSpecificity(code, selection.select);
  if (selected === 0) return false;
  const ignored = selectorSpecificity(code, selection.ignore);
  return ignored === 0 || selected > ignored;
}

/** La longitud del prefijo más concreto que casa; `ALL` casa con todo. */
function selectorSpecificity(
  code: string,
  selectors: readonly string[]
): number {
  const upper = code.toUpperCase();
  let best = 0;
  for (const selector of selectors) {
    const text = selector.trim().toUpperCase();
    if (!text) continue;
    if (text === "ALL") {
      best = Math.max(best, 1);
    } else if (upper.startsWith(text)) {
      best = Math.max(best, text.length);
    }
  }
  return best;
}

/** Las reglas activas de la config resuelta por `eslint --print-config`. */
export function parseEslintConfigRules(config: unknown): LintRule[] {
  if (!isRecord(config) || !isRecord(config.rules)) return [];
  return collectRules(config.rules, eslintSeverity);
}

/** Las reglas activas del JSON de oxlint. */
export function parseOxlintConfigRules(config: unknown): LintRule[] {
  if (!isRecord(config) || !isRecord(config.rules)) return [];
  return collectRules(config.rules, oxlintSeverity);
}

function collectRules(
  input: Record<string, unknown>,
  severityOf: (value: unknown) => LintSeverity | null
): LintRule[] {
  const rules: LintRule[] = [];
  for (const [id, value] of Object.entries(input)) {
    const severity = severityOf(value);
    if (severity) rules.push({ id, severity });
  }
  return sortRules(rules);
}

/** La nota de Ruff cuando sus selectores se han expandido. */
const RUFF_CATALOG_NOTE = "sus selectores de config, expandidos con el catálogo de `ruff rule`";

/**
 * La caché del catálogo de Ruff, en `.codarch/`.
 *
 * Es una optimización, no parte del artefacto: no cambia lo que se escribe ni
 * el checksum. Se llavea por la versión de Ruff, así que actualizar la
 * herramienta la invalida sola.
 */


interface RuffCatalogCache {
  version: string;
  rules: string[];
}

/** La línea que escribe un comando, o `null` si falla o no dice nada. */
async function readCommandLine(
  run: LintProcessRunner,
  command: string,
  root: string,
  timeoutMs: number
): Promise<string | null> {
  try {
    const output = await run(command, root, timeoutMs);
    return output.stdout.trim() || null;
  } catch {
    return null;
  }
}

function lintCachePath(root: string): string {
  return codarchPath(root, LINT_RULES_FILE);
}

/** El catálogo guardado para esa versión de Ruff, si lo hay. */
function readRuffCatalog(
  root: string,
  version: string
): { code: string }[] | null {
  const raw = readJson(lintCachePath(root));
  const ruff = raw && isRecord(raw.ruff) ? raw.ruff : null;
  if (!ruff || ruff.version !== version || !Array.isArray(ruff.rules)) {
    return null;
  }
  const rules = ruff.rules.filter(
    (code): code is string => typeof code === "string" && code.length > 0
  );
  return rules.length > 0 ? rules.map((code) => ({ code })) : null;
}

/** Guarda el catálogo, solo si `.codarch/` ya existe: la caché no crea estado. */
function writeRuffCatalog(
  root: string,
  version: string,
  catalog: readonly { code: string }[]
): void {
  const directory = codarchDir(root);
  try {
    if (!fs.existsSync(directory)) return;
    const file = lintCachePath(root);
    const current = readJson(file);
    const cache: RuffCatalogCache = {
      version,
      rules: catalog.map((rule) => rule.code)
    };
    const next = { ...(isRecord(current) ? current : {}), ruff: cache };
    fs.writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  } catch {
    // La caché es una optimización: sin ella se pide el catálogo y ya está.
  }
}

/** Las reglas por nombre: el orden no depende de cómo venga la config. */
function sortRules(rules: LintRule[]): LintRule[] {
  return rules.sort((left, right) =>
    left.id < right.id ? -1 : left.id > right.id ? 1 : 0
  );
}

/** El nivel de Biome, que puede venir suelto o como `{ level }`. */
function biomeLevel(value: unknown): LintSeverity | null {
  const level = isRecord(value) ? value.level : value;
  if (level === "error") return "error";
  if (level === "warn" || level === "warning") return "warn";
  if (level === "info" || level === "information") return "info";
  return null;
}

/** Dos motivos en una nota: el segundo empieza frase. */
function joinNote(left: string | undefined, right: string | null): string {
  const first = typeof left === "string" && left.length > 0 ? left : "";
  const second = typeof right === "string" && right.length > 0 ? right : "";
  if (!first) return second;
  if (!second) return first;
  return `${first}. ${second[0]?.toUpperCase()}${second.slice(1)}`;
}

/** Un fichero de texto, o `null` si no se puede leer. */
function readText(file: string): string | null {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

/** El cuerpo de una tabla TOML, sin sus cabeceras ni comentarios. */
function tomlTable(text: string, table: string): string {
  const kept: string[] = [];
  let inside = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = stripTomlComment(raw);
    const header = /^\s*\[([^\]]+)\]\s*$/.exec(line);
    if (header) {
      inside = header[1]?.trim() === table;
      continue;
    }
    if (inside) kept.push(line);
  }
  return kept.join("\n");
}

/** Una lista de cadenas de una tabla TOML, en una línea o en varias. */
function tomlStringArray(text: string, table: string, key: string): string[] {
  const body = tomlTable(text, table);
  const name = escapeRegExp(key);
  const start = new RegExp(`(?:^|\\n)\\s*${name}\\s*=\\s*\\[`).exec(body);
  if (start) {
    const from = start.index + start[0].length;
    const end = body.indexOf("]", from);
    const inside = end === -1 ? body.slice(from) : body.slice(from, end);
    return quotedStrings(inside);
  }
  const scalar = new RegExp(
    `(?:^|\\n)\\s*${name}\\s*=\\s*("([^"]*)"|'([^']*)')`
  ).exec(body);
  const value = scalar?.[2] ?? scalar?.[3];
  return value ? [value] : [];
}

/** Las cadenas entre comillas de un trozo de TOML. */
function quotedStrings(text: string): string[] {
  const values: string[] = [];
  for (const match of text.matchAll(/"([^"]*)"|'([^']*)'/g)) {
    const value = match[1] ?? match[2];
    if (value) values.push(value);
  }
  return values;
}

/** El TOML sin su comentario, respetando las `#` dentro de cadenas. */
function stripTomlComment(line: string): string {
  let quote: string | null = null;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quote) {
      if (char === "\\") {
        index += 1;
      } else if (char === quote) {
        quote = null;
      }
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === "#") {
      return line.slice(0, index);
    }
  }
  return line;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function eslintSeverity(value: unknown): LintSeverity | null {
  const first = Array.isArray(value) ? value[0] : value;
  if (first === 2 || first === "error") return "error";
  if (first === 1 || first === "warn") return "warn";
  return null;
}

function oxlintSeverity(value: unknown): LintSeverity | null {
  const first = Array.isArray(value) ? value[0] : value;
  if (first === "error" || first === "deny") return "error";
  if (first === "warn") return "warn";
  return null;
}

/** El primer fichero TS/JS del repo, en orden estable, para `--print-config`. */
function findSample(root: string): string | null {
  const queue = [""];
  let seen = 0;
  // TypeScript primero: es el lenguaje del producto y el que más reglas mueve.
  let fallback: string | null = null;
  while (queue.length > 0 && seen < 400) {
    const directory = queue.shift() as string;
    let entries: fs.Dirent[];
    try {
      entries = fs
        .readdirSync(path.join(root, directory), { withFileTypes: true })
        .sort((left, right) => (left.name < right.name ? -1 : 1));
    } catch {
      continue;
    }
    for (const entry of entries) {
      seen += 1;
      if (seen > 400) break;
      const relative = directory === "" ? entry.name : `${directory}/${entry.name}`;
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith(".")) {
          queue.push(relative);
        }
        continue;
      }
      if (
        entry.isFile() &&
        SAMPLE_EXTENSIONS.test(entry.name) &&
        !CONFIG_FILE.test(relative)
      ) {
        if (/\.tsx?$/.test(entry.name)) return relative;
        fallback ??= relative;
      }
    }
  }
  return fallback;
}

/** El primer fichero de la raíz con una de las extensiones dadas. */
function firstWithExtension(root: string, extensions: readonly string[]): string | null {
  try {
    const names = fs
      .readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .sort();
    return (
      names.find((name) =>
        extensions.some((extension) => name.endsWith(extension))
      ) ?? null
    );
  } catch {
    return null;
  }
}

function firstExisting(root: string, candidates: readonly string[]): string | null {
  return candidates.find((candidate) => exists(root, candidate)) ?? null;
}

function exists(root: string, relative: string): boolean {
  return fs.existsSync(path.join(root, relative));
}

function contains(file: string, needle: string): boolean {
  try {
    return fs.readFileSync(file, "utf8").includes(needle);
  } catch {
    return false;
  }
}

function readJson(file: string): Record<string, unknown> | null {
  try {
    const value = JSON.parse(fs.readFileSync(file, "utf8")) as unknown;
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

/** Si el package.json declara la dependencia (da igual en qué bloque). */
function dependency(pkg: Record<string, unknown> | null, name: string): boolean {
  if (!pkg) return false;
  for (const key of ["dependencies", "devDependencies", "peerDependencies"]) {
    const block = pkg[key];
    if (isRecord(block) && typeof block[name] === "string") return true;
  }
  return false;
}

function firstLine(text: string): string {
  return (text ?? "").trim().split(/\r?\n/)[0]?.slice(0, 160) ?? "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
