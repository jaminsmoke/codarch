/**
 * Una versión y cómo se compara con otra.
 *
 * Vive aparte de la fachada (`index.ts`) porque medio repositorio importa el
 * paquete solo por su versión: lo que compara no tiene por qué arrastrar el
 * código de red ni el de las releases.
 */

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
 * `null`: una versión ilegible no es "la más nueva", es ignorancia.
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
