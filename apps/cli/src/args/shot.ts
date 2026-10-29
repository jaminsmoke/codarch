import type { ShotCommandOptions } from "../commands/shot";
import {
  fail,
  integerInRange,
  isHelp,
  isVersion,
  readSwitch,
  readValueFlag,
  type SwitchFlag,
  type ValueFlag
} from "../parse";
import { showUsage } from "../usage";
import { VERSION } from "../version";

/** Las opciones con valor de `shot`, en el orden en que se leen. */
const FLAGS: Array<ValueFlag<ShotCommandOptions>> = [
  {
    names: ["--area"],
    hint: "el nombre de una métrica",
    set: (options, value) => {
      options.area = value;
    }
  },
  {
    names: ["--color"],
    hint: "risk, structure o el nombre de una métrica",
    set: (options, value) => {
      options.color = value;
    }
  },
  {
    names: ["--out", "-o"],
    hint: "una ruta",
    set: (options, value) => {
      options.out = value;
    }
  },
  {
    names: ["--width"],
    hint: "los píxeles de ancho",
    set: (options, value) => {
      const width = integerInRange(value, 160, 4096);
      if (width === null) return "el ancho tiene que estar entre 160 y 4096";
      options.width = width;
    }
  },
  {
    names: ["--height"],
    hint: "los píxeles de alto",
    set: (options, value) => {
      const height = integerInRange(value, 160, 4096);
      if (height === null) return "el alto tiene que estar entre 160 y 4096";
      options.height = height;
    }
  }
];

const SWITCHES: Array<SwitchFlag<ShotCommandOptions>> = [
  {
    names: ["--json"],
    set: (options) => {
      options.json = true;
    }
  }
];

export function parseShot(args: string[]): ShotCommandOptions | number {
  const options: ShotCommandOptions = { help: false, json: false };
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

  options.file = positional[0];
  return options;
}
