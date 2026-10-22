import { checkSource, type FetchLike } from "@codarch/versions";
import { VERSION } from "../version";

/**
 * La versión del CLI y si hay otra más nueva (ADR 0032).
 *
 * El CLI se actualiza desde npm ✓: la comprobación la hace npm ✓, y aquí solo
 * se dice cómo traerla ✓. Instalar solo ✗: actualizar un instalador global
 * desde dentro de sí mismo es pedir problemas ✓.
 */

/** El paquete que se publica en npm. */
export const PACKAGE_NAME = "codarch";

export interface VersionCommandOptions {
  /** Comprobar si hay algo más nuevo (npm). */
  check: boolean;
  /** Salida machine-readable. */
  json: boolean;
  /** El `fetch` que se usa; se inyecta para los tests. */
  fetch?: FetchLike;
}

export async function runVersion(options: VersionCommandOptions): Promise<number> {
  if (!options.check) {
    if (options.json) {
      console.log(JSON.stringify({ name: PACKAGE_NAME, version: VERSION }, null, 2));
      return 0;
    }
    console.log("");
    console.log(`  ${PACKAGE_NAME} ${VERSION}`);
    console.log("");
    console.log("  Para ver si hay algo más nuevo: codarch version --check");
    console.log("");
    return 0;
  }

  return check(options);
}

async function check(options: VersionCommandOptions): Promise<number> {
  const fetchImpl = options.fetch ?? (globalThis.fetch as unknown as FetchLike);
  const resultado = await checkSource(
    VERSION,
    { kind: "npm", package: PACKAGE_NAME },
    fetchImpl
  );

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          name: PACKAGE_NAME,
          version: VERSION,
          latest: resultado.latest,
          outdated: resultado.outdated,
          error: resultado.error,
          url: resultado.url
        },
        null,
        2
      )
    );
    return resultado.error ? 1 : 0;
  }

  console.log("");
  console.log(`  ${PACKAGE_NAME} ${VERSION}`);

  if (resultado.error) {
    console.log("");
    console.log(`  No se pudo comprobar en npm: ${resultado.error}`);
    console.log("");
    return 1;
  }

  if (!resultado.outdated) {
    console.log("");
    console.log("  Estás al día.");
    console.log("");
    return 0;
  }

  console.log("");
  console.log(`  Hay una versión más nueva: ${resultado.latest}`);
  console.log("  Se trae con:");
  console.log("");
  console.log(`    npm i -g ${PACKAGE_NAME}@latest`);
  console.log("");
  return 0;
}
