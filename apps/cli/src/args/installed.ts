import type { InstalledOptions } from "../commands/installed";
import { fail, isHelp, readValueFlag, type ValueFlag } from "../parse";
import { showUsage } from "../usage";

const ACTIONS: ReadonlyArray<InstalledOptions["action"]> = [
  "list",
  "add",
  "remove"
];

/** Las opciones con valor de `addons` y `plugins`, en el orden en que se leen. */
const FLAGS: Array<ValueFlag<InstalledOptions>> = [
  {
    names: ["--root"],
    hint: "una ruta",
    // `addons` y `plugins` nunca aceptaron `--root=ruta`: solo la forma separada.
    inline: false,
    set: (options, value) => {
      options.root = value;
    }
  }
];

/**
 * Los argumentos de `addons` y `plugins`, que son los mismos.
 *
 * El primero que no es opción es la acción y el siguiente el destino: no valen
 * dos destinos ni una acción que no esté en la lista.
 */
export function parseInstalled(
  args: string[],
  command: "addons" | "plugins"
): InstalledOptions | number {
  const options: InstalledOptions = { action: "list", root: ".", json: false };
  const positional: string[] = [];
  let action: InstalledOptions["action"] | null = null;

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

    if (action !== null) {
      positional.push(arg);
      continue;
    }
    if (!ACTIONS.includes(arg as InstalledOptions["action"])) {
      return fail(
        `acción desconocida: ${arg} (list, add o remove)\n\n  codarch ${command} list`
      );
    }
    action = arg as InstalledOptions["action"];
  }

  options.action = action ?? "list";
  if (positional.length > 1) {
    return fail(`sobra un argumento: ${positional[1]}`);
  }
  options.target = positional[0];
  return options;
}
