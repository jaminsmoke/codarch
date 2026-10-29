import type { DiffCommandOptions, FailOn } from "../commands/diff";
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

/** El gate que acepta `--fail-on`. */
function isFailOn(value: string): value is FailOn {
  return (
    value === "none" ||
    value === "cycles" ||
    value === "violations" ||
    value === "hotspots" ||
    value === "any"
  );
}

/**
 * Las opciones con valor de `diff`.
 *
 * Aquí sí se acepta el valor vacío en la forma con `=` (`--config=`), que es
 * como se dice «sin configuración» sin recurrir a `--no-config`.
 */
const FLAGS: Array<ValueFlag<DiffCommandOptions>> = [
  {
    names: ["--out", "-o"],
    hint: "una ruta",
    set: (options, value) => {
      options.out = value;
    }
  },
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
    names: ["--hotspot-metric"],
    hint: "un nombre",
    set: (options, value) => {
      options.hotspotMetric = value;
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
    hint: "none, cycles, violations, hotspots o any",
    set: (options, value) => {
      if (!isFailOn(value)) {
        return "--fail-on necesita none, cycles, violations, hotspots o any";
      }
      options.failOn = value;
    }
  }
];

export function parseDiff(args: string[]): DiffCommandOptions | number {
  const options: DiffCommandOptions = { help: false, top: 10, failOn: "none" };
  const positional: string[] = [];

  for (let index = 0; index < args.length; index++) {
    const flag = readValueFlag(args, index, options, FLAGS);
    if (flag && "error" in flag) return fail(flag.error);
    if (flag) {
      index = flag.next;
      continue;
    }

    const arg = args[index] as string;
    if (arg === "--no-config") {
      options.noConfig = true;
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

  if (positional.length !== 2) {
    return fail("diff necesita exactamente dos snapshots: base y head");
  }

  options.base = positional[0];
  options.head = positional[1];
  return options;
}
