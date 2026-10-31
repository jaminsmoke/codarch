// Los símbolos de un fichero y su cadena: quién llama a quién, hasta dónde
// llega la llamada y con qué se queda el agente.

import { chainsPayload } from "@codarch/schema";
import { edgeViews, aggregateEdgeViews, sortMetrics } from "./scope";
import { clampInteger, compareStrings } from "./helpers";
import { symbolsOf } from "@codarch/schema";
import { lintTotals } from "@codarch/lint/browser";
import { loadLintArtifact } from "./lint";
import {
  ArchitectureStore,
  type StatusViolation,
  type StoreFile,
  type StoreFolder
} from "../store";
import type {
  ExplainModuleInput,
  ExplainModuleResult,
  SymbolChainInput,
  SymbolChainResult
} from "./types";

export function getSymbolChain(
  store: ArchitectureStore,
  input: SymbolChainInput = {}
): SymbolChainResult {
  // Sin símbolo también hay respuesta: el calor del repo. Si hay símbolo, el
  // payload busca solo cadenas de símbolo, por su nombre actual o por uno
  // anterior, y respeta el límite (ADR 0039).
  const symbol = input.symbol?.trim() || null;
  const limit = clampInteger(input.limit, 10, 1, 50);
  const payload = chainsPayload(store.root, symbol, limit);
  if (!payload.available) {
    return {
      available: false,
      reason:
        "no hay historial en este repositorio; se guarda con codarch analyze --history",
      chains: [],
      heat: []
    };
  }

  return {
    available: true,
    reason: undefined,
    chains: payload.chains,
    heat: payload.heat
  };
}

export function explainModule(
  store: ArchitectureStore,
  input: ExplainModuleInput
): ExplainModuleResult {
  const target = store.resolveTarget(input.path);
  const limit = clampInteger(input.limit, 5, 1, 50);
  const lintArtifact = loadLintArtifact(store)?.artifact ?? null;
  const base = {
    projectName: store.snapshot.meta.projectName ?? "",
    checksum: store.snapshot.meta.checksum ?? "",
    historyChecksum: store.snapshot.meta.historyChecksum ?? "",
    sizeMetric: store.sizeMetric,
    violations: [] as StatusViolation[],
    metrics: {} as Record<string, number>,
    risk: 0,
    complexity: 0,
    files: 0,
    name: target.name,
    path: target.path
  };

  if ("id" in target) {
    const file = target as StoreFile;
    const dependencies = edgeViews(store.outgoing.get(file.id) ?? [], "to", limit);
    const dependents = edgeViews(store.incoming.get(file.id) ?? [], "from", limit);
    const state = store.diffForPath(file.path);
    return {
      ...base,
      kind: "file",
      id: file.id,
      files: 1,
      metrics: sortMetrics(file.metrics),
      risk: file.risk,
      complexity: file.complexity,
      symbols: symbolsOf(store.snapshot, file.id)
        .slice(0, limit)
        .map((symbol) => ({
          name: symbol.name,
          kind: symbol.kind,
          line: symbol.line,
          ...(symbol.complexity === undefined
            ? {}
            : { complexity: symbol.complexity }),
          ...(symbol.lines === undefined ? {} : { lines: symbol.lines })
        })),
      riskRank: store.riskRank.get(file.id),
      cycle: {
        inCycle: file.inCycle > 0,
        size: file.cycleSize
      },
      dependencies: {
        total: (store.outgoing.get(file.id) ?? []).length,
        edges: dependencies,
        truncated: Math.max(
          0,
          (store.outgoing.get(file.id) ?? []).length - dependencies.length
        )
      },
      dependents: {
        total: (store.incoming.get(file.id) ?? []).length,
        edges: dependents,
        truncated: Math.max(
          0,
          (store.incoming.get(file.id) ?? []).length - dependents.length
        )
      },
      diff: store.report
        ? {
            available: true,
            state: state
              ? {
                  status: state.status,
                  ...(state.hotspot ? { hotspot: true } : {}),
                  ...(state.changes ? { changes: state.changes.length } : {})
                }
              : null
          }
        : {
            available: false,
            reason:
              "no hay report.json cargado; no sé si este fichero cambió en el PR"
          },
      lint: lintTotals(lintArtifact, file.path),
      violations: store.violationsForPaths([file.path], 10)
    };
  }

  const folder = target as StoreFolder;
  const folderFiles = store.filesUnder(folder.path);
  const ids = new Set(folderFiles.map((file) => file.id));
  const outgoing = store.edges.filter(
    (edge) => ids.has(edge.fromId) && !ids.has(edge.toId)
  );
  const incoming = store.edges.filter(
    (edge) => ids.has(edge.toId) && !ids.has(edge.fromId)
  );
  const outgoingPaths = aggregateEdgeViews(outgoing, "to");
  const incomingPaths = aggregateEdgeViews(incoming, "from");
  const cyclic = folderFiles.filter((file) => file.inCycle > 0);
  const topFiles = [...folderFiles]
    .sort(
      (left, right) =>
        right.risk - left.risk || compareStrings(left.path, right.path)
    )
    .slice(0, limit)
    .map((file) => ({
      path: file.path,
      risk: file.risk,
      size: file.size
    }));

  return {
    ...base,
    kind: "folder",
    files: folder.files.length,
    metrics: {
      size: folder.size,
      maxComplexity: folder.maxComplexity,
      risk: folder.risk
    },
    risk: folder.risk,
    complexity: folder.maxComplexity,
    cycle: {
      filesInCycle: cyclic.length,
      maxSize: Math.max(0, ...cyclic.map((file) => file.cycleSize))
    },
    childFolders: folder.childFolders.slice(0, limit),
    topFiles,
    dependencies: {
      total: outgoingPaths.length,
      edges: outgoingPaths.slice(0, limit),
      truncated: Math.max(0, outgoingPaths.length - limit)
    },
    dependents: {
      total: incomingPaths.length,
      edges: incomingPaths.slice(0, limit),
      truncated: Math.max(0, incomingPaths.length - limit)
    },
    diff: store.report
      ? {
          available: true,
          state: null,
          counts: store.diffCounts(folder.path)
        }
      : {
          available: false,
          reason:
            "no hay report.json cargado; no sé qué cambió bajo esta carpeta"
        },
    lint: lintTotals(lintArtifact, folder.path),
    violations: store.violationsForPaths(
      folderFiles.map((file) => file.path),
      10
    )
  };
}

/**
 * Qué arquitectura tiene ya el código, como propuesta para `.codarch.yml`.
 *
 * Es la consulta de `codarch suggest`: mira el grafo y deduce qué carpetas
 * están hacia dentro y cuáles hacia fuera. Propone; el equipo decide (ADR 0023).
 */
