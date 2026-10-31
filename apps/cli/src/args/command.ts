import { fail, isHelp, readValueFlag, type ValueFlag } from "../parse";
import { showUsage } from "../usage";

/**
 * El bucle de argumentos que comparten los comandos simples.
 *
 * Lee las opciones con valor, `--json`, la ayuda y el rechazo de lo que no
 * conoce; las rutas sueltas se las deja a `applyPositional`, que es lo único
 * que cada comando decide distinto: cuál es la raíz y qué pasa si falta.
 */
export function parseCommandArgs<T extends { json: boolean; help: boolean }>(
  args: string[],
  options: T,
  flags: readonly ValueFlag<T>[],
  applyPositional: (options: T, positional: string[]) => T | number
): T | number {
  const positional: string[] = [];

  for (let index = 0; index < args.length; index++) {
    const flag = readValueFlag(args, index, options, flags);
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

  return applyPositional(options, positional);
}
