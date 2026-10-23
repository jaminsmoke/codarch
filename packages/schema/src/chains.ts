import { sha256Hex } from "./hash";
import { walkTree } from "./tree";
import type { CcJson, CcNode, CcSymbol } from "./types";

/**
 * La vida de un símbolo: su cadena a lo largo del historial.
 *
 * Un símbolo no es su nombre: es su cuerpo. Por eso el hash del cuerpo es
 * su identidad, y por eso la cadena sobrevive a los renombrados y a las
 * mudanzas (ADR 0026).
 *
 * Lo que **no** hace: inventarse Continuity. Si dos versiones no se parecen
 * en nada, la función se cuenta como eliminada y otra como añadida. Una
 * cadena equivocada es peor que ninguna cadena.
 */

/**
 * El nivel de la cadena.
 *
 * Los niveles se **anidan**: el cuerpo de un padre se compromete con los
 * cuerpos de sus hijos (un árbol de Merkle). Así, la cabeza del proyecto no se
 * puede mover sin que se muevan las de abajo.
 */
export type ChainLevel = "symbol" | "file" | "folder" | "project";

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
  kind: ChainLevel;
  /** El hash del cuerpo en esta versión. */
  bodyHash: string;
  /** La cabeza de la cadena después de esta versión. */
  head: string;
  events: SymbolEvent[];
  complexity: number | null;
  lines: number | null;
}

/** La cadena completa de un nodo del repo. */
export interface SymbolChain {
  /** El id que se acuñó cuando nació. */
  id: string;
  /** El nivel: símbolo, fichero, carpeta o proyecto. */
  level: ChainLevel;
  kind: CcSymbol["kind"] | "file" | "folder" | "project";
  /** El nombre actual. */
  name: string;
  /** La ruta actual. */
  path: string;
  versions: ChainVersion[];
}

const SYMBOL_KINDS: readonly CcSymbol["kind"][] = [
  "function",
  "class",
  "interface",
  "type",
  "enum",
  "variable"
];

/** Si el `kind` de una cadena es el de un símbolo y no el de un nodo. */
function isSymbolKind(kind: SymbolChain["kind"]): kind is CcSymbol["kind"] {
  return (SYMBOL_KINDS as readonly string[]).includes(kind);
}

/**
 * Las cadenas de símbolo que casan con una búsqueda.
 *
 * Mira el nombre y la ruta actuales y también los de cada versión: un
 * renombrado o una mudanza no hacen que el símbolo deje de encontrarse por
 * como se llamaba antes. Nunca devuelve ficheros, carpetas ni el proyecto.
 */
export function findSymbolChains(
  chains: readonly SymbolChain[],
  symbol: string,
  limit = Number.POSITIVE_INFINITY
): SymbolChain[] {
  const needle = symbol.trim().toLowerCase();
  if (!needle) return [];

  const matches = chains.filter((chain) => {
    if (chain.level !== "symbol") return false;
    if (
      chain.name.toLowerCase().includes(needle) ||
      chain.path.toLowerCase().includes(needle)
    ) {
      return true;
    }
    return chain.versions.some(
      (version) =>
        version.name.toLowerCase().includes(needle) ||
        version.path.toLowerCase().includes(needle)
    );
  });

  return matches.slice(0, Math.max(0, limit));
}

/** Una foto del historial, para encadenar. */
export interface ChainStep {
  /** El checksum del snapshot: identifica la foto. */
  entry: string;
  date: string;
  commit: string;
  snapshot: CcJson;
}

/** Un nodo vivo en una foto, con la cadena a la que pertenece. */
interface LiveNode {
  level: ChainLevel;
  kind: SymbolChain["kind"];
  name: string;
  path: string;
  bodyHash: string;
  complexity: number | null;
  lines: number | null;
  line: number;
  chainId: string;
}

/**
 * Encadena las fotos del historial y devuelve la vida de cada nodo.
 *
 * Las fotos van **en orden**: la cadena se construye comparando cada una con
 * la anterior.
 */
