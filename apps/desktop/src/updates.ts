/**
 * Si la app puede instalarse las actualizaciones sola ✓.
 *
 * Windows y Linux pueden con los instaladores sin firmar ✓; macOS necesita
 * firma y notarización, así que allí se sigue ofreciendo la release ✓.
 */
export function canAutoUpdate(
  platform: NodeJS.Platform,
  packaged: boolean
): boolean {
  return packaged && platform !== "darwin";
}
