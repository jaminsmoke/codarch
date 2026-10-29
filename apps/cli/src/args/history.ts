import type { HistoryCommandOptions } from "../commands/history";
import { fail, isHelp, readValueFlag, type ValueFlag } from "../parse";
import { showUsage } from "../usage";

/** Las opciones con valor de `history`, en el orden en que se leen. */
const FLAGS: Array<ValueFlag<HistoryCommandOptions>> = [
  {
    names: ["--from"],
    hint: "un identificador de foto",
    set: (options, value) => {
      options.from = value;
    }
  },
  {
    names: ["--to"],
    hint: "un identificador de foto",
    set: (options, value) => {
      options.to = value;
    }
  },
  {
    names: ["--out", "-o"],
    hint: "una ruta",
    set: (options, value) => {
      options.out = value;
    }
  }
];

export function parseHistory(args: string[]): HistoryCommandOptions | number {
  const options: HistoryCommandOptions = { json: false, help: false };
  const positional: string[] = [];

  for (let index = 0; index < args.length; index++) {
    const flag = readValueFlag(args, index, options, FLAGS);
    if (flag && "error" in flag) return fail(flag.error);
    if (flag) {
      index = flag.next;
      continue;
    }

    const arg = args[index] as string;
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (isHelp(arg)) return showUsage();
    if (arg.startsWith("-")) return fail(`opción desconocida: ${arg}`);
    positional.push(arg);
  }

  if (positional.length > 1) {
    return fail(`sobra un argumento: ${positional[1]}`);
  }

  options.root = positional[0];
  return options;
}
