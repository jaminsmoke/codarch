declare module "virtual:codarch-plugins" {
  import type { PluginDescriptor } from "@codarch/plugin-api";
  /** Los plugins que el repo declara compilados ✓. */
  export const plugins: PluginDescriptor[];
}
