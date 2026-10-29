import type { VersionCommandOptions } from "../commands/version";
import { fail, isHelp, readSwitch, type SwitchFlag } from "../parse";
import { showUsage } from "../usage";

/** `version` solo tiene dos interruptores; nada más se acepta. */
const SWITCHES: Array<SwitchFlag<VersionCommandOptions>> = [
  {
    names: ["--check"],
    set: (options) => {
      options.check = true;
    }
  },
  {
    names: ["--json"],
    set: (options) => {
      options.json = true;
    }
  }
];

export function parseVersion(args: string[]): VersionCommandOptions | number {
  const options: VersionCommandOptions = { check: false, json: false };

  for (const arg of args) {
    if (readSwitch(arg, options, SWITCHES)) continue;
    if (isHelp(arg)) return showUsage();
    return fail(`opción desconocida: ${arg}`);
  }

  return options;
}
