import type { LintCommandOptions } from "../commands/lint";
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

/** Las opciones con valor de `lint`, en el orden en que se leen. */
const FLAGS: Array<ValueFlag<LintCommandOptions>> = [
  {
    names: ["--out", "-o"],
    hint: "una ruta",
    set: (options, value) => {
      options.out = value;
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
    names: ["--fail-on"],
    hint: "never, errors o warnings",
    set: (options, value) => {
      if (value !== "never" && value !== "errors" && value !== "warnings") {
        return "`--fail-on` acepta never, errors o warnings";
      }
      options.failOn = value;
    }
  }
];

/** Los interruptores de `lint`: lo que no lleva valor. */
const SWITCHES: Array<SwitchFlag<LintCommandOptions>> = [
  {
    names: ["--no-config"],
    set: (options) => {
      options.noConfig = true;
    }
  }
];

export function parseLint(args: string[]): LintCommandOptions | number {
  const options: LintCommandOptions = { help: false, failOn: "never" };
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
