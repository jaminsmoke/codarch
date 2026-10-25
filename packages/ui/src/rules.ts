import type { RuleViolation } from "@codarch/metrics/browser";

/**
 * Las reglas del reporte, ordenadas para la pestaña **Reglas** (ADR 0058).
 *
 * El reporte trae tres listas —introducidas, existentes y resueltas— y cada
 * violación dice de dónde sale, a qué ficheros toca y, si la hay, la arista, la
 * métrica o el ciclo que la provocan. Aquí solo se cruzan y se cuentan; el
 * marcado vive en la pestaña.
 */

/** El estado de una violación en el diff. */
export type RuleStatus = "introduced" | "existing" | "resolved";

/**
 * De dónde sale una regla, en una palabra.
 *
 * Las de un addon llevan su nombre en el `source` (`addon:vista-3d`): se enseña
 * tal cual para que se sepa a quién pedirle cuentas.
 */
export function sourceLabel(source: RuleViolation["source"]): string {
  if (source === "config") return "equipo";
  if (source === "profile") return "perfil";
  return source.slice("addon:".length);
}

/** La ruta que abre una violación: el primer fichero, la arista o el ciclo. */
export function violationPath(violation: RuleViolation): string | null {
  return (
    violation.files[0] ??
    violation.edge?.from ??
    violation.cycle?.nodes[0]?.path ??
    null
  );
}

export interface SourceCount {
  source: RuleViolation["source"];
  label: string;
  count: number;
}

/**
 * Cuántas violaciones aporta cada origen.
 *
 * Sirve para ver de un vistazo si el ruido viene del `.codarch.yml` del equipo,
 * de un perfil del catálogo o de un addon. Ordena de más a menos y desempata
 * por el nombre para que el resultado sea determinista.
 */
export function countBySource(
  violations: readonly RuleViolation[]
): SourceCount[] {
  const counts = new Map<RuleViolation["source"], number>();
  for (const violation of violations) {
    counts.set(violation.source, (counts.get(violation.source) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([source, count]) => ({ source, label: sourceLabel(source), count }))
    .sort(
      (left, right) =>
        right.count - left.count ||
        left.label.localeCompare(right.label) ||
        left.source.localeCompare(right.source)
    );
}
