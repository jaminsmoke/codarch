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
