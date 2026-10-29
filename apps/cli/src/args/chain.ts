import type { ChainCommandOptions } from "../commands/chain";
import {
  fail,
  isHelp,
  readSwitch,
  readValueFlag,
  type SwitchFlag,
  type ValueFlag
} from "../parse";
import { showUsage } from "../usage";

/** Las opciones con valor de `chain`, en el orden en que se leen. */
const FLAGS: Array<ValueFlag<ChainCommandOptions>> = [
  {
    names: ["--root"],
    hint: "una ruta",
    set: (options, value) => {
      options.root = value;
    }
  }
];

const SWITCHES: Array<SwitchFlag<ChainCommandOptions>> = [
  {
    names: ["--json"],
    set: (options) => {
      options.json = true;
    }
  },
  {
    names: ["--rebuild"],
    set: (options) => {
      options.rebuild = true;
    }
  }
];

/** `chain` acepta dos sueltos: el símbolo y la raíz, en ese orden. */
export function parseChain(args: string[]): ChainCommandOptions | number {
  const options: ChainCommandOptions = { json: false, rebuild: false, help: false };

  for (let index = 0; index < args.length; index++) {
    const flag = readValueFlag(args, index, options, FLAGS);
    if (flag && "error" in flag) return fail(flag.error);
    if (flag) {
      index = flag.next;
      continue;
    }

    const arg = args[index] as string;
    if (readSwitch(arg, options, SWITCHES)) continue;
    if (isHelp(arg)) return showUsage();
    if (arg.startsWith("-")) return fail(`opción desconocida: ${arg}`);
    if (!options.symbol) {
      options.symbol = arg;
    } else if (!options.root) {
      options.root = arg;
    } else {
      return fail(`sobra un argumento: ${arg}`);
    }
  }

  return options;
}
