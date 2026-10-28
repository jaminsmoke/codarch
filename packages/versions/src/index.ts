/**
 * Las versiones de CodArch y cómo se averigua si hay algo más nuevo
 * (ADR 0032).
 *
 * Este fichero es la fachada: no tiene lógica propia, solo reexporta. Lo
 * importa medio repositorio, y todo lo que se decida aquí se multiplica por ese
 * uso, así que el trabajo vive en módulos con un tema cada uno: las constantes
 * del manifiesto (ADR 0041), la versión y su comparación, la comprobación de
 * actualizaciones, el salto de versión de una release y el impacto de un
 * cambio en los componentes.
 *
 * Aquí no hay red: el `fetch` entra por parámetro en `checkSource`, así que los
 * tests no tocan npm ni GitHub y el mismo motor sirve al CLI, a la web y al
 * escritorio.
 */

export {
  CC_JSON_VERSION,
  CHAIN_LEDGER_VERSION,
  CLI_VERSION,
  CONFIG_VERSION,
  DESKTOP_VERSION,
  DOCKER_VERSION,
  ENGINE_VERSION,
  HISTORY_VERSION,
  MCP_VERSION,
  REPORT_SCHEMA_VERSION,
  WEB_VERSION
} from "./manifest.ts";
export { nextVersion, type ReleaseKind } from "./release.ts";
export {
  COMPONENT_ORDER,
  impactedComponents,
  type ComponentName,
  type ImpactResult,
  type WorkspaceInfo
} from "./impact.ts";
export {
  compareVersions,
  isNewer,
  isOutdated,
  parseVersion,
  versionInTag,
  type ParsedVersion
} from "./version.ts";
export {
  checkForUpdate,
  checkSource,
  type FetchLike,
  type UpdateCheck,
  type VersionSource
} from "./update.ts";
