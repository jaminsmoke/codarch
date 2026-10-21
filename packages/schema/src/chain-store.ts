import fs from "node:fs";
import path from "node:path";
import type { SymbolChain } from "./chains";

/**
 * El libro mayor: dónde se escriben las cadenas.
 *
 * Vive en `.codarch/`, **fuera** del historial compartido a propósito ✓: es un
 * artefacto **derivado** ✓ (se puede regenerar siempre desde las fotos ✓), así
 * que guardarlo en el repo solo añadiría conflictos y ruido ✓.
 *
 * La foto (el snapshot) es el dato ✓; el libro mayor es lo que se deriva de
 * ella ✓.
 */

export const CHAINS_FILE = "chains.json";

export interface ChainLedger {
  version: 1;
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
    if (parsed.version !== 1 || typeof parsed.chains !== "object") {
      return emptyLedger();
    }
    return {
      version: 1,
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      chains: parsed.chains ?? {}
    };
  } catch {
    return emptyLedger();
  }
}

/** Escribe el libro mayor en `.codarch/` ✓. */
export function writeChainLedger(
  root: string,
  ledger: ChainLedger
): string {
  const file = chainLedgerPath(root);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
  return file;
}

export function emptyLedger(): ChainLedger {
  return { version: 1, entries: [], chains: {} };
}

/** El libro mayor sirve si se construyó con las mismas fotos ✓. */
export function ledgerIsFresh(
  ledger: ChainLedger,
  entries: readonly string[]
): boolean {
  if (ledger.entries.length !== entries.length) return false;
  return ledger.entries.every((entry, index) => entry === entries[index]);
}
