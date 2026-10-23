import {
  usePlugins as useSharedPlugins,
  type PluginRuntime,
  type PluginStore
} from "@codarch/ui/plugins";
import { readEnabledPlugins, writeEnabledPlugins } from "./storage";

/** La web guarda los plugins activados en su almacenamiento local ✓. */
const store: PluginStore = {
  read: () => readEnabledPlugins(),
  write: (names) => writeEnabledPlugins(names)
};

export type { PluginRuntime } from "@codarch/ui/plugins";

export function usePlugins(): PluginRuntime {
  return useSharedPlugins(store);
}