export function buildChains(steps: readonly ChainStep[]): SymbolChain[] {
  const chains = new Map<string, SymbolChain>();
  let previous: LiveNode[] = [];

  for (const step of steps) {
    const current = liveNodes(step.snapshot);

    // Los nodos de antes que no se emparejaron con ninguno de ahora se han
    // ido: su cadena se cierra con el evento `removed`.
    const matched = matchNodes(previous, current);
    const used = new Set(matched.pairs.map((pair) => pair.previous));

    for (const pair of matched.pairs) {
      const before = pair.previous;
      const after = pair.current;
      const chain = chains.get(before.chainId);
      if (!chain) continue;
      // El nodo de ahora es el mismo: hereda la cadena.
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

      chain.versions.push(version(step, after, events, chainHead(chain)));
      chain.kind = after.kind;
      chain.name = after.name;
      chain.path = after.path;
    }

    for (const node of current) {
      if (matched.pairs.some((pair) => pair.current === node)) continue;
      // Un nodo nuevo: nace una cadena.
      const id = sha256Hex(
        `chain:${node.level}:${node.bodyHash}|${node.name}|${node.path}|${step.entry}`
      );
      node.chainId = id;
      const chain: SymbolChain = {
        id,
        level: node.level,
        kind: node.kind,
        name: node.name,
        path: node.path,
        versions: []
      };
      chain.versions.push(version(step, node, [{ type: "created" }], null));
      chains.set(id, chain);
    }

    for (const node of previous) {
      if (used.has(node)) continue;
      const chain = chains.get(node.chainId);
      if (!chain) continue;
      chain.versions.push(version(step, node, [{ type: "removed" }], chainHead(chain)));
    }

    previous = current;
  }

  return [...chains.values()].sort(
    (left, right) =>
      levelOrder(left.level) - levelOrder(right.level) ||
      left.name.localeCompare(right.name) ||
      left.path.localeCompare(right.path)
  );
}

function levelOrder(level: ChainLevel): number {
  switch (level) {
    case "symbol":
      return 0;
    case "file":
      return 1;
    case "folder":
      return 2;
    default:
      return 3;
  }
}

/** La cabeza de la cadena: el hash de su última versión. */
function chainHead(chain: SymbolChain): string {
  return chain.versions[chain.versions.length - 1]?.head ?? "";
}

function version(
  step: ChainStep,
  node: LiveNode,
  events: SymbolEvent[],
  previousHead: string | null
): ChainVersion {
  const head = sha256Hex(
    `${previousHead ?? ""}|${node.bodyHash}|${node.name}|${node.path}`
  );
  return {
    entry: step.entry,
    date: step.date,
    commit: step.commit,
    name: node.name,
    path: node.path,
    kind: node.level,
    bodyHash: node.bodyHash,
    head,
    events,
    complexity: node.complexity,
    lines: node.lines
  };
}

/**
 * Los nodos de una foto, en los cuatro niveles.
 *
 * El cuerpo de cada padre se compone con los de sus hijos ✓: así el hash de
 * una carpeta depende de lo que hay dentro ✓, y el del proyecto de todo ✓.
 */
function liveNodes(snapshot: CcJson): LiveNode[] {
  const nodes: LiveNode[] = [];
  const lens = snapshot.lenses?.symbols;

  // Las rutas, sin el nombre de la raíz: como en el diff.
  const paths = new Map<string, string>();
  for (const root of snapshot.files) {
    const prefix = `${root.name}/`;
    walkTree([root], (entry) => {
      paths.set(
        entry.node.id,
        entry.path.startsWith(prefix) ? entry.path.slice(prefix.length) : entry.path
      );
    });
  }

  // 1. Los símbolos: su cuerpo son sus tokens.
  const symbolsByFile = new Map<string, CcSymbol[]>();
  for (const [id, list] of Object.entries(lens?.nodes ?? {})) {
    symbolsByFile.set(id, list);
    for (const symbol of list) {
      nodes.push({
        level: "symbol",
        kind: symbol.kind,
        name: symbol.name,
        path: paths.get(id) ?? id,
        bodyHash: symbol.hash ?? "",
        complexity: symbol.complexity ?? null,
        lines: symbol.lines ?? null,
        line: symbol.line,
        chainId: ""
      });
    }
  }

  // 2. Los ficheros: su cuerpo son sus símbolos y sus métricas.
  const attributes = snapshot.lenses?.metrics?.attributes ?? {};
  const fileBodies = new Map<string, string>();
  for (const root of snapshot.files) {
    walkTree([root], (entry) => {
      if (entry.node.type !== "File") return;
      const id = entry.node.id;
      const symbols = symbolsByFile.get(id) ?? [];
      const metrics = attributes[id] ?? {};
      const parts = [
        ...symbols.map((symbol) => symbol.hash ?? ""),
        ...Object.keys(metrics)
          .sort()
          .map((key) => `${key}=${metrics[key]}`)
      ];
      const bodyHash = sha256Hex(parts.join("|"));
      fileBodies.set(id, bodyHash);
      nodes.push({
        level: "file",
        kind: "file",
        name: entry.node.name,
        path: paths.get(id) ?? entry.node.name,
        bodyHash,
        complexity: metrics.maxComplexity ?? null,
        lines: metrics.rloc ?? null,
        line: 0,
        chainId: ""
      });
    });
  }

  // 3. Las carpetas: su cuerpo son las cabezas de sus hijos.
  const folderBodies = new Map<string, string>();
  const visit = (node: CcNode, path: string): string => {
    if (node.type === "File") {
      return fileBodies.get(node.id) ?? "";
    }
    const childBodies: string[] = [];
    for (const child of node.children ?? []) {
      childBodies.push(visit(child, path ? `${path}/${child.name}` : child.name));
    }
    const bodyHash = sha256Hex(childBodies.join("|"));
    if (path) {
      folderBodies.set(path, bodyHash);
      nodes.push({
        level: "folder",
        kind: "folder",
        name: node.name,
        path,
        bodyHash,
        complexity: null,
        lines: null,
        line: 0,
        chainId: ""
      });
    }
    return bodyHash;
  };

  for (const root of snapshot.files) {
    const bodyHash = visit(root, "");
    nodes.push({
      level: "project",
      kind: "project",
      name: root.name,
      path: "",
      bodyHash,
      complexity: null,
      lines: null,
      line: 0,
      chainId: ""
    });
  }

  return nodes;
}

