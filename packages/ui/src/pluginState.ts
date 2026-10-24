/**
 * El estado de los plugins activados.
 *
 * Es una función pura ✓: la UI decide qué queda activado y cada app lo guarda
 * en su almacenamiento ✓. Así el checksum y el análisis no dependen de esto ✓.
 */
export function nextEnabledPlugins(
  current: readonly string[],
  name: string,
  on: boolean
): string[] {
  return on
    ? [...new Set([...current, name])]
    : current.filter((item) => item !== name);
}

/** Lo que la tienda de plugins resume en una línea. */
export interface PluginSummary {
  /** Los compilados en esta app. */
  installed: number;
  /** Los activados en esta máquina. */
  enabled: number;
  /** Los que fallaron al cargar. */
  failed: number;
}

/**
 * El resumen de la tienda: instalados, activos y caídos.
 *
 * Cuenta solo los que la app conoce; un nombre activado que ya no está
 * compilado no suma.
 */
export function summarizePlugins(
  installed: readonly string[],
  enabled: readonly string[],
  failed: readonly string[]
): PluginSummary {
  return {
    installed: installed.length,
    enabled: installed.filter((name) => enabled.includes(name)).length,
    failed: installed.filter((name) => failed.includes(name)).length
  };
}
