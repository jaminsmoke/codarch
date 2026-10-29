import type { RenderCommandOptions } from "../commands/render";
import { fail, isHelp, isVersion, readValueFlag, type ValueFlag } from "../parse";
import { showUsage } from "../usage";
import { VERSION } from "../version";

/** Las opciones con valor de `render`, en el orden en que se leen. */
const FLAGS: Array<ValueFlag<RenderCommandOptions>> = [
  {
    names: ["--out", "-o"],
    hint: "una ruta",
    set: (options, value) => {
      options.out = value;
    }
  }
];

export function parseRender(args: string[]): RenderCommandOptions | number {
  const options: RenderCommandOptions = { help: false };
  const positional: string[] = [];

  for (let index = 0; index < args.length; index++) {
    const flag = readValueFlag(args, index, options, FLAGS);
    if (flag && "error" in flag) return fail(flag.error);
    if (flag) {
      index = flag.next;
      continue;
    }

    const arg = args[index] as string;
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
