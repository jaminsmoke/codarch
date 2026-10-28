/**
 * Preguntar a npm o a GitHub si hay algo más nuevo.
 *
 * Aquí no hay red: el `fetch` entra por parámetro, así que los tests no tocan
 * npm ni GitHub y el mismo motor sirve al CLI, a la web y al escritorio.
 *
 * Cada fuente vive en su función: una lanza la petición y otra lee la
 * respuesta, para que ninguna de las dos tenga que saber de la otra.
 */

import { compareVersions, isOutdated, parseVersion, versionInTag } from "./version.ts";

/** De dónde se averigua la última versión. */
export type VersionSource =
  | { kind: "npm"; package: string; registry?: string }
  | { kind: "github"; repo: string; includePrereleases?: boolean };

/** Lo mínimo de `fetch` que hace falta: así los tests pueden inventarse uno. */
export type FetchLike = (
  input: string,
  init?: { headers?: Record<string, string> }
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

/** El resultado de preguntar a una fuente. */
export interface UpdateCheck {
  /** La versión que se está usando. */
  current: string;
  /** La última versión que dice la fuente, si la dijo. */
  latest: string | null;
  /** ¿Hay algo más nuevo? */
  outdated: boolean;
  /** De dónde se preguntó. */
  source: VersionSource;
  /** Por qué no se pudo preguntar, si no se pudo. */
  error: string | null;
  /** Dónde se baja lo nuevo. */
  url: string | null;
}

const NPM_REGISTRY = "https://registry.npmjs.org";
const GITHUB_API = "https://api.github.com";

/** Lo que devuelve una petición: el cuerpo, o el motivo por el que no hay. */
type Fetched = { body: unknown } | { error: string };

async function fetchJson(
  fetchImpl: FetchLike,
  url: string,
  headers: Record<string, string>
): Promise<Fetched> {
  try {
    const respuesta = await fetchImpl(url, { headers });
    if (!respuesta.ok) return { error: `${respuesta.status} en ${url}` };
    return { body: await respuesta.json() };
  } catch (cause) {
    return { error: (cause as Error).message };
  }
}

function failed(base: UpdateCheck, error: string): UpdateCheck {
  return { ...base, error };
}

function releasesUrl(repo: string): string {
  return `${GITHUB_API}/repos/${repo}/releases`;
}

/** La página del paquete o del repo, cuando la fuente no dice otra cosa. */
function browseUrl(source: VersionSource): string {
  return source.kind === "npm"
    ? `https://www.npmjs.com/package/${source.package}`
    : `https://github.com/${source.repo}/releases`;
}

async function checkNpm(
  base: UpdateCheck,
  source: Extract<VersionSource, { kind: "npm" }>,
  fetchImpl: FetchLike
): Promise<UpdateCheck> {
  const url = `${source.registry ?? NPM_REGISTRY}/${source.package}/latest`;
  const respuesta = await fetchJson(fetchImpl, url, { accept: "application/json" });
  if ("error" in respuesta) return failed(base, respuesta.error);

  const cuerpo = respuesta.body as { version?: unknown };
  if (typeof cuerpo.version !== "string") {
    return failed(base, `la respuesta de ${url} no trae versión`);
  }
  return {
    ...base,
    latest: cuerpo.version,
    outdated: isOutdated(cuerpo.version, base.current),
    url: browseUrl(source)
  };
}

/** La release más nueva de una lista, ignorando borradores y etiquetas raras. */
function bestRelease(
  releases: readonly unknown[]
): { version: string; url: string | null } | null {
  let best: { version: string; url: string | null } | null = null;
  for (const item of releases) {
    if (typeof item !== "object" || item === null) continue;
    const release = item as { tag_name?: unknown; html_url?: unknown; draft?: unknown };
    if (release.draft === true || typeof release.tag_name !== "string") continue;
    const version = versionInTag(release.tag_name);
    if (!parseVersion(version)) continue;
    if (best && compareVersions(version, best.version) <= 0) continue;
    best = {
      version,
      url: typeof release.html_url === "string" ? release.html_url : null
    };
  }
  return best;
}

/** Con prereleases: se piden todas y se queda la más nueva. */
async function checkGithubReleases(
  base: UpdateCheck,
  source: Extract<VersionSource, { kind: "github" }>,
  fetchImpl: FetchLike
): Promise<UpdateCheck> {
  const url = `${releasesUrl(source.repo)}?per_page=100`;
  const respuesta = await fetchJson(fetchImpl, url, {
    accept: "application/vnd.github+json"
  });
  if ("error" in respuesta) return failed(base, respuesta.error);
  if (!Array.isArray(respuesta.body)) {
    return failed(base, `la respuesta de ${url} no trae releases`);
  }

  const best = bestRelease(respuesta.body);
  if (!best) return failed(base, `la respuesta de ${url} no trae versiones`);
  return {
    ...base,
    latest: best.version,
    outdated: isOutdated(best.version, base.current),
    url: best.url ?? browseUrl(source)
  };
}

/** Sin prereleases: la última release estable que publica GitHub. */
async function checkGithubLatest(
  base: UpdateCheck,
  source: Extract<VersionSource, { kind: "github" }>,
  fetchImpl: FetchLike
): Promise<UpdateCheck> {
  const url = `${releasesUrl(source.repo)}/latest`;
  const respuesta = await fetchJson(fetchImpl, url, {
    accept: "application/vnd.github+json"
  });
  if ("error" in respuesta) return failed(base, respuesta.error);

  const cuerpo = respuesta.body as { tag_name?: unknown; html_url?: unknown };
  if (typeof cuerpo.tag_name !== "string") {
    return failed(base, `la respuesta de ${url} no trae etiqueta`);
  }
  const version = versionInTag(cuerpo.tag_name);
  return {
    ...base,
    latest: version,
    outdated: isOutdated(version, base.current),
    url: typeof cuerpo.html_url === "string" ? cuerpo.html_url : browseUrl(source)
  };
}

/**
 * Pregunta a una fuente si hay una versión más nueva.
 *
 * No lanza: si la red falla o la fuente contesta raro, devuelve el error en
 * `error` y deja `latest` en `null`. Una comprobación fallida no es un
 * problema, es información.
 */
export async function checkSource(
  current: string,
  source: VersionSource,
  fetchImpl: FetchLike
): Promise<UpdateCheck> {
  const base: UpdateCheck = {
    current,
    latest: null,
    outdated: false,
    source,
    error: null,
    url: null
  };

  try {
    if (source.kind === "npm") return await checkNpm(base, source, fetchImpl);
    return source.includePrereleases
      ? await checkGithubReleases(base, source, fetchImpl)
      : await checkGithubLatest(base, source, fetchImpl);
  } catch (cause) {
    return failed(base, (cause as Error).message);
  }
}

/**
 * Pregunta a varias fuentes y se queda con la más nueva que encuentre.
 *
 * Las fuentes se preguntan en paralelo: si una falla, las demás siguen
 * valiendo.
 */
export async function checkForUpdate(
  current: string,
  sources: VersionSource[],
  fetchImpl: FetchLike
): Promise<UpdateCheck[]> {
  return Promise.all(sources.map((source) => checkSource(current, source, fetchImpl)));
}
