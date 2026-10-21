import { sha256Hex } from "./hash";
import { walkFiles } from "./tree";
import type { CcJson, CcSymbol } from "./types";

/**
 * La vida de un símbolo: su cadena a lo largo del historial.
 *
 * Un símbolo no es su nombre: es su cuerpo. Por eso el hash del cuerpo es
 * su identidad ✓, y por eso la cadena sobrevive a los renombrados y a las
 * mudanzas ✓ (ADR 0026 ✓).
 *
 * Lo que **no** hace: inventarse Continuity. Si dos versiones no se parecen
 * en nada, la función se cuenta como eliminada y otra como añadida ✓. Una
 * cadena equivocada es peor que ninguna cadena ✓.
 */

/** Un cambio en la vida del símbolo. */
export interface SymbolEvent {
  type:
    | "created"
    | "changed"
    | "unchanged"
    | "renamed"
    | "moved"
    | "removed";
  /** El nombre anterior, si se renombró. */
  fromName?: string;
  /** La ruta anterior, si se mudó. */
  fromPath?: string;
  /** El cambio de complejidad, si se midió. */
  complexityDelta?: number | null;
}

/** Una versión del símbolo: un punto en la línea del tiempo. */
export interface ChainVersion {
  /** La foto del historial a la que pertenece. */
  entry: string;
  date: string;
  commit: string;
  name: string;
  path: string;
  kind: CcSymbol["kind"];
  /** El hash del cuerpo en esta versión. */
  bodyHash: string;
  /** La cabeza de la cadena después de esta versión. */
  head: string;
  events: SymbolEvent[];
  complexity: number | null;
  lines: number | null;
}

/** La cadena completa de un símbolo. */
export interface SymbolChain {
  /** El id que se acuñó cuando el símbolo nació. */
  id: string;
  kind: CcSymbol["kind"];
  /** El nombre actual. */
  name: string;
  /** La ruta actual. */
  path: string;
  versions: ChainVersion[];
}

/** Una foto del historial, para encadenar. */
export interface ChainStep {
  /** El checksum del snapshot: identifica la foto. */
  entry: string;
  date: string;
  commit: string;
  snapshot: CcJson;
}

/** Un símbolo vivo en una foto, con la cadena a la que pertenece. */
interface LiveSymbol {
  name: string;
  path: string;
  kind: CcSymbol["kind"];
  bodyHash: string;
  complexity: number | null;
  lines: number | null;
  line: number;
  chainId: string;
}

/**
 * Encadena las fotos del historial y devuelve la vida de cada símbolo.
 *
 * Las fotos van **en orden**: la cadena se construye comparando cada una con
 * la anterior ✓.
 */
export function buildChains(steps: readonly ChainStep[]): SymbolChain[] {
  const chains = new Map<string, SymbolChain>();
  let previous: LiveSymbol[] = [];

  for (const step of steps) {
    const current = liveSymbols(step.snapshot);

    // Los símbolos de antes que no se emparejaron con ninguno de ahora se
    // han ido: su cadena se cierra con el evento `removed` ✓.
    const matched = matchSymbols(previous, current);
    const used = new Set(matched.pairs.map((pair) => pair.previous));

    for (const pair of matched.pairs) {
      const before = pair.previous;
      const after = pair.current;
      const chain = chains.get(before.chainId);
      if (!chain) continue;
      // El símbolo de ahora es el mismo: hereda la cadena ✓.
      after.chainId = before.chainId;

      const events: SymbolEvent[] = [];
      if (before.name !== after.name) {
        events.push({ type: "renamed", fromName: before.name });
      }
      if (before.path !== after.path) {
        events.push({ type: "moved", fromPath: before.path });
      }
      if (before.bodyHash !== after.bodyHash) {
        events.push({
          type: "changed",
          complexityDelta: delta(before.complexity, after.complexity)
        });
      }
      if (events.length === 0) {
        events.push({ type: "unchanged" });
      }

      chain.versions.push(
        version(step, after, events, chainHead(chain))
      );
      chain.name = after.name;
      chain.path = after.path;
    }

    for (const symbol of current) {
      if (matched.pairs.some((pair) => pair.current === symbol)) continue;
      // Un símbolo nuevo: nace una cadena ✓.
      const id = sha256Hex(
        `chain:${symbol.bodyHash}|${symbol.name}|${symbol.path}|${step.entry}`
      );
      symbol.chainId = id;
      const chain: SymbolChain = {
        id,
        kind: symbol.kind,
        name: symbol.name,
        path: symbol.path,
        versions: []
      };
      chain.versions.push(
        version(step, symbol, [{ type: "created" }], null)
      );
      chains.set(id, chain);
    }

    for (const symbol of previous) {
      if (used.has(symbol)) continue;
      const chain = chains.get(symbol.chainId);
      if (!chain) continue;
      chain.versions.push(
        version(step, symbol, [{ type: "removed" }], chainHead(chain))
      );
    }

    previous = current;
  }

  return [...chains.values()].sort((left, right) =>
    left.name.localeCompare(right.name) || left.path.localeCompare(right.path)
  );
}

