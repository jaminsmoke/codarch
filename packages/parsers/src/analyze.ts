import fs from "node:fs";
import path from "node:path";
import { walkTree, type CcJson } from "@codarch/schema";
import { collectGitChurn } from "./git";
import { buildGraph, type DependencyLink } from "./graph";
import { ImportResolver } from "./resolve";
import { buildSnapshot, type SnapshotFile } from "./snapshot";
import { TypeScriptParser } from "./ts/parser";
import { walkSourceFiles } from "./walk";

export interface AnalyzeOptions {
  /** Patrones extra de exclusión, con sintaxis de `.gitignore`. */
  ignore?: readonly string[];
  /** Extensiones a analizar. Por defecto, TS y JS. */
  extensions?: readonly string[];
  /** Nombre visible; por defecto, `name` del package.json o el directorio. */
  projectName?: string;
  /** Lee churn de git. Por defecto, `true`; `false` para tests sin historial. */
  git?: boolean;
}

export interface GitSummary {
  enabled: boolean;
  commits: number;
  authors: number;
  shallow: boolean;
}

export interface UnresolvedImportIssue {
  file: string;
  /** Línea 1-based. */
  line: number;
  specifier: string;
  reason: string;
}

export interface AnalyzeResult {
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
  git: GitSummary;
  durationMs: number;
}

/**
 * Analiza un proyecto TypeScript/JavaScript y devuelve un snapshot `cc.json`.
 *
 * El pipeline es secuencial y no guarda árboles de tree-sitter: recorrido,
 * lectura/parseo fichero a fichero, resolución de imports, grafo y snapshot.
 */
export function analyzeRepository(
  rootInput: string,
  options: AnalyzeOptions = {}
): AnalyzeResult {
  const started = Date.now();
  const root = path.resolve(rootInput);
  const projectName = options.projectName ?? readProjectName(root);
  const walked = walkSourceFiles(root, {
    ignore: options.ignore,
    extensions: options.extensions
  });
  const warnings = [...walked.warnings];
  const resolver = new ImportResolver(root, walked.files);
  warnings.push(...resolver.warnings);

  const parser = new TypeScriptParser();
  const parsedFiles: SnapshotFile[] = [];
  const links: DependencyLink[] = [];
  const unresolved: UnresolvedImportIssue[] = [];
  let externalImports = 0;
  let builtinImports = 0;
  let typeOnlyImports = 0;

  for (const file of walked.files) {
    let source: string;
    try {
      source = fs.readFileSync(file.absolutePath, "utf8");
    } catch (error) {
      warnings.push(
        `no se pudo leer ${file.relativePath}: ${(error as Error).message}`
      );
      continue;
    }

    let parsed;
    try {
      parsed = parser.parse(source, file.relativePath);
    } catch (error) {
      warnings.push(
        `no se pudo analizar ${file.relativePath}: ${(error as Error).message}`
      );
      continue;
    }

    let fileExternalImports = 0;
    let fileBuiltinImports = 0;
    let fileTypeOnlyImports = 0;
    let fileUnresolvedImports = 0;

    for (const imported of parsed.imports) {
      if (imported.typeOnly) fileTypeOnlyImports++;

      const result = resolver.resolve(file.absolutePath, imported.specifier);
      if (result.kind === "internal") {
        links.push({
          from: file.relativePath,
          to: result.file.relativePath,
          typeOnly: imported.typeOnly
        });
      } else if (result.kind === "external") {
        if (result.builtin) fileBuiltinImports++;
        else fileExternalImports++;
      } else {
        fileUnresolvedImports++;
        unresolved.push({
          file: file.relativePath,
          line: imported.line,
          specifier: imported.specifier,
          reason: result.reason
        });
      }
    }

    externalImports += fileExternalImports;
    builtinImports += fileBuiltinImports;
    typeOnlyImports += fileTypeOnlyImports;

    parsedFiles.push({
      relativePath: file.relativePath,
      metrics: {
        ...parsed.metrics,
        imports: parsed.imports.length,
        externalImports: fileExternalImports,
        builtinImports: fileBuiltinImports,
        typeOnlyImports: fileTypeOnlyImports,
        unresolvedImports: fileUnresolvedImports
      }
    });
  }

  const git = collectGitChurn(
    root,
    parsedFiles.map((file) => file.relativePath),
    { enabled: options.git !== false }
  );
  warnings.push(...git.warnings);
  if (git.enabled) {
    for (const file of parsedFiles) {
      const churn = git.metrics.get(file.relativePath);
      if (!churn) continue;
      file.metrics.number_of_commits = churn.commits;
      file.metrics.number_of_authors = churn.authors;
    }
  }

  const graph = buildGraph(
    parsedFiles.map((file) => file.relativePath),
    links
  );
  for (const file of parsedFiles) {
    const metrics = graph.metrics.get(file.relativePath);
    if (metrics) {
      file.metrics.fanIn = metrics.fanIn;
      file.metrics.fanOut = metrics.fanOut;
      file.metrics.inCycle = metrics.inCycle;
      file.metrics.cycleSize = metrics.cycleSize;
      file.metrics.dependencyLevel = metrics.dependencyLevel;
    }
  }

  if (unresolved.length > 0) {
    warnings.push(
      `${unresolved.length} imports sin resolver; se excluyen del grafo`
    );
  }

  const snapshot = buildSnapshot({
    projectName,
    files: parsedFiles,
    graph
  });

  let folders = 0;
  walkTree(snapshot.files, (entry) => {
    if (entry.node.type === "Folder" && entry.depth > 0) folders++;
  });

  const metricNames = new Set<string>();
  for (const file of parsedFiles) {
    for (const metric of Object.keys(file.metrics)) metricNames.add(metric);
  }

  warnings.sort();

  return {
    snapshot,
    files: parsedFiles.length,
    folders,
    edges: graph.edges.length,
    cycles: graph.cycles,
    metricNames: [...metricNames].sort(),
    warnings,
    unresolved,
    externalImports,
    builtinImports,
    typeOnlyImports,
    unresolvedImports: unresolved.length,
    git: {
      enabled: git.enabled,
      commits: git.commits,
      authors: git.authors,
      shallow: git.shallow
    },
    durationMs: Date.now() - started
  };
}

function readProjectName(root: string): string {
  try {
    const text = fs.readFileSync(path.join(root, "package.json"), "utf8");
    const parsed: unknown = JSON.parse(text.replace(/^\uFEFF/, ""));
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed) &&
      typeof (parsed as Record<string, unknown>).name === "string"
    ) {
      const name = ((parsed as Record<string, unknown>).name as string).trim();
      if (name) return name;
    }
  } catch {
    // Sin package.json legible: el directorio es un nombre razonable.
  }
  return path.basename(root) || "Proyecto";
}
