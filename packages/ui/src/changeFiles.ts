import type { ChangedFile, DiffFile, DiffReport, MetricChange } from "@codarch/metrics/browser";
import { formatCompact } from "@codarch/render/browser";

/**
 * Los ficheros del cambio, en una sola lista (ADR 0070).
 *
 * Nuevos, modificados y eliminados comparten sección y fila: letra de estado,
 * ruta y **una** cifra, el delta de `rloc`. Antes cada lista hablaba en su
 * unidad y los eliminados solo existían como un contador.
 */

/** Los tres estados, en el orden en que se leen. */
export type ChangeStatus = "added" | "changed" | "removed";

/** La letra de la fila, como en un cliente de git. */
export type ChangeLetter = "A" | "M" | "D";

/** Una fila de la sección **Ficheros**. */
export interface ChangeFileRow {
  id: string;
  path: string;
  status: ChangeStatus;
  /** La métrica que decide el delta: `rloc`, salvo que no se haya movido. */
  metric: string;
  /** `null` cuando el reporte no trae la métrica. */
  delta: number | null;
  /** Todas las métricas que se movieron, para el tooltip. */
  detail: string;
}

/** Un grupo de la lista, con su letra y su cuenta. */
export interface ChangeFileGroup {
  status: ChangeStatus;
  title: string;
  letter: ChangeLetter;
  /** El singular y el plural, para el reparto de la cabecera. */
  one: string;
  many: string;
  /** Los ficheros del grupo, se pinten o no. */
  count: number;
  /** Los que caben en la lista. */
  files: ChangeFileRow[];
  /** Los que se quedan fuera del corte. */
  rest: number;
}

/** Cada grupo se corta aquí; debajo va el `+N más` (como **Reglas**). */
export const MAX_FILES_PER_GROUP = 25;

const GROUPS: ReadonlyArray<{
  status: ChangeStatus;
  title: string;
  letter: ChangeLetter;
  one: string;
  many: string;
}> = [
  { status: "added", title: "Nuevos", letter: "A", one: "nuevo", many: "nuevos" },
  { status: "changed", title: "Modificados", letter: "M", one: "modificado", many: "modificados" },
  { status: "removed", title: "Eliminados", letter: "D", one: "eliminado", many: "eliminados" }
];

/** El delta de una fila, con el signo de la casa: `+84`, `−3` o `±`. */
export function formatDelta(delta: number | null): string {
  if (delta === null) return "±";
  if (delta === 0) return "±0";
  const magnitude = formatCompact(Math.abs(delta));
  return delta > 0 ? `+${magnitude}` : `−${magnitude}`;
}

/**
 * El texto de la columna derecha: la cifra y, si no es `rloc`, su métrica.
 *
 * La excepción es rara —el `rloc` casi siempre se mueve—, pero cuando pasa la
 * fila lo dice: un número sin nombre mentiría.
 */
export function deltaLabel(row: ChangeFileRow): string {
  const delta = formatDelta(row.delta);
  return row.metric === "rloc" ? delta : `${row.metric} ${delta}`;
}

/** El delta de un fichero nuevo: lo que ocupa en el head. */
function addedDelta(file: DiffFile): number {
  return Math.abs(file.metrics.rloc ?? file.metrics.loc ?? 0);
}

/** El delta de un fichero eliminado: lo que ocupaba en la base. */
function removedDelta(file: DiffFile): number {
  return -Math.abs(file.metrics.rloc ?? file.metrics.loc ?? 0);
}

/**
 * La cifra de un fichero modificado: `rloc` si se movió.
 *
 * Si el `rloc` no cambió, la métrica que más se movió, con su nombre. El resto
 * de métricas no caben en la fila y viven en el tooltip.
 */
