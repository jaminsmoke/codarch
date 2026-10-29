#!/usr/bin/env node
import { runAnalyze } from "./commands/analyze";
import { runLintCommand } from "./commands/lint";
import { runDiff } from "./commands/diff";
import { runInspect } from "./commands/inspect";
import { runRender } from "./commands/render";
import { runShot } from "./commands/shot";
import { runServe } from "./commands/serve";
import { runProfiles } from "./commands/profiles";
import { runHistory } from "./commands/history";
import { runScopes } from "./commands/scopes";
import { runChain } from "./commands/chain";
import { runVerify } from "./commands/verify";
import { runSuggest } from "./commands/suggest";
import { runAddons } from "./commands/addons";
import { runPlugins } from "./commands/plugins";
import { runVersion } from "./commands/version";

import { parseAnalyze } from "./args/analyze";
import { parseLint } from "./args/lint";
import { parseInspect } from "./args/inspect";
import { parseRender } from "./args/render";
import { parseShot } from "./args/shot";
import { parseDiff } from "./args/diff";
import { parseServe } from "./args/serve";
import { parseHistory } from "./args/history";
import { parseScopes } from "./args/scopes";
import { parseChain } from "./args/chain";
import { parseVerify } from "./args/verify";
import { parseSuggest } from "./args/suggest";
import { parseInstalled } from "./args/installed";
import { parseVersion } from "./args/version";
import { showUsage, USAGE } from "./usage";
import { VERSION } from "./version";

/**
 * Las órdenes de `codarch`.
 *
 * Cada comando es su parser más su ejecución, y todos cumplen el mismo trato:
 * si el parseo devuelve un número, ese es el código de salida; si devuelve
 * opciones, se ejecutan. Los parsers viven en `args/` para que este fichero
 * solo diga **qué hay** y no cómo se lee cada opción.
 */

/** Parseo y ejecución en un paso, con el código de salida del parseo. */
function runParsed<T>(
  parse: (args: string[]) => T | number,
  run: (options: T) => number,
  args: string[]
): number {
  const parsed = parse(args);
  if (typeof parsed === "number") return parsed;
  return run(parsed);
}

/**
 * `version` no puede esperar al código de salida: con `--check` va a la red y
 * lo pone cuando contesta, para que el comando termine enseguida.
 */
function runVersionCommand(args: string[]): number {
  const parsed = parseVersion(args);
  if (typeof parsed === "number") return parsed;
  void runVersion(parsed).then((code) => {
    process.exitCode = code;
  });
  return 0;
}

/**
 * `lint` lanza procesos y espera a que todos terminen, así que su código de
 * salida llega cuando llega; como `version --check`, no bloquea el despacho.
 */
function runLintCommandAsync(args: string[]): number {
  const parsed = parseLint(args);
  if (typeof parsed === "number") return parsed;
  void runLintCommand(parsed).then((code) => {
    process.exitCode = code;
  });
  return 0;
}

const COMMANDS: Record<string, (args: string[]) => number> = {
  analyze: (args) => runParsed(parseAnalyze, runAnalyze, args),
  lint: runLintCommandAsync,
  inspect: (args) => runParsed(parseInspect, runInspect, args),
  render: (args) => runParsed(parseRender, runRender, args),
  shot: (args) => runParsed(parseShot, runShot, args),
  diff: (args) => runParsed(parseDiff, runDiff, args),
  serve: (args) =>
    runParsed(
      parseServe,
      // La ayuda de serve se decide aquí: junto a una opción inválida es error.
      (options) => (options.help ? showUsage() : runServe(options)),
      args
    ),
  profiles: (args) => runProfiles(args.includes("--json")),
  suggest: (args) => runParsed(parseSuggest, runSuggest, args),
  history: (args) => runParsed(parseHistory, runHistory, args),
  scopes: (args) => runParsed(parseScopes, runScopes, args),
  chain: (args) => runParsed(parseChain, runChain, args),
  verify: (args) => runParsed(parseVerify, runVerify, args),
  addons: (args) =>
    runParsed((rest) => parseInstalled(rest, "addons"), runAddons, args),
  plugins: (args) =>
    runParsed((rest) => parseInstalled(rest, "plugins"), runPlugins, args),
  version: runVersionCommand
};

function main(argv: string[]): number {
  const [command, ...rest] = argv;

  if (!command || command === "--help" || command === "-h") {
    return showUsage();
  }

  if (command === "--version" || command === "-v") {
    console.log(VERSION);
    return 0;
  }

  const run = COMMANDS[command];
  if (run) return run(rest);

  console.error(`comando desconocido: ${command}\n${USAGE}`);
  return 1;
}

process.exitCode = main(process.argv.slice(2));
