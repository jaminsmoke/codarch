import { checkSource, type FetchLike } from "@codarch/versions";

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

/**
 * Dónde están los metadatos de una release.
 *
 * electron-updater busca `latest.yml` en Windows y `latest-linux.yml` en Linux
 * dentro de esa carpeta; la barra final es la que hace que resuelva los
 * instaladores contra el directorio y no contra su nombre.
 */
export function releaseUrl(repo: string, version: string): string {
  return `https://github.com/${repo}/releases/download/v${version}/`;
}

/**
 * La release que hay que mirar, resuelta aquí y no dentro de electron-updater.
 *
 * Con `allowPrerelease` y una versión estable, electron-updater se queda con la
 * **primera entrada** del feed de GitHub. Ese feed trae también las etiquetas
 * que no son releases —el `v1` de la acción, por ejemplo—, así que la app pedía
 * `download/v1/latest-linux.yml` y recibía un 404. Preguntar la lista de
 * releases y quedarse con la mayor versión quita esa suposición: las etiquetas
 * sin versión se descartan antes de elegir.
 */
export async function resolveUpdateFeed(
  repo: string,
  current: string,
  fetchImpl: FetchLike
): Promise<{ version: string; url: string } | null> {
  const check = await checkSource(
    current,
    { kind: "github", repo, includePrereleases: true },
    fetchImpl
  );
  if (check.latest === null) return null;
  return { version: check.latest, url: releaseUrl(repo, check.latest) };
}