/** La cabeza de la cadena: el hash de su última versión. */
function chainHead(chain: SymbolChain): string {
  return chain.versions[chain.versions.length - 1]?.head ?? "";
}

function version(
  step: ChainStep,
  symbol: LiveSymbol,
  events: SymbolEvent[],
  previousHead: string | null
): ChainVersion {
  const head = sha256Hex(
    `${previousHead ?? ""}|${symbol.bodyHash}|${symbol.name}|${symbol.path}`
  );
  return {
    entry: step.entry,
    date: step.date,
    commit: step.commit,
    name: symbol.name,
    path: symbol.path,
    kind: symbol.kind,
    bodyHash: symbol.bodyHash,
    head,
    events,
    complexity: symbol.complexity,
    lines: symbol.lines
  };
}

/** Los símbolos de una foto, por ruta de fichero. */
function liveSymbols(snapshot: CcJson): LiveSymbol[] {
  const lens = snapshot.lenses?.symbols;
  if (!lens) return [];

  const paths = new Map<string, string>();
  for (const root of snapshot.files) {
    const prefix = `${root.name}/`;
    walkFiles([root], (entry) => {
      paths.set(
        entry.node.id,
        entry.path.startsWith(prefix) ? entry.path.slice(prefix.length) : entry.path
      );
    });
  }

  const symbols: LiveSymbol[] = [];
  for (const [id, list] of Object.entries(lens.nodes)) {
    const path = paths.get(id) ?? id;
    for (const symbol of list) {
      symbols.push({
        name: symbol.name,
        path,
        kind: symbol.kind,
        bodyHash: symbol.hash ?? "",
        complexity: symbol.complexity ?? null,
        lines: symbol.lines ?? null,
        line: symbol.line,
        chainId: ""
      });
    }
  }
  return symbols;
}

/**
 * Empareja los símbolos de antes con los de ahora.
 *
 * Las reglas van en orden: la primera que aplica gana ✓.
 */
function matchSymbols(
  previous: readonly LiveSymbol[],
  current: readonly LiveSymbol[]
): { pairs: Array<{ previous: LiveSymbol; current: LiveSymbol }> } {
  const pairs: Array<{ previous: LiveSymbol; current: LiveSymbol }> = [];
  const taken = new Set<LiveSymbol>();

  const take = (before: LiveSymbol | undefined, after: LiveSymbol): void => {
    if (!before || taken.has(before)) return;
    taken.add(before);
    pairs.push({ previous: before, current: after });
  };

  for (const after of current) {
    // 1. El mismo fichero y el mismo nombre ✓.
    take(
      previous.find(
        (before) =>
          !taken.has(before) &&
          before.path === after.path &&
          before.name === after.name
      ),
      after
    );
  }

  for (const after of current) {
    if (pairs.some((pair) => pair.current === after)) continue;
    // 2. El mismo fichero, otro nombre, el mismo cuerpo ✓: un renombrado ✓.
    take(
      closest(
        previous.filter(
          (before) =>
            !taken.has(before) &&
            before.path === after.path &&
            before.bodyHash === after.bodyHash &&
            before.bodyHash !== ""
        ),
        after
      ),
      after
    );
  }

  for (const after of current) {
    if (pairs.some((pair) => pair.current === after)) continue;
    // 3. Otro fichero, el mismo nombre y el mismo cuerpo ✓: una mudanza ✓.
    take(
      closest(
        previous.filter(
          (before) =>
            !taken.has(before) &&
            before.path !== after.path &&
            before.name === after.name &&
            before.bodyHash === after.bodyHash &&
            before.bodyHash !== ""
        ),
        after
      ),
      after
    );
  }

  for (const after of current) {
    if (pairs.some((pair) => pair.current === after)) continue;
    // 4. Otro fichero y otro nombre, pero el mismo cuerpo ✓.
    take(
      closest(
        previous.filter(
          (before) =>
            !taken.has(before) &&
            before.bodyHash === after.bodyHash &&
            before.bodyHash !== ""
        ),
        after
      ),
      after
    );
  }

  return { pairs };
}

/** El más cercano por línea: si hay varios candidatos, el de al lado ✓. */
function closest(
  candidates: readonly LiveSymbol[],
  after: LiveSymbol
): LiveSymbol | undefined {
  let best: LiveSymbol | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const distance = Math.abs(candidate.line - after.line);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

function delta(
  base: number | null,
  head: number | null
): number | null {
  if (base === null || head === null) return null;
  return head - base;
}
