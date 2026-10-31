import { REPORT_SCHEMA_VERSION } from "@codarch/versions";
import type { CcJson } from "@codarch/schema";
import { emptyRuleReport, evaluateRules } from "./rules";
import { buildSymbolReport } from "./symbol-diff";
import { cycleDifference, cycleGroups } from "./diff-cycles";
import { diffEdges } from "./diff-edges";
import { changedFiles, changedRloc, difference, summarize, sumRloc } from "./diff-files";
import { buildDuplicationReport } from "./diff-duplication";
import { buildHotspots, chooseHotspotMetric } from "./diff-hotspots";
import { indexSnapshot } from "./diff-index";
import { buildMigrationReport } from "./diff-migration";
import { ruleInput } from "./diff-rules";
import type { DiffOptions, DiffReport } from "./diff-types";

export type {
  ChangedFile,
  CycleComponent,
  DiffFile,
  DiffOptions,
  DiffReport,
  DiffSummary,
  DuplicationChangeKind,
  DuplicationPairChange,
  DuplicationReport,
  DuplicationSide,
  EdgeChange,
  Hotspot,
  IndexedSnapshot,
  MetricChange,
  MigrationDelta,
  MigrationFileChange,
  MigrationFileDebt,
  MigrationReport,
  SnapshotSummary
} from "./diff-types";

/**
 * Cuántos ficheros con símbolos viajan en el reporte.
 *
 * La ficha abre el detalle fila a fila, así que el corte ya no puede ser el top
 * de hotspots: cualquier fichero cambiado tiene que poder desplegarse. El
 * límite de verdad lo pone `MAX_SYMBOL_CHANGES` dentro del reporte ✓.
 */
const SYMBOL_FILES = 400;

/**
 * Compara dos snapshots `cc.json` por identidad de nodo, no por posición.
 *
 * El reporte es determinista: arrays ordenados y sin timestamps. Los cambios de
 * métricas se calculan sobre la unión de claves; una métrica que aparece o
 * desaparece tiene `delta: null`, no un cero engañoso.
 *
 * Aquí solo se cablea: indexar (`diff-index`), ficheros (`diff-files`), aristas
 * (`diff-edges`), ciclos (`diff-cycles`), hotspots (`diff-hotspots`), migración
 * (`diff-migration`) y símbolos (`symbol-diff`). Cada parte recibe los dos
 * índices y devuelve lo suyo; ninguna necesita saber cómo se calcula otra.
 */
export function diffSnapshots(
  base: CcJson,
  head: CcJson,
  options: DiffOptions = {}
): DiffReport {
  const top = Math.max(1, Math.floor(options.top ?? 10));
  const baseIndex = indexSnapshot(base);
  const headIndex = indexSnapshot(head);

  const added = difference(headIndex, baseIndex);
  const removed = difference(baseIndex, headIndex);
  const changed = changedFiles(baseIndex, headIndex);

  const edgeDiff = diffEdges(baseIndex, headIndex);
  const baseCycles = cycleGroups(baseIndex);
  const headCycles = cycleGroups(headIndex);
  const introducedCycles = cycleDifference(headCycles, baseCycles);
  const fixedCycles = cycleDifference(baseCycles, headCycles);

  const hotspotMetric = chooseHotspotMetric(
    baseIndex,
    headIndex,
    options.hotspotMetric
  );
  const hotspots = hotspotMetric
    ? buildHotspots(baseIndex, headIndex, added, changed, hotspotMetric, top)
    : [];
  const rules = options.rules
    ? evaluateRules(
        ruleInput(baseIndex, [...baseCycles.values()].map((group) => group.component)),
        ruleInput(headIndex, [...headCycles.values()].map((group) => group.component)),
        options.rules
      )
    : emptyRuleReport();

  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    base: summarize(baseIndex),
    head: summarize(headIndex),
    summary: {
      addedFiles: added.length,
      removedFiles: removed.length,
      changedFiles: changed.length,
      addedEdges: edgeDiff.added.length,
      removedEdges: edgeDiff.removed.length,
      cyclicEdgesAdded: edgeDiff.cyclicAdded.length,
      cyclicEdgesRemoved: edgeDiff.cyclicRemoved.length,
      introducedCycles: introducedCycles.length,
      fixedCycles: fixedCycles.length,
      hotspots: hotspots.length,
      addedRloc: sumRloc(added),
      removedRloc: sumRloc(removed),
      changedRloc: changedRloc(changed)
    },
    hotspotMetric,
    rules,
    files: { added, removed, changed },
    edges: edgeDiff,
    cycles: { introduced: introducedCycles, fixed: fixedCycles },
    hotspots,
    migration: buildMigrationReport(baseIndex, headIndex, top),
    duplication: buildDuplicationReport(baseIndex, headIndex, top),
    symbols: buildSymbolReport(
      baseIndex,
      headIndex,
      // La ficha abre el detalle de cualquier fila, no solo del top de hotspots.
      Math.max(top, SYMBOL_FILES),
      options.source
    )
  };
}
