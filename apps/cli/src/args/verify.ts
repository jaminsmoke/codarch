import type { VerifyCommandOptions } from "../commands/verify";
import { fail, isHelp, readValueFlag, type ValueFlag } from "../parse";
import { showUsage } from "../usage";

/** Las opciones con valor de `verify`, en el orden en que se leen. */
const FLAGS: Array<ValueFlag<VerifyCommandOptions>> = [
  {
    names: ["--root"],
    hint: "una ruta",
    set: (options, value) => {
      options.root = value;
    }
  }
];

/** `verify` no lleva rutas sueltas: lo que no es opción, es un error. */
export function parseVerify(args: string[]): VerifyCommandOptions | number {
  const options: VerifyCommandOptions = { json: false, help: false };

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
    return fail(`opción desconocida: ${arg}`);
  }

  return options;
}
