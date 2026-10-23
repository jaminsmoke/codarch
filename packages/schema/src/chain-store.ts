import fs from "node:fs";
import path from "node:path";
import { CHAIN_LEDGER_VERSION } from "@codarch/versions";
import {
  buildChains,
  findSymbolChains,
  summarizeChains,
  type SymbolChain,
  type SymbolHeat
} from "./chains";
import { historyFileName } from "./history";
import { readHistoryIndex } from "./history-store";
import { historyLocation } from "./history-store";
import { parseCcJson } from "./parse";
import type { ChainStep } from "./chains";
import type { CcJson } from "./types";
import type { HistoryEntry } from "./history";

/**
 * El libro mayor: dónde se escriben las cadenas.
 *
 * Vive en `.codarch/`, **fuera** del historial compartido a propósito: es un
 * artefacto **derivado** (se puede regenerar siempre desde las fotos), así que
 * guardarlo en el repo solo añadiría conflictos y ruido. Las fotos
 * (`.codarch-history/`) son el dato; el libro mayor es lo que se deriva de
 * ellas.
 */

export const CHAINS_FILE = "chains.json";

export interface ChainLedger {
  version: typeof CHAIN_LEDGER_VERSION;
  /** Los checksums de las fotos con las que se construyó, en orden. */
  entries: string[];
  /** Las cadenas, por su id. */
  chains: Record<string, SymbolChain>;
}

export function chainLedgerPath(root: string): string {
  return path.join(root, ".codarch", CHAINS_FILE);
}

/** Lee el libro mayor; si no hay o no se entiende, uno vacío. */
export function readChainLedger(root: string): ChainLedger {
  try {
    const raw = fs.readFileSync(chainLedgerPath(root), "utf8");
    const parsed = JSON.parse(raw) as ChainLedger;
    if (
      parsed.version !== CHAIN_LEDGER_VERSION ||
      typeof parsed.chains !== "object"
    ) {
      return emptyLedger();
    }
    return {
      version: CHAIN_LEDGER_VERSION,
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      chains: parsed.chains ?? {}
    };
  } catch {
    return emptyLedger();
  }
}

/** Escribe el libro mayor en `.codarch/`. */
export function writeChainLedger(root: string, ledger: ChainLedger): string {
  const file = chainLedgerPath(root);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
  return file;
}

export function emptyLedger(): ChainLedger {
  return { version: CHAIN_LEDGER_VERSION, entries: [], chains: {} };
}

/** El libro mayor sirve si se construyó con las mismas fotos. */
export function ledgerIsFresh(
  ledger: ChainLedger,
  entries: readonly string[]
): boolean {
  if (ledger.entries.length !== entries.length) return false;
  return ledger.entries.every((entry, index) => entry === entries[index]);
}

/**
 * El libro mayor: de la caché si está al día, y si no, se construye.
 *
 * Es derivado: se puede borrar y volver a hacer sin perder nada.
 */
export function loadChains(
  root: string,
  entries: readonly HistoryEntry[],
  rebuild = false
): SymbolChain[] {
  const checksums = entries.map((entry) => entry.checksum);

  if (!rebuild) {
    const ledger = readChainLedger(root);
    if (ledgerIsFresh(ledger, checksums)) {
      return Object.values(ledger.chains);
    }
  }

  const steps: ChainStep[] = [];
  for (const entry of entries) {
    const snapshot = readSnapshot(root, entry);
    if (!snapshot) continue;
    steps.push({
      entry: entry.checksum,
      date: entry.date,
      commit: entry.commit,
      snapshot
    });
  }

  const chains = buildChains(steps);
  writeChainLedger(root, {
    version: CHAIN_LEDGER_VERSION,
    entries: steps.map((step) => step.entry),
    chains: Object.fromEntries(chains.map((chain) => [chain.id, chain]))
  });

  return chains;
}

/**
 * Lo que la aplicación pide: la cadena de un símbolo o el calor del repo.
 *
 * Vive aquí y no en la aplicación porque las dos lo necesitan igual: la web por
 * HTTP y el escritorio por IPC ✓.
 */
export interface ChainsPayload {
  available: boolean;
  /** Cuántas fotos tiene la línea del tiempo. */
  entries: number;
  /** Las cadenas que casan con lo pedido. */
  chains: SymbolChain[];
  /** Los símbolos más ruidosos del repo. */
  heat: SymbolHeat[];
}

export function chainsPayload(
  root: string,
  symbol: string | null,
  limit = 20
): ChainsPayload {
  const index = readHistoryIndex(root);
  if (index.entries.length === 0) {
    return { available: false, entries: 0, chains: [], heat: [] };
  }

  const chains = loadChains(root, index.entries);
  const heat = summarizeChains(chains, 10);

  if (!symbol || symbol.trim() === "") {
    return { available: true, entries: index.entries.length, chains: [], heat };
  }

  const max = Number.isFinite(limit)
    ? Math.max(0, Math.min(50, Math.trunc(limit)))
    : 20;
  return {
    available: true,
    entries: index.entries.length,
    chains: findSymbolChains(chains, symbol, max),
    heat
  };
}

function readSnapshot(root: string, entry: HistoryEntry): CcJson | null {
  const file = path.join(historyLocation(root).directory, historyFileName(entry));
  try {
    return parseCcJson(JSON.parse(fs.readFileSync(file, "utf8")) as unknown);
  } catch {
    return null;
  }
}
