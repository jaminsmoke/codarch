import fs from "node:fs";
import path from "node:path";
import { builtinModules } from "node:module";
import ts from "typescript";
import type { WalkedFile } from "./walk";

const SOURCE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".d.ts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs"
] as const;

const PACKAGE_MAIN_FIELDS = ["types", "module", "main"] as const;

const WORKSPACE_SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  ".codarch",
  "dist",
  "build",
  "coverage",
  ".next",
  "out",
  "target"
]);

const MAX_WORKSPACE_DEPTH = 8;
const MAX_RESOLVE_DEPTH = 8;

const BUILTINS = new Set(
  builtinModules.flatMap((name) => [name, `node:${name}`])
);

export type ResolveResult =
  | { kind: "internal"; file: WalkedFile }
  | { kind: "external"; specifier: string; builtin: boolean }
  | { kind: "unresolved"; specifier: string; reason: string };

interface WorkspacePackage {
  name: string;
  dir: string;
  json: Record<string, unknown>;
}

interface AliasMatcher {
  prefix: string;
  suffix: string;
  wildcard: boolean;
  targets: string[];
}

interface TsConfigInfo {
  configPath: string;
  baseUrl: string;
  aliases: AliasMatcher[];
}

/**
 * Resuelve un specifier de import a un fichero que forma parte del análisis.
 *
 * Nunca devuelve como interno un fichero ignorado por `.gitignore` o fuera del
 * root: para el grafo, un import a algo que no analizamos es externo o no
 * resuelto, no una arista fantasma.
 */
export class ImportResolver {
  readonly warnings: string[] = [];

  private readonly root: string;
  private readonly byPath = new Map<string, WalkedFile>();
  private readonly packageJsonCache = new Map<string, Record<string, unknown> | null>();
  private readonly configCache = new Map<string, TsConfigInfo | null>();
  private readonly workspaces: WorkspacePackage[];

  constructor(rootInput: string, files: readonly WalkedFile[]) {
    this.root = path.resolve(rootInput);
    for (const file of files) this.byPath.set(pathKey(file.absolutePath), file);
    this.workspaces = discoverWorkspaces(this.root, this.warnings);
  }

  resolve(importerPath: string, specifier: string): ResolveResult {
    if (BUILTINS.has(specifier) || specifier.startsWith("node:")) {
      return { kind: "external", specifier, builtin: true };
    }

    if (specifier.startsWith(".") || specifier.startsWith("/")) {
      const base = specifier.startsWith("/")
        ? path.resolve(this.root, `.${specifier}`)
        : path.resolve(path.dirname(path.resolve(importerPath)), specifier);
      const file = this.resolveAsFileOrDirectory(base);
      return file
        ? { kind: "internal", file }
        : { kind: "unresolved", specifier, reason: "no se encontró el fichero" };
    }

    const config = this.configFor(path.dirname(path.resolve(importerPath)));
    if (config) {
      const alias = matchAlias(config.aliases, specifier);
      if (alias) {
        for (const target of alias.targets) {
          const file = this.resolveAsFileOrDirectory(target);
          if (file) return { kind: "internal", file };
        }
        return {
          kind: "unresolved",
          specifier,
          reason: "alias de tsconfig sin fichero fuente"
        };
      }
    }

    const workspace = this.matchWorkspace(specifier);
    if (workspace) {
      const file = this.resolveWorkspace(workspace, specifier);
      return file
        ? { kind: "internal", file }
        : {
            kind: "unresolved",
            specifier,
            reason: "paquete del workspace sin fichero fuente"
          };
    }

    return { kind: "external", specifier, builtin: false };
  }

  private matchWorkspace(specifier: string): WorkspacePackage | null {
    // Más específico primero: `@scope/pkg/sub` antes que `@scope/pkg`.
    for (const workspace of this.workspaces) {
      if (
        specifier === workspace.name ||
        specifier.startsWith(`${workspace.name}/`)
      ) {
        return workspace;
      }
    }
    return null;
  }

