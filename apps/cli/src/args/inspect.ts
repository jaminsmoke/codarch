import type { InspectOptions } from "../commands/inspect";
import {
  fail,
  integerInRange,
  isHelp,
  isVersion,
  readValueFlag,
  type ValueFlag
} from "../parse";
import { showUsage } from "../usage";
import { VERSION } from "../version";

/** Las opciones con valor de `inspect`, en el orden en que se leen. */
const FLAGS: Array<ValueFlag<InspectOptions>> = [
  {
    names: ["--top"],
    hint: "un entero positivo",
    set: (options, value) => {
      const top = integerInRange(value, 1);
      if (top === null) return "--top necesita un entero positivo";
      options.top = top;
    }
  },
  {
    names: ["--metric"],
    hint: "un nombre",
    set: (options, value) => {
      options.metric = value;
    }
  }
];

/** `inspect` se queda con el primer fichero; lo demás no se mira. */
export function parseInspect(args: string[]): InspectOptions | number {
  const options: InspectOptions = { json: false, top: 5, help: false };
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
    if (isVersion(arg)) {
      console.log(VERSION);
      return 0;
    }
    if (arg.startsWith("-")) return fail(`opción desconocida: ${arg}`);
    positional.push(arg);
  }

  options.file = positional[0];
  return options;
}
