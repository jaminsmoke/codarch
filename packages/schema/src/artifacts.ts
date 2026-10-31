/**
 * Los nombres de lo que el producto deja en `.codarch/` (ADR 0101).
 *
 * Un nombre, un sitio: el paquete que escribe el artefacto **usa** la
 * constante de aquí en vez de repetir la cadena, y lee la de aquí en vez de
 * llevar su propia copia. Las pruebas sí repiten el literal a propósito: así el
 * nombre es un contrato y un renombrado rompe en vez de pasar desapercibido.
 */

/** La carpeta del producto dentro de un repo. Se ignora en git (ADR 0050). */
export const CODARCH_DIR = ".codarch";

/**
 * Los nombres que puede tener la configuración del repo (ADR 0038).
 *
 * `.yml` primero: si el repo tiene los dos, se lee ese. No vive en
 * `.codarch/` —la configuración sí se versiona—, pero es un nombre del
 * producto y se busca en un solo sitio: `analyze`, los addons, los plugins, la
 * web y el MCP tienen que encontrar el mismo fichero.
 */
export const CONFIG_FILE_NAMES = [".codarch.yml", ".codarch.yaml"] as const;

/**
 * Todo lo que la carpeta puede contener, por su papel.
 *
 * Es la lista que reconoce `codarch analyze` al limpiar: lo que no está aquí se
 * borra con aviso. Añadir una entrada es añadir el nombre a esta tabla, y quien
 * elige no volver a escribir en la carpeta fuera de ella.
 */
export const CODARCH_ENTRIES = {
  /** El mapa del código: el `cc.json` que se abre fuera. */
  snapshot: "snapshot.cc.json",
  /** El mapa de lo que no es código (ADR 0093). */
  rest: "rest.cc.json",
  /** El reporte guardado de un par base/head. */
  report: "report.json",
  /** Lo tocado desde el último commit (ADR 0072). */
  headReport: "head-report.json",
  /** La deuda que midió el proyecto (ADR 0099). */
  lint: "lint.repmod.json",
  /** Las reglas del lint ya resueltas, para no volver a cargarlas. */
  lintRules: "lint-cache.json",
  /** El libro mayor de cadenas de símbolos. */
  chains: "chains.json",
  /** Lo que un alcance vio de los que cuelgan de él (ADR 0089). */
  scopes: "scopes.json",
  /** El parseo de la pasada anterior. */
  parseCache: "parse-cache.json",
  /** La vista que eligió quien abrió el repo (ADR 0053). */
  preferences: "preferences.json",
  /** Las capturas del mapa (`codarch shot`). Es la única carpeta. */
  shots: "shots"
} as const;

/** El nombre de una entrada, por su papel. */
export type CodarchArtifact = (typeof CODARCH_ENTRIES)[keyof typeof CODARCH_ENTRIES];

export const SNAPSHOT_FILE = CODARCH_ENTRIES.snapshot;
export const REST_FILE = CODARCH_ENTRIES.rest;
export const REPORT_FILE = CODARCH_ENTRIES.report;
export const HEAD_REPORT_FILE = CODARCH_ENTRIES.headReport;
export const LINT_FILE = CODARCH_ENTRIES.lint;
export const LINT_RULES_FILE = CODARCH_ENTRIES.lintRules;
export const CHAINS_FILE = CODARCH_ENTRIES.chains;
export const SCOPES_FILE = CODARCH_ENTRIES.scopes;
export const PARSE_CACHE_FILE = CODARCH_ENTRIES.parseCache;
export const PREFERENCES_FILE = CODARCH_ENTRIES.preferences;
export const SHOTS_DIR = CODARCH_ENTRIES.shots;

/**
 * Las entradas que la carpeta reconoce.
 *
 * `codarch analyze` conserva estas —aunque no se hayan escrito en esa pasada— y
 * borra el resto: la carpeta es del producto, no un cajón (ADR 0101).
 */
export const CODARCH_KNOWN: readonly string[] = Object.values(CODARCH_ENTRIES);

/** ¿Este nombre lo escribe el producto? */
export function isCodarchEntry(name: string): boolean {
  return CODARCH_KNOWN.includes(name);
}