  private resolveWorkspace(
    workspace: WorkspacePackage,
    specifier: string
  ): WalkedFile | null {
    const subpath =
      specifier === workspace.name
        ? "."
        : `./${specifier.slice(workspace.name.length + 1)}`;

    for (const target of packageExportTargets(workspace.json.exports, subpath)) {
      const file = this.resolveAsFileOrDirectory(
        path.resolve(workspace.dir, target)
      );
      if (file) return file;
    }

    if (subpath === ".") {
      for (const field of PACKAGE_MAIN_FIELDS) {
        const value = workspace.json[field];
        if (typeof value !== "string") continue;
        const file = this.resolveAsFileOrDirectory(
          path.resolve(workspace.dir, value)
        );
        if (file) return file;
      }
      for (const fallback of [
        "src/index.ts",
        "src/index.tsx",
        "index.ts",
        "index.tsx"
      ]) {
        const file = this.resolveAsFileOrDirectory(
          path.resolve(workspace.dir, fallback)
        );
        if (file) return file;
      }
    } else {
      const file = this.resolveAsFileOrDirectory(
        path.resolve(workspace.dir, subpath.slice(2))
      );
      if (file) return file;
    }

    return null;
  }

  private resolveAsFileOrDirectory(
    base: string,
    depth = 0
  ): WalkedFile | null {
    if (depth > MAX_RESOLVE_DEPTH) return null;

    for (const candidate of fileCandidates(base)) {
      const file = this.byPath.get(pathKey(candidate));
      if (file) return file;
    }

    const pkg = this.readPackageJson(base);
    if (pkg) {
      for (const field of PACKAGE_MAIN_FIELDS) {
        const value = pkg[field];
        if (typeof value !== "string") continue;
        const file = this.resolveAsFileOrDirectory(
          path.resolve(base, value),
          depth + 1
        );
        if (file) return file;
      }
      for (const target of packageExportTargets(pkg.exports, ".")) {
        const file = this.resolveAsFileOrDirectory(
          path.resolve(base, target),
          depth + 1
        );
        if (file) return file;
      }
    }

    for (const candidate of indexCandidates(base)) {
      const file = this.byPath.get(pathKey(candidate));
      if (file) return file;
    }

    return null;
  }

  private readPackageJson(directory: string): Record<string, unknown> | null {
    const key = pathKey(directory);
    if (this.packageJsonCache.has(key)) {
      return this.packageJsonCache.get(key) ?? null;
    }
    const json = readJsonFile(path.join(directory, "package.json"), this.warnings);
    this.packageJsonCache.set(key, json);
    return json;
  }

  private configFor(startDirectory: string): TsConfigInfo | null {
    const visited: string[] = [];
    let directory = path.resolve(startDirectory);

    while (true) {
      const key = pathKey(directory);
      const cached = this.configCache.get(key);
      if (cached !== undefined) {
        for (const visitedKey of visited) this.configCache.set(visitedKey, cached);
        return cached;
      }
      visited.push(key);

      const configPath = findTsConfig(directory);
      if (configPath) {
        const loaded = loadTsConfig(configPath, this.warnings);
        for (const visitedKey of visited) this.configCache.set(visitedKey, loaded);
        return loaded;
      }

      if (key === pathKey(this.root)) break;
      const parent = path.dirname(directory);
      if (parent === directory || !isWithin(this.root, parent)) break;
      directory = parent;
    }

    for (const visitedKey of visited) this.configCache.set(visitedKey, null);
    return null;
  }
}

