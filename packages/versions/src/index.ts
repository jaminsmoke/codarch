/**
 * Las versiones de CodArch y cómo se averigua si hay algo más nuevo
 * (ADR 0032).
 *
 * Aquí no hay red: el `fetch` entra por parámetro ✓, así que los tests no
 * tocan npm ni GitHub ✓ y el mismo motor sirve al CLI ✓, a la web ✓ y al
 * escritorio ✓.
 *
 * Las versiones de los componentes viven en `versions.json` y salen por
 * `manifest.ts` (ADR 0041): el código importa constantes, nunca literales.
 */

export {
  CC_JSON_VERSION,
  CHAIN_LEDGER_VERSION,
  CONFIG_VERSION,
  HISTORY_VERSION,
  PRODUCT_VERSION,
  REPORT_SCHEMA_VERSION
} from "./manifest.ts";

/** Una versión partida: `mayor.menor.parche`, con prerelease opcional. */
export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  /** La prerelease (`beta.1`), si la hay. */
  prerelease: string | null;
}

/**
 * Parte una versión.
 *
 * Acepta `1.2.3`, `v1.2.3` y `1.2.3-beta.1`. Lo que no se entiende devuelve
 * `null`: una versión ilegible no es "la más nueva", es ignorance.
 */
export function parseVersion(value: string): ParsedVersion | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(value.trim());
  if (!match) return null;

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? null
  };
}

/**
 * Compara dos versiones: -1 si `a` es menor, 0 si son iguales, 1 si `a` es
 * mayor.
 *
 * Una prerelease va **antes** que su versión estable (`1.0.0-beta` < `1.0.0`),
 * como manda semver.
 */
export function compareVersions(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);

  if (!left && !right) return 0;
  if (!left) return -1;
  if (!right) return 1;

  for (const key of ["major", "minor", "patch"] as const) {
    if (left[key] !== right[key]) return left[key] < right[key] ? -1 : 1;
  }

  return comparePrerelease(left.prerelease, right.prerelease);
}

function comparePrerelease(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (!a) return 1; // la estable es más nueva que su prerelease
  if (!b) return -1;

  const left = a.split(".");
  const right = b.split(".");
  const largo = Math.max(left.length, right.length);

  for (let indice = 0; indice < largo; indice += 1) {
    const uno = left[indice];
    const otro = right[indice];
    if (uno === undefined) return -1;
    if (otro === undefined) return 1;
    if (uno === otro) continue;

    const unoEsNumero = /^\d+$/.test(uno);
    const otroEsNumero = /^\d+$/.test(otro);
    if (unoEsNumero && otroEsNumero) return Number(uno) < Number(otro) ? -1 : 1;
    if (unoEsNumero) return -1; // los numéricos van antes
    if (otroEsNumero) return 1;
    return uno < otro ? -1 : 1;
  }

  return 0;
}

/** ¿Hay una versión más nueva que la que se está usando? */
export function isNewer(candidate: string, current: string): boolean {
  return compareVersions(candidate, current) > 0;
}

/**
 * ¿Hay algo más nuevo que la versión en uso?
 *
 * Si la versión en uso no se entiende (una app en desarrollo dice `dev`), no
 * se afirma que haya nada nuevo: no se sabe, y no se dice lo contrario.
 */
export function isOutdated(latest: string, current: string): boolean {
  if (!parseVersion(current)) return false;
  return isNewer(latest, current);
}

/** De dónde se averigua la última versión. */
export type VersionSource =
  | { kind: "npm"; package: string; registry?: string }
  | { kind: "github"; repo: string };

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

/**
 * Saca la versión de una etiqueta de release.
 *
 * Las etiquetas no son solo `v1.2.3`: las del escritorio son `desktop-v1.2.3`.
 * Se busca la versión al final de la etiqueta y, si no está, se quita la "v".
 */
export function versionInTag(tag: string): string {
  const encontrado = /(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/.exec(tag.trim());
  return encontrado?.[1] ?? tag.trim().replace(/^v/, "");
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
    if (source.kind === "npm") {
      const registro = source.registry ?? NPM_REGISTRY;
      const url = `${registro}/${source.package}/latest`;
      const respuesta = await fetchImpl(url, { headers: { accept: "application/json" } });
      if (!respuesta.ok) {
        return { ...base, error: `${respuesta.status} en ${url}` };
      }
      const cuerpo = (await respuesta.json()) as { version?: unknown };
      if (typeof cuerpo.version !== "string") {
        return { ...base, error: `la respuesta de ${url} no trae versión` };
      }
      return {
        ...base,
        latest: cuerpo.version,
        outdated: isOutdated(cuerpo.version, current),
        url: `https://www.npmjs.com/package/${source.package}`
      };    }

    const url = `${GITHUB_API}/repos/${source.repo}/releases/latest`;
    const respuesta = await fetchImpl(url, {
      headers: { accept: "application/vnd.github+json" }
    });
    if (!respuesta.ok) {
      return { ...base, error: `${respuesta.status} en ${url}` };
    }
    const cuerpo = (await respuesta.json()) as {
      tag_name?: unknown;
      html_url?: unknown;
    };
    if (typeof cuerpo.tag_name !== "string") {
      return { ...base, error: `la respuesta de ${url} no trae etiqueta` };
    }
    const version = versionInTag(cuerpo.tag_name);
    return {
      ...base,
      latest: version,
      outdated: isOutdated(version, current),
      url:
        typeof cuerpo.html_url === "string"
          ? cuerpo.html_url
          : `https://github.com/${source.repo}/releases`
    };
  } catch (cause) {
    return { ...base, error: (cause as Error).message };
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
