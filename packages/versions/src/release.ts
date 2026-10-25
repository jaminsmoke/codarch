/** Cómo se sube la versión de un componente (ADR 0065). */
export type ReleaseKind = "patch" | "minor" | "major";

/**
 * La siguiente versión de un componente.
 *
 * La forma es `mayor.menor.parche`. Por defecto se sube el **parche**; `menor`
 * y `mayor` se piden a mano. Desde una prerelease, `patch` sale a la estable
 * del mismo núcleo (`0.3.1-alpha.8` → `0.3.1`), que es como se cierra una
 * tanda de alphas.
 */
export function nextVersion(current: string, kind: ReleaseKind): string {
  const [core = "", ...pre] = current.split("-");
  const parts = core.split(".");
  if (parts.length !== 3 || parts.some((part) => !/^\d+$/.test(part))) {
    throw new Error(`no es una versión semver: ${current}`);
  }
  const major = Number(parts[0]);
  const minor = Number(parts[1]);
  const patch = Number(parts[2]);

  if (kind === "patch") {
    return pre.length > 0 ? core : `${major}.${minor}.${patch + 1}`;
  }
  if (kind === "minor") return `${major}.${minor + 1}.0`;
  return `${major + 1}.0.0`;
}