function pathKey(value: string): string {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function fileCandidates(base: string): string[] {
  const lower = base.toLowerCase();

  if (lower.endsWith(".js")) {
    const stem = base.slice(0, -3);
    return [`${stem}.ts`, `${stem}.tsx`, `${stem}.d.ts`, base];
  }
  if (lower.endsWith(".jsx")) {
    const stem = base.slice(0, -4);
    return [`${stem}.tsx`, `${stem}.d.ts`, base];
  }
  if (lower.endsWith(".mjs")) {
    return [`${base.slice(0, -4)}.mts`, base];
  }
  if (lower.endsWith(".cjs")) {
    return [`${base.slice(0, -4)}.cts`, base];
  }
  if (path.extname(base) !== "") return [base];

  return [
    base,
    ...SOURCE_EXTENSIONS.map((extension) => `${base}${extension}`)
  ];
}

function indexCandidates(directory: string): string[] {
  return SOURCE_EXTENSIONS.map((extension) =>
    path.join(directory, `index${extension}`)
  );
}

function findTsConfig(directory: string): string | null {
  for (const name of ["tsconfig.json", "jsconfig.json"]) {
    const candidate = path.join(directory, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function loadTsConfig(configPath: string, warnings: string[]): TsConfigInfo | null {
  const read = ts.readConfigFile(configPath, ts.sys.readFile);
  if (read.error || read.config === undefined) {
    warnings.push(
      `no se pudo leer ${configPath}: ${read.error?.messageText ?? "configuración vacía"}`
    );
    return null;
  }

  const parsed = ts.parseJsonConfigFileContent(
    read.config,
    ts.sys,
    path.dirname(configPath),
    undefined,
    configPath
  );

  const configDirectory = path.dirname(configPath);
  const baseUrl = path.resolve(configDirectory, parsed.options.baseUrl ?? ".");
  const paths = parsed.options.paths ?? {};

  const aliases: AliasMatcher[] = [];
  for (const [pattern, targets] of Object.entries(paths)) {
    if (!Array.isArray(targets)) continue;
    const star = pattern.indexOf("*");
    const prefix = star === -1 ? pattern : pattern.slice(0, star);
    const suffix = star === -1 ? "" : pattern.slice(star + 1);
    const resolvedTargets = targets
      .filter((target): target is string => typeof target === "string")
      .map((target) => path.resolve(baseUrl, target));

    if (resolvedTargets.length > 0) {
      aliases.push({
        prefix,
        suffix,
        wildcard: star !== -1,
        targets: resolvedTargets
      });
    }
  }

  aliases.sort((left, right) => {
    if (left.wildcard !== right.wildcard) return left.wildcard ? 1 : -1;
    if (right.prefix.length !== left.prefix.length) {
      return right.prefix.length - left.prefix.length;
    }
    return right.suffix.length - left.suffix.length;
  });

  return { configPath, baseUrl, aliases };
}

function matchAlias(
  aliases: readonly AliasMatcher[],
  specifier: string
): { targets: string[] } | null {
  for (const alias of aliases) {
    if (!alias.wildcard) {
      if (specifier === alias.prefix) return { targets: alias.targets };
      continue;
    }

    if (
      specifier.startsWith(alias.prefix) &&
      specifier.endsWith(alias.suffix) &&
      specifier.length >= alias.prefix.length + alias.suffix.length
    ) {
      const wildcard = specifier.slice(
        alias.prefix.length,
        specifier.length - alias.suffix.length
      );
      return {
        targets: alias.targets.map((target) =>
          target.includes("*") ? target.replace(/\*/g, wildcard) : target
        )
      };
    }
  }
  return null;
}

function packageExportTargets(exportsField: unknown, subpath: string): string[] {
  if (typeof exportsField === "string") {
    return subpath === "." ? [exportsField] : [];
  }

  if (Array.isArray(exportsField)) {
    return unique(
      exportsField.flatMap((value) => packageExportTargets(value, subpath))
    );
  }

  if (!isRecord(exportsField)) return [];

  const keys = Object.keys(exportsField);
  if (keys.length === 0) return [];

  const usesSubpaths = keys.some(
    (key) => key === "." || key.startsWith("./")
  );

  if (!usesSubpaths) {
    return subpath === "." ? conditionTargets(exportsField) : [];
  }

  if (exportsField[subpath] !== undefined) {
    return conditionTargets(exportsField[subpath]);
  }

  const wildcardKeys = keys
    .filter((key) => key.includes("*"))
    .sort((left, right) => right.length - left.length);

  for (const key of wildcardKeys) {
    const wildcard = matchWildcardKey(key, subpath);
    if (wildcard === null) continue;
    return conditionTargets(exportsField[key]).map((target) =>
      target.replace(/\*/g, wildcard)
    );
  }

  return [];
}

function conditionTargets(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) {
    return unique(value.flatMap((item) => conditionTargets(item)));
  }
  if (!isRecord(value)) return [];

  const preferred = ["types", "import", "module", "default", "node", "require"];
  const targets: string[] = [];
  for (const key of preferred) {
    if (key in value) targets.push(...conditionTargets(value[key]));
  }
  return unique(targets);
}

function matchWildcardKey(pattern: string, subpath: string): string | null {
  const star = pattern.indexOf("*");
  if (star === -1) return null;
  const prefix = pattern.slice(0, star);
  const suffix = pattern.slice(star + 1);
  if (
    !subpath.startsWith(prefix) ||
    !subpath.endsWith(suffix) ||
    subpath.length < prefix.length + suffix.length
  ) {
    return null;
  }
  return subpath.slice(prefix.length, subpath.length - suffix.length);
}

function discoverWorkspaces(
  root: string,
  warnings: string[]
): WorkspacePackage[] {
  const rootJson = readJsonFile(path.join(root, "package.json"), warnings);
  if (!rootJson) return [];

  const patterns = workspacePatterns(rootJson.workspaces);
  if (patterns.length === 0) return [];

  const byName = new Map<string, WorkspacePackage>();
  const stack: Array<{ directory: string; relative: string; depth: number }> = [
    { directory: root, relative: "", depth: 0 }
  ];

  while (stack.length > 0) {
    const current = stack.pop() as {
      directory: string;
      relative: string;
      depth: number;
    };

    if (
      current.relative !== "" &&
      patterns.some((pattern) => pattern.test(current.relative))
    ) {
      const json = readJsonFile(
        path.join(current.directory, "package.json"),
        warnings
      );
      if (json && typeof json.name === "string") {
        const existing = byName.get(json.name);
        if (existing) {
          warnings.push(
            `workspace duplicado "${json.name}": ${path.relative(root, existing.dir)} y ${path.relative(root, current.directory)}`
          );
        } else {
          byName.set(json.name, {
            name: json.name,
            dir: current.directory,
            json
          });
        }
      }
    }

    if (current.depth >= MAX_WORKSPACE_DEPTH) continue;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current.directory, { withFileTypes: true });
    } catch (error) {
      warnings.push(
        `no se pudo leer ${current.relative || "."}: ${(error as Error).message}`
      );
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
      if (WORKSPACE_SKIP_DIRS.has(entry.name)) continue;
      stack.push({
        directory: path.join(current.directory, entry.name),
        relative: current.relative
          ? `${current.relative}/${entry.name}`
          : entry.name,
        depth: current.depth + 1
      });
    }
  }

  return [...byName.values()].sort((left, right) =>
    left.dir < right.dir ? -1 : left.dir > right.dir ? 1 : 0
  );
}

function workspacePatterns(value: unknown): RegExp[] {
  const raw = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.packages)
      ? value.packages
      : [];

  return raw
    .filter((item): item is string => typeof item === "string")
    .map((pattern) =>
      globToRegExp(
        pattern
          .replace(/\\/g, "/")
          .replace(/\/+$/, "")
          .replace(/\/package\.json$/, "")
      )
    );
}

function globToRegExp(glob: string): RegExp {
  let source = "^";
  for (let index = 0; index < glob.length; index++) {
    const character = glob[index] as string;
    if (character === "*") {
      if (glob[index + 1] === "*") {
        index++;
        if (glob[index + 1] === "/") {
          index++;
          source += "(?:.*/)?";
        } else {
          source += ".*";
        }
      } else {
        source += "[^/]*";
      }
    } else if (character === "?") {
      source += "[^/]";
    } else {
      source += escapeRegExp(character);
    }
  }
  source += "$";
  return new RegExp(source);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readJsonFile(
  file: string,
  warnings: string[]
): Record<string, unknown> | null {
  let text: string;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      warnings.push(`no se pudo leer ${file}: ${(error as Error).message}`);
    }
    return null;
  }

  try {
    const parsed = JSON.parse(text.replace(/^\uFEFF/, ""));
    return isRecord(parsed) ? parsed : null;
  } catch (error) {
    warnings.push(`JSON inválido en ${file}: ${(error as Error).message}`);
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}
