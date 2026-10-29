import type { AnalyzeCommandOptions } from "../commands/analyze";
import {
  fail,
  isHelp,
  isVersion,
  readSwitch,
  readValueFlag,
  type SwitchFlag,
  type ValueFlag
} from "../parse";
import { showUsage } from "../usage";
import { VERSION } from "../version";

/** Las opciones con valor de `analyze`, en el orden en que se leen. */
const FLAGS: Array<ValueFlag<AnalyzeCommandOptions>> = [
  {
    names: ["--out", "-o"],
    hint: "una ruta",
    set: (options, value) => {
      options.out = value;
    }
  },
  {
    names: ["--ignore"],
    hint: "un patrón",
    set: (options, value) => {
      options.ignore?.push(value);
    }
  },
  {
    names: ["--config"],
    hint: "una ruta",
    set: (options, value) => {
      options.config = value;
    }
  },
  {
    names: ["--project"],
    hint: "un nombre",
    set: (options, value) => {
      options.projectName = value;
    }
  }
];

/** Los interruptores de `analyze`: lo que no lleva valor. */
const SWITCHES: Array<SwitchFlag<AnalyzeCommandOptions>> = [
  {
    names: ["--no-config"],
    set: (options) => {
      options.noConfig = true;
    }
  },
  {
    names: ["--no-git"],
    set: (options) => {
      options.git = false;
    }
  },
  {
    names: ["--history"],
    set: (options) => {
      options.history = true;
    }
  }
];

export function parseAnalyze(args: string[]): AnalyzeCommandOptions | number {
  const options: AnalyzeCommandOptions = { help: false, ignore: [] };
  const positional: string[] = [];

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
    if (isVersion(arg)) {
      console.log(VERSION);
      return 0;
    }
    if (arg.startsWith("-")) return fail(`opción desconocida: ${arg}`);
    positional.push(arg);
  }

  if (positional.length > 1) {
    return fail(`sobra un argumento: ${positional[1]}`);
  }

  options.root = positional[0] ?? ".";
  return options;
}