/**
 * Empareja los nodos de antes con los de ahora.
 *
 * Las reglas van en orden: la primera que aplica gana.
 */
function matchNodes(
  previous: readonly LiveNode[],
  current: readonly LiveNode[]
): { pairs: Array<{ previous: LiveNode; current: LiveNode }> } {
  const pairs: Array<{ previous: LiveNode; current: LiveNode }> = [];
  const taken = new Set<LiveNode>();

  const take = (before: LiveNode | undefined, after: LiveNode): void => {
    if (!before || taken.has(before)) return;
    taken.add(before);
    pairs.push({ previous: before, current: after });
  };

  const sameLevel = (level: ChainLevel) => (node: LiveNode) =>
    node.level === level;

  for (const level of ["symbol", "file", "folder", "project"] as ChainLevel[]) {
    // 1. El mismo sitio y el mismo nombre.
    for (const after of current.filter(sameLevel(level))) {
      take(
        previous.find(
          (before) =>
            !taken.has(before) &&
            before.level === level &&
            before.path === after.path &&
            before.name === after.name
        ),
        after
      );
    }

    // 2. El mismo sitio, otro nombre, el mismo cuerpo: un renombrado.
    for (const after of current.filter(sameLevel(level))) {
      if (pairs.some((pair) => pair.current === after)) continue;
      take(
        closest(
          previous.filter(
            (before) =>
              !taken.has(before) &&
              before.level === level &&
              before.path === after.path &&
              before.bodyHash === after.bodyHash &&
              before.bodyHash !== ""
          ),
          after
        ),
        after
      );
    }

    // 3. Otro sitio, el mismo nombre y el mismo cuerpo: una mudanza.
    for (const after of current.filter(sameLevel(level))) {
      if (pairs.some((pair) => pair.current === after)) continue;
      take(
        closest(
          previous.filter(
            (before) =>
              !taken.has(before) &&
              before.level === level &&
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

    // 4. Otro sitio y otro nombre, pero el mismo cuerpo.
    for (const after of current.filter(sameLevel(level))) {
      if (pairs.some((pair) => pair.current === after)) continue;
      take(
        closest(
          previous.filter(
            (before) =>
              !taken.has(before) &&
              before.level === level &&
              before.bodyHash === after.bodyHash &&
              before.bodyHash !== ""
          ),
          after
        ),
        after
      );
    }
  }

  return { pairs };
}

/** El más cercano por línea: si hay varios candidatos, el de al lado. */
function closest(
  candidates: readonly LiveNode[],
  after: LiveNode
): LiveNode | undefined {
  let best: LiveNode | undefined;
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

function delta(base: number | null, head: number | null): number | null {
  if (base === null || head === null) return null;
  return head - base;
}

/**
 * El calor de un símbolo: cuántas veces se ha reescrito.
 *
 * A nivel de fichero no existe esta señal: un fichero con veinte funciones
 * que no se tocan y otro con una que se reescribe cada semana pesan lo mismo.
 * Aquí no.
 */
export interface SymbolHeat {
  id: string;
  name: string;
  path: string;
  kind: CcSymbol["kind"];
  /** Cuántas versiones tiene en la cadena. */
  versions: number;
  /** Cuántas veces cambió de verdad. */
  changes: number;
  /** Cuántas veces se renombró o se mudó. */
  moves: number;
  /**
   * El ruido total: cambios y mudanzas juntos.
   *
   * Un renombrado también es curro: la función sigue siendo la misma, pero
   * quien la usa tiene que buscarla otra vez.
   */
  churn: number;
  complexity: number | null;
}

/**
 * Los símbolos más reescritos.
 *
 * Ordena por ruido total y, a empate, por cambios de verdad.
 */
export function summarizeChains(
  chains: readonly SymbolChain[],
  limit = 10
): SymbolHeat[] {
  const heat: SymbolHeat[] = chains
    .filter((chain) => chain.level === "symbol")
    .map((chain) => {
      let changes = 0;
      let moves = 0;
      for (const version of chain.versions) {
        for (const event of version.events) {
          if (event.type === "changed") changes++;
          else if (event.type === "renamed" || event.type === "moved") moves++;
        }
      }
      const last = chain.versions[chain.versions.length - 1];
      return {
        id: chain.id,
        name: chain.name,
        path: chain.path,
        kind: isSymbolKind(chain.kind) ? chain.kind : "function",
        versions: chain.versions.length,
        changes,
        moves,
        churn: changes + moves,
        complexity: last?.complexity ?? null
      };
    });

  heat.sort(
    (left, right) =>
      right.churn - left.churn ||
      right.changes - left.changes ||
      left.name.localeCompare(right.name)
  );

  return heat.slice(0, limit);
}

/** El resultado de comprobar el snapshot contra el libro mayor. */
export interface ChainVerification {
  /** Si todo cuadra. */
  ok: boolean;
  /** Los nodos del snapshot que no encajan con su cadena. */
  mismatches: Array<{ name: string; path: string; reason: string }>;
  /** La cabeza de la cadena del proyecto. */
  projectHead: string;
  /** La foto a la que corresponde el snapshot. */
  entry: string | null;
  /** Cuántos nodos se han comprobado. */
  checked: number;
}

/**
 * Comprueba que el snapshot encaja con el libro mayor.
 *
 * Cada símbolo del snapshot tiene que ser la última versión de su cadena ✓:
 * si el hash del cuerpo no es el de la cadena, el snapshot y la historia
 * cuentan historias distintas ✓.
 */
export function verifyChains(
  chains: readonly SymbolChain[],
  snapshot: CcJson
): ChainVerification {
  const mismatches: ChainVerification["mismatches"] = [];
  const project = chains.find((chain) => chain.level === "project");
  const projectHead = project ? chainHead(project) : "";

  const byName = new Map<string, SymbolChain>();
  for (const chain of chains) {
    if (chain.level !== "symbol") continue;
    byName.set(`${chain.path}::${chain.name}`, chain);
  }

  let checked = 0;
  let snapshotEntry: string | null = null;

  for (const root of snapshot.files) {
    const prefix = `${root.name}/`;
    walkTree([root], (entry) => {
      if (entry.node.type !== "File") return;
      const path = entry.path.startsWith(prefix)
        ? entry.path.slice(prefix.length)
        : entry.path;
      const symbols = snapshot.lenses?.symbols?.nodes[entry.node.id] ?? [];
      for (const symbol of symbols) {
        checked++;
        const chain = byName.get(`${path}::${symbol.name}`);
        if (!chain) {
          mismatches.push({
            name: symbol.name,
            path,
            reason: "este símbolo no tiene cadena"
          });
          continue;
        }
        const last = chain.versions[chain.versions.length - 1];
        if (!last) {
          mismatches.push({
            name: symbol.name,
            path,
            reason: "la cadena está vacía"
          });
          continue;
        }
        snapshotEntry = last.entry;
        if ((symbol.hash ?? "") !== last.bodyHash) {
          mismatches.push({
            name: symbol.name,
            path,
            reason: "el hash del cuerpo no es el de la cadena"
          });
        }
      }
    });
  }

  return {
    ok: mismatches.length === 0,
    mismatches,
    projectHead,
    entry: snapshotEntry,
    checked
  };
}
