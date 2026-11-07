import type { LintRule, LintSystem } from "./format";
import { codarchRuleCatalog } from "./rest";

/**
 * Cómo de completa es la lista de reglas activas de un sistema.
 *
 * `unknown` no es cero: la herramienta corre reglas que no pudimos enumerar
 * (oxlint sin config, Biome recomendado, Ruff por defecto). `known-complete`
 * es una lista cerrada, aunque esté vacía porque la config no activa ninguna.
 * `partial` es una lista que no agota lo que corre.
 */
export type RuleCountState = "known-complete" | "partial" | "unknown";

export interface SystemActivity {
  activeRules: readonly LintRule[];
  countState: RuleCountState;
}

const NOT_ENUMERATED = [
  "no se enumeran",
  "no se pudieron enumerar",
  "no se enumera"
];

/**
 * `activeRules` y `countState` de un sistema, a partir de `meta.systems`.
 *
 * No se escribe en el artefacto: el checksum sigue siendo el de `rules` y la
 * nota. Una lista ausente del sistema `codarch` se rellena con el catálogo
 * del productor, nunca con los hallazgos.
 */
export function systemActivity(system: LintSystem): SystemActivity {
  const note = system.note ?? "";
  const listed = system.rules ? system.rules.map((rule) => ({ ...rule })) : [];
  const notEnumerated = NOT_ENUMERATED.some((phrase) => note.includes(phrase));

  if (system.name === "codarch" && listed.length === 0 && !notEnumerated) {
    return { activeRules: codarchRuleCatalog(), countState: "known-complete" };
  }
  if (notEnumerated) {
    return {
      activeRules: listed,
      countState: listed.length > 0 ? "partial" : "unknown"
    };
  }
  if (
    note.includes("puede agrupar") ||
    note.includes("se listan sus selectores")
  ) {
    return { activeRules: listed, countState: "partial" };
  }
  if (
    note.includes("no activa ninguna") ||
    note.includes("no activa ningún")
  ) {
    return { activeRules: listed, countState: "known-complete" };
  }
  if (listed.length > 0) {
    return { activeRules: listed, countState: "known-complete" };
  }
  return { activeRules: [], countState: "unknown" };
}