export function pickChange(
  changes: readonly MetricChange[]
): { metric: string; delta: number | null } {
  const moved = changes.filter((change) => change.delta !== null && change.delta !== 0);
  const rloc = moved.find((change) => change.metric === "rloc");
  if (rloc) return { metric: rloc.metric, delta: rloc.delta };
  const biggest = [...moved].sort(
    (left, right) =>
      Math.abs(right.delta as number) - Math.abs(left.delta as number) ||
      left.metric.localeCompare(right.metric)
  )[0];
  return biggest
    ? { metric: biggest.metric, delta: biggest.delta }
    : { metric: "rloc", delta: null };
}

/** El reparto del tooltip: todas las métricas que se movieron. */
function changeDetail(changes: readonly MetricChange[]): string {
  return changes
    .filter((change) => change.delta !== null && change.delta !== 0)
    .map((change) => `${change.metric} ${formatDelta(change.delta)}`)
    .join(" · ");
}

/** El orden de la lista no depende del reporte: ruta y, con empate, el id. */
function compareRows(
  left: { path: string; id: string },
  right: { path: string; id: string }
): number {
  if (left.path !== right.path) return left.path < right.path ? -1 : 1;
  if (left.id === right.id) return 0;
  return left.id < right.id ? -1 : 1;
}

function rowOfAdded(file: DiffFile): ChangeFileRow {
  const delta = addedDelta(file);
  return {
    id: file.id,
    path: file.path,
    status: "added",
    metric: "rloc",
    delta,
    detail: `rloc ${formatDelta(delta)}`
  };
}

function rowOfChanged(file: ChangedFile): ChangeFileRow {
  const picked = pickChange(file.changes);
  return {
    id: file.id,
    path: file.path,
    status: "changed",
    metric: picked.metric,
    delta: picked.delta,
    detail: changeDetail(file.changes) || `${picked.metric} ${formatDelta(picked.delta)}`
  };
}

function rowOfRemoved(file: DiffFile): ChangeFileRow {
  const delta = removedDelta(file);
  return {
    id: file.id,
    path: file.path,
    status: "removed",
    metric: "rloc",
    delta,
    detail: `rloc ${formatDelta(delta)}`
  };
}

/**
 * Los tres grupos de la sección **Ficheros**.
 *
 * Se construyen siempre, también vacíos: la sección decide qué hacer con un
 * grupo sin ficheros. El orden dentro del grupo es alfabético, como el del
 * reporte, y no cambia entre ejecuciones.
 */
export function changeFileGroups(
  files: DiffReport["files"],
  limit = MAX_FILES_PER_GROUP
): ChangeFileGroup[] {
  const byStatus = {
    added: [...files.added].sort(compareRows).map(rowOfAdded),
    changed: [...files.changed].sort(compareRows).map(rowOfChanged),
    removed: [...files.removed].sort(compareRows).map(rowOfRemoved)
  } satisfies Record<ChangeStatus, ChangeFileRow[]>;

  return GROUPS.map((group) => {
    const rows = byStatus[group.status];
    return {
      ...group,
      count: rows.length,
      files: rows.slice(0, Math.max(0, limit)),
      rest: Math.max(0, rows.length - limit)
    };
  });
}

/** El reparto de la cabecera: `3 nuevos · 12 modificados · 1 eliminado`. */
export function filesSummary(groups: readonly ChangeFileGroup[]): string {
  return groups
    .filter((group) => group.count > 0)
    .map((group) => `${group.count} ${group.count === 1 ? group.one : group.many}`)
    .join(" · ");
}

/** Lo que el tooltip dice de una fila. */
export function rowTitle(row: ChangeFileRow): string {
  const status = GROUPS.find((group) => group.status === row.status)?.title.toLowerCase();
  const detail = row.detail || `${row.metric} ${formatDelta(row.delta)}`;
  if (row.status === "removed") {
    return `${row.path} · ${status} · ${detail} · ya no está en el head, no hay ficha que abrir`;
  }
  return `${row.path} · ${status} · ${detail}`;
}
