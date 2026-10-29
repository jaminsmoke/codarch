import type { ScopesCommandOptions } from "../commands/scopes";
import { fail, isHelp, readValueFlag, type ValueFlag } from "../parse";
import { showUsage } from "../usage";

/** Las opciones con valor de `scopes`, en el orden en que se leen. */
const FLAGS: Array<ValueFlag<ScopesCommandOptions>> = [
  {
    names: ["--root"],
    hint: "una ruta",
    set: (options, value) => {
      options.root = value;
    }
  }
];

export function parseScopes(args: string[]): ScopesCommandOptions | number {
  const options: ScopesCommandOptions = { json: false, help: false };
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

  options.root = positional[0] ?? options.root;
  return options;
}
