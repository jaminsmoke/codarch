import type { HistoryCommandOptions } from "../commands/history";
import type { ValueFlag } from "../parse";
import { parseCommandArgs } from "./command";

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
  return parseCommandArgs(args, options, FLAGS, (parsed, positional) => {
    parsed.root = positional[0];
    return parsed;
  });
}
