import type { ServeOptions } from "../commands/serve";
import {
  fail,
  integerInRange,
  readSwitch,
  readValueFlag,
  type SwitchFlag,
  type ValueFlag
} from "../parse";

/** Las opciones con valor de `serve`, en el orden en que se leen. */
const FLAGS: Array<ValueFlag<ServeOptions>> = [
  {
    names: ["--port", "-p"],
    hint: "un número entre 1 y 65535",
    set: (options, value) => {
      const port = integerInRange(value, 1, 65535);
      if (port === null) return "--port necesita un número entre 1 y 65535";
      options.port = port;
    }
  },
  {
    names: ["--host"],
    hint: "un valor",
    set: (options, value) => {
      options.host = value;
    }
  }
];

/**
 * Los interruptores de `serve`.
 *
 * La ayuda no se imprime aquí: se marca y quien despacha decide, para que un
 * `--help` junto a una opción inválida siga siendo un error (y no una ayuda).
 */
const SWITCHES: Array<SwitchFlag<ServeOptions>> = [
  {
    names: ["--watch"],
    set: (options) => {
      options.watch = true;
    }
  },
  {
    names: ["--no-watch"],
    set: (options) => {
      options.watch = false;
    }
  },
  {
    names: ["--no-web"],
    set: (options) => {
      options.web = false;
    }
  },
  {
    names: ["--help", "-h"],
    set: (options) => {
      options.help = true;
    }
  }
];

export function parseServe(args: string[]): ServeOptions | number {
  const options: ServeOptions = {
    port: 4173,
    host: "127.0.0.1",
    watch: true,
    web: true,
    help: false
  };
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
    if (arg.startsWith("-")) return fail(`opción desconocida en serve: ${arg}`);
    positional.push(arg);
  }

  if (positional.length > 1) {
    return fail("serve acepta como máximo una ruta");
  }

  options.root = positional[0];
  return options;
}
