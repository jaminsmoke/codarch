import path from "node:path";
import {
  loadChains,
  readHistoryIndex,
  type SymbolChain
} from "@codarch/schema";

/**
 * La vida de un símbolo: su cadena a lo largo del historial.
 *
 * El libro mayor (`.codarch/chains.json`) es un artefacto **derivado**: se
 * construye comparando las fotos del historial y se puede regenerar siempre ✓.
 */

export interface ChainCommandOptions {
  root?: string;
  /** El símbolo (o parte de su nombre) que se busca. */
  symbol?: string;
  json: boolean;
  /** Rehace el libro mayor aunque esté en caché. */
  rebuild: boolean;
  help: boolean;
}

export function runChain(options: ChainCommandOptions): number {
  const root = path.resolve(options.root ?? ".");
  const index = readHistoryIndex(root);

  if (index.entries.length === 0) {
    console.error(
      "no hay historial en este repositorio; se guarda con \"codarch analyze . --history\""
    );
    return 1;
  }

  const chains = loadChains(root, index.entries, options.rebuild);

  if (options.json) {
    console.log(JSON.stringify(chains, null, 2));
    return 0;
  }

  const wanted = (options.symbol ?? "").trim().toLowerCase();
  const matches = wanted
    ? chains.filter(
        (chain) =>
          chain.name.toLowerCase().includes(wanted) ||
          chain.path.toLowerCase().includes(wanted)
      )
    : chains;

  console.log("");
  console.log("  CodArch · la vida de los símbolos");
  console.log("");

  if (matches.length === 0) {
    console.log(
      wanted
        ? `  Ningún símbolo casa con "${options.symbol}".`
        : "  No hay símbolos en el historial."
    );
    console.log("");
    return 0;
  }

  for (const chain of matches.slice(0, 10)) {
    printChain(chain);
  }

  if (matches.length > 10) {
    console.log(`  … y ${matches.length - 10} símbolos más (usa --json para verlos todos).`);
    console.log("");
  }

  return 0;
}

/** Imprime la cadena de un símbolo: sus versiones y lo que pasó en cada una. */
function printChain(chain: SymbolChain): void {
  const events = chain.versions.map((version) =>
    version.events.map((event) => eventLabel(event.type)).join("+")
  );

  console.log(`  ${chain.name}  (${chain.kind})`);
  console.log(`    ${chain.path}`);
  console.log(`    id ${chain.id.slice(0, 12)} · ${chain.versions.length} versiones`);
  console.log("");

  for (const version of chain.versions) {
    const detail = events[chain.versions.indexOf(version)] ?? "";
    console.log(
      `    ${version.date.slice(0, 10)}  ${detail.padEnd(22)} ${version.path}`
    );
    if (version.events.some((event) => event.type === "renamed")) {
      const renamed = version.events.find((event) => event.type === "renamed");
      console.log(`      antes se llamaba ${renamed?.fromName ?? "?"}`);
    }
    if (version.events.some((event) => event.type === "changed")) {
      const changed = version.events.find((event) => event.type === "changed");
      const delta = changed?.complexityDelta;
      console.log(
        `      complejidad ${version.complexity ?? "?"}${
          delta === null || delta === undefined
            ? ""
            : ` (${delta > 0 ? "+" : ""}${delta})`
        }`
      );
    }
  }

  console.log("");
}

function eventLabel(type: string): string {
  switch (type) {
    case "created":
      return "nació";
    case "changed":
      return "cambió";
    case "renamed":
      return "renombrada";
    case "moved":
      return "mudada";
    case "removed":
      return "eliminada";
    default:
      return "igual";
  }
}
