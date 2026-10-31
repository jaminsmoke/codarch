// El mapa del repositorio tal como lo ve un agente: carpetas, ficheros,
// aristas y métricas, con el alcance que pida la consulta.

import { symbolRanking } from "@codarch/schema";
import { parentPath, clampInteger, compareStrings } from "./helpers";
import { resolveFolder } from "./scope";
import { ArchitectureStore, type StoreFolder } from "../store";
import type {
  ArchitectureMapInput,
  MapNode,
  ArchitectureMap
} from "./types";

export function getArchitectureMap(
  store: ArchitectureStore,
  input: ArchitectureMapInput = {}
): ArchitectureMap {
  const folderPath = store.normalizePath(input.folder ?? "");
  const folder = resolveFolder(store, folderPath, input.folder ?? "");
  const depth = clampInteger(input.depth, 2, 1, 6);
  const limit = clampInteger(input.limit, 20, 1, 100);
  const includeFiles = input.includeFiles ?? true;

  return {
    projectName: store.snapshot.meta.projectName ?? "",
    checksum: store.snapshot.meta.checksum ?? "",
    historyChecksum: store.snapshot.meta.historyChecksum ?? "",
    commitHash: store.snapshot.meta.commitHash ?? "",
    apiVersion: store.snapshot.meta.apiVersion,
    scope: folder.path,
    sizeMetric: store.sizeMetric,
    aggregation: {
      size: "suma del tamaño de los ficheros",
      maxComplexity: "máximo maxComplexity de los ficheros",
      risk: "máximo riesgo compuesto de los ficheros"
    },
    stats: store.summary(),
    symbols: {
      available: store.snapshot.lenses?.symbols !== undefined,
      total: store.snapshot.lenses?.symbols?.summary.symbols ?? 0,
      functions: store.snapshot.lenses?.symbols?.summary.functions ?? 0,
      classes: store.snapshot.lenses?.symbols?.summary.classes ?? 0,
      interfaces: store.snapshot.lenses?.symbols?.summary.interfaces ?? 0,
      types: store.snapshot.lenses?.symbols?.summary.types ?? 0,
      enums: store.snapshot.lenses?.symbols?.summary.enums ?? 0,
      variables: store.snapshot.lenses?.symbols?.summary.variables ?? 0,
      mostComplex: symbolRanking(store.snapshot, 5).map((symbol) => ({
        // Las rutas del store no llevan el nombre de la raíz.
        path: store.files.find((file) => file.id === symbol.id)?.path ?? symbol.path,
        name: symbol.name,
        complexity: symbol.complexity,
        line: symbol.line
      }))
    },
    root: mapFolder(store, folder, 0, depth, limit, includeFiles)
  };
}

/**
 * Plan de migración: cuánta deuda queda, dónde está y cómo ha cambiado.
 *
 * La migración es el motivo de ser del producto (ADR 0016): el agente tiene que
 * poder preguntar por ella con los mismos datos que ve el mapa.
 */

function mapFolder(
  store: ArchitectureStore,
  folder: StoreFolder,
  level: number,
  depth: number,
  limit: number,
  includeFiles: boolean
): MapNode {
  const diff = store.report ? store.diffCounts(folder.path) : null;
  const node: MapNode = {
    kind: "folder",
    path: folder.path,
    name: folder.name,
    files: folder.files.length,
    metrics: {
      size: folder.size,
      maxComplexity: folder.maxComplexity,
      risk: folder.risk
    },
    childFolders: folder.childFolders.length,
    ...(diff
      ? {
          changes: {
            added: diff.files.added,
            changed: diff.files.changed,
            removed: diff.files.removed,
            hotspots: diff.hotspots,
            violations:
              diff.violations.introduced +
              diff.violations.existing +
              diff.violations.resolved
          }
        }
      : {})
  };

  if (level >= depth) {
    const directFiles = includeFiles
      ? folder.files.filter((file) => parentPath(file.path) === folder.path)
          .length
      : 0;
    const omitted = folder.childFolders.length + directFiles;
    if (omitted > 0) node.truncated = omitted;
    return node;
  }

  const children: MapNode[] = [];
  for (const childPath of folder.childFolders) {
    const child = store.folder(childPath);
    if (!child) continue;
    children.push(mapFolder(store, child, level + 1, depth, limit, includeFiles));
  }
  if (includeFiles) {
    for (const file of folder.files) {
      if (parentPath(file.path) !== folder.path) continue;
      const state = store.diffForPath(file.path);
      children.push({
        kind: "file",
        path: file.path,
        name: file.name,
        id: file.id,
        files: 1,
        metrics: {
          size: file.size,
          maxComplexity: file.complexity,
          risk: file.risk
        },
        ...(state && state.status !== "removed" ? { change: state.status } : {}),
        childFolders: 0
      });
    }
  }

  children.sort(
    (left, right) =>
      right.metrics.size - left.metrics.size ||
      compareStrings(left.path, right.path)
  );
  const kept = children.slice(0, limit);
  node.children = kept;
  if (children.length > kept.length) node.truncated = children.length - kept.length;
  return node;
}
