import type { ScopesCommandOptions } from "../commands/scopes";
import type { ValueFlag } from "../parse";
import { parseCommandArgs } from "./command";

/** Las opciones con valor de `scopes`, en el orden en que se leen. */
const FLAGS: Array<ValueFlag<ScopesCommandOptions>> = [
  {
    names: ["--root"],
    hint: "una ruta",
    set: (options, value) => {
      options.root = value;
    }
  }
];

export function parseScopes(args: string[]): ScopesCommandOptions | number {
  const options: ScopesCommandOptions = { json: false, help: false };
  return parseCommandArgs(args, options, FLAGS, (parsed, positional) => {
    parsed.root = positional[0] ?? parsed.root;
    return parsed;
  });
}
