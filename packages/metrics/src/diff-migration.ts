import type {
  CcMigrationLens,
  CcMigrationStatus
} from "@codarch/schema";
import type {
  IndexedSnapshot,
  MigrationDelta,
  MigrationFileChange,
  MigrationFileDebt,
  MigrationReport
} from "./diff-types";
import { compareByPath } from "./diff-shared";

/**
 * Cómo ha cambiado la migración entre la base y el head.
 *
 * La migración es el motivo de ser del producto: que su deuda se vea en el
 * PR, no solo en el mapa. Se compara lo que declara la lente —nodos y resumen—,
 * y un lado sin lente no es un cero: es `null`, y se dice.
 */
export function buildMigrationReport(
  baseIndex: IndexedSnapshot,
  headIndex: IndexedSnapshot,
  top: number
): MigrationReport | null {
  const baseLens = baseIndex.cc.lenses?.migration;
  const headLens = headIndex.cc.lenses?.migration;
  // Sin la lente en ninguno de los dos lados no hay nada que comparar: se dice
  // con `null` en vez de inventar ceros.
  if (!baseLens && !headLens) return null;

  const baseNodes = baseLens?.nodes ?? {};
  const headNodes = headLens?.nodes ?? {};
  const changes = migrationChanges(baseIndex, headIndex, baseNodes, headNodes);
  const baseSummary = baseLens?.summary;
  const headSummary = headLens?.summary;

  return {
    languages: {
      base: baseSummary?.languages ?? {},
      head: headSummary?.languages ?? {}
    },
    status: {
      base: baseSummary?.status ?? emptyStatus(),
      head: headSummary?.status ?? emptyStatus()
    },
    debt: migrationDelta(baseSummary?.migrationDebt, headSummary?.migrationDebt),
    crossings: migrationDelta(baseSummary?.ffiCrossings, headSummary?.ffiCrossings),
    bridgeFiles: migrationDelta(baseSummary?.bridgeFiles, headSummary?.bridgeFiles),
    files: migrationChangeRanking(changes, top),
    topDebt: migrationTopDebt(headIndex, headNodes, top)
  };
}

function migrationChanges(
  baseIndex: IndexedSnapshot,
  headIndex: IndexedSnapshot,
  baseNodes: CcMigrationLens["nodes"],
  headNodes: CcMigrationLens["nodes"]
): MigrationFileChange[] {
  const changes: MigrationFileChange[] = [];
  for (const id of new Set([...Object.keys(baseNodes), ...Object.keys(headNodes)])) {
    const base = baseNodes[id];
    const head = headNodes[id];
    if (!base && !head) continue;
    const reference = head ?? (base as NonNullable<typeof base>);
    const baseDebt = base ? base.debt ?? 0 : null;
    const headDebt = head ? head.debt ?? 0 : null;
    const delta =
      baseDebt === null || headDebt === null ? null : headDebt - baseDebt;
    if (delta === null || delta === 0) continue;
    changes.push({
      id,
      path: headIndex.paths.get(id) ?? baseIndex.paths.get(id) ?? id,
      language: reference.language,
      status: reference.status,
      base: baseDebt,
      head: headDebt,
      delta
    });
  }

  return changes;
}

function migrationChangeRanking(
  changes: MigrationFileChange[],
  top: number
): MigrationReport["files"] {
  const increased = changes
    .filter((change) => (change.delta ?? 0) > 0)
    .sort(
      (left, right) =>
        (right.delta ?? 0) - (left.delta ?? 0) || compareByPath(left, right)
    );
  const decreased = changes
    .filter((change) => (change.delta ?? 0) < 0)
    .sort(
      (left, right) =>
        (left.delta ?? 0) - (right.delta ?? 0) || compareByPath(left, right)
    );

  return { increased: increased.slice(0, top), decreased: decreased.slice(0, top) };
}

function migrationTopDebt(
  headIndex: IndexedSnapshot,
  headNodes: CcMigrationLens["nodes"],
  top: number
): MigrationFileDebt[] {
  const topDebt: MigrationFileDebt[] = [];
  for (const [id, node] of Object.entries(headNodes)) {
    if (!node.debt) continue;
    topDebt.push({
      id,
      path: headIndex.paths.get(id) ?? id,
      language: node.language,
      status: node.status,
      debt: node.debt,
      rloc: node.rloc,
      crossings: node.crossings
    });
  }
  topDebt.sort(
    (left, right) => right.debt - left.debt || compareByPath(left, right)
  );

  return topDebt.slice(0, top);
}

function migrationDelta(baseValue: number | undefined, headValue: number | undefined): MigrationDelta {
  const base = baseValue ?? 0;
  const head = headValue ?? 0;
  return { base, head, delta: head - base };
}

function emptyStatus(): Record<CcMigrationStatus, number> {
  return { js: 0, rust: 0, bridge: 0, native: 0 };
}
