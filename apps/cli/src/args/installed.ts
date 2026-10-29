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

/** Lo que se va leyendo fuera de las opciones: la acción y sus destinos. */
interface Words {
  action: InstalledOptions["action"] | null;
  positional: string[];
}

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
  const words: Words = { action: null, positional: [] };

  for (let index = 0; index < args.length; index++) {
    const flag = readFlag(args, index, options);
    if (flag !== null) {
      if ("error" in flag) return fail(flag.error);
      index = flag.next;
      continue;
    }

    const stop = readArgument(args[index] as string, options, words, command);
    if (stop !== null) return stop;
  }

  return finish(options, words);
}

/**
 * La opción con valor de esta posición, si la hay.
 *
 * Devuelve dónde sigue la lectura, o el error de la opción a la que le falta
 * su valor.
 */
function readFlag(
  args: readonly string[],
  index: number,
  options: InstalledOptions
): { next: number } | { error: string } | null {
  const flag = readValueFlag(args, index, options, FLAGS);
  if (flag === null) return null;
  if ("error" in flag) return { error: flag.error };
  return { next: flag.next };
}

/**
 * Un argumento que no es una opción con valor: `--json`, la ayuda, una opción
 * suelta que no existe, o una palabra de las de después.
 *
 * Devuelve el código de salida si hay que parar, o `null` si se sigue leyendo.
 */
function readArgument(
  arg: string,
  options: InstalledOptions,
  words: Words,
  command: string
): number | null {
  if (arg === "--json") {
    options.json = true;
    return null;
  }
  if (isHelp(arg)) return showUsage();
  if (arg.startsWith("-")) return fail(`opción desconocida: ${arg}`);
  return readWord(arg, words, command);
}

/** La acción, si aún no hay, y el destino; o el error de la acción. */
function readWord(arg: string, words: Words, command: string): number | null {
  if (words.action !== null) {
    words.positional.push(arg);
    return null;
  }
  if (!ACTIONS.includes(arg as InstalledOptions["action"])) {
    return fail(
      `acción desconocida: ${arg} (list, add o remove)\n\n  codarch ${command} list`
    );
  }
  words.action = arg as InstalledOptions["action"];
  return null;
}

/** La acción por defecto, el destino único y el aviso de que sobra uno. */
function finish(options: InstalledOptions, words: Words): InstalledOptions | number {
  options.action = words.action ?? "list";
  if (words.positional.length > 1) {
    return fail(`sobra un argumento: ${words.positional[1]}`);
  }
  options.target = words.positional[0];
  return options;
}
