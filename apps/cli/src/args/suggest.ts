import type { SuggestOptions } from "../commands/suggest";
import { fail, isHelp } from "../parse";
import { showUsage } from "../usage";

export function parseSuggest(args: string[]): SuggestOptions | number {
  const options: SuggestOptions = { json: false };
  const positional: string[] = [];

  for (const arg of args) {
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

  options.file = positional[0];
  return options;
}
