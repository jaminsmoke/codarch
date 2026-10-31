import { walkTree } from "@codarch/schema";
import type {
  ChangedFile,
  DiffFile,
  IndexedSnapshot,
  MetricChange,
  SnapshotSummary
} from "./diff-types";
import {
  compareByPath,
  compareStrings,
  finiteNumber,
  sortedMetrics
} from "./diff-shared";

/**
 * Los ficheros: altas, bajas y cambios de métrica.
 *
 * La comparación es por id de nodo, no por posición, y el cambio de cada métrica
 * se calcula sobre la unión de claves: una métrica que aparece o desaparece
 * tiene `delta: null`, no un cero engañoso.
 */

/** De dónde sale la cuenta de ficheros y carpetas de un lado. */
export function summarize(index: IndexedSnapshot): SnapshotSummary {
  let folders = 0;
  walkTree(index.cc.files, (entry) => {
    if (entry.node.type === "Folder" && entry.depth > 0) folders++;
  });

  return {
    projectName: index.cc.meta.projectName ?? "",
    checksum: index.cc.meta.checksum ?? "",
    files: index.paths.size,
    folders,
    edges: index.edges.size
  };
}

/** Los ficheros que están en uno y no en el otro. */
export function difference(
  present: IndexedSnapshot,
  absent: IndexedSnapshot
): DiffFile[] {
  const files: DiffFile[] = [];
  for (const [id, path] of present.paths) {
    if (absent.paths.has(id)) continue;
    files.push({
      id,
      path,
      metrics: sortedMetrics(present.metrics[id])
    });
  }
  return files.sort(compareByPath);
}

/** Los ficheros que están en los dos y cambiaron alguna métrica. */
export function changedFiles(
  base: IndexedSnapshot,
  head: IndexedSnapshot
): ChangedFile[] {
  const changed: ChangedFile[] = [];
  for (const [id, path] of head.paths) {
    if (!base.paths.has(id)) continue;
    const baseValues = base.metrics[id] ?? {};
    const headValues = head.metrics[id] ?? {};
    const keys = new Set([...Object.keys(baseValues), ...Object.keys(headValues)]);
    const changes: MetricChange[] = [];

    for (const metric of [...keys].sort(compareStrings)) {
      const baseValue = finiteNumber(baseValues[metric]);
      const headValue = finiteNumber(headValues[metric]);
      if (baseValue === null && headValue === null) continue;
      if (baseValue !== null && headValue !== null && baseValue === headValue) {
        continue;
      }
      changes.push({
        metric,
        base: baseValue,
        head: headValue,
        delta:
          baseValue !== null && headValue !== null
            ? headValue - baseValue
            : null
      });
    }

    if (changes.length > 0) changed.push({ id, path, changes });
  }
  return changed.sort(compareChangedFiles);
}

/** Las líneas de código de un conjunto de ficheros. */
export function sumRloc(files: readonly DiffFile[]): number {
  let total = 0;
  for (const file of files) total += file.metrics.rloc ?? 0;
  return total;
}

/** El delta de rloc de los ficheros que cambiaron. */
export function changedRloc(files: readonly ChangedFile[]): number {
  let total = 0;
  for (const file of files) {
    for (const change of file.changes) {
      if (change.metric !== "rloc") continue;
      total += change.delta ?? 0;
    }
  }
  return total;
}

function compareChangedFiles(left: ChangedFile, right: ChangedFile): number {
  return compareStrings(left.path, right.path) || compareStrings(left.id, right.id);
}
