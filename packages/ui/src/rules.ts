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

/** Lo que una fila de regla enseña, ya decidido a partir de la violación. */
export interface RuleRowDetails {
  /** La ruta que abre la fila; el otro extremo cuando se lee dentro del fichero. */
  path: string | null;
  /** El texto del tooltip: las rutas, el ciclo o «Sin ruta». */
  title: string;
  /** La arista, solo si el mensaje no la cuenta ya. */
  edge: RuleViolation["edge"] | null;
  /** La métrica, solo si el mensaje no la nombra ya. */
  metric: RuleViolation["metric"] | null;
  /** El ciclo, solo si el mensaje no lo cuenta ya. */
  cycle: RuleViolation["cycle"] | null;
  /** El mensaje, sin el prefijo con la ruta cuando sobra. */
  message: string;
}

/**
 * Los datos de una fila de regla (ADR 0058 y ADR 0059).
 *
 * El mensaje por defecto ya cuenta la arista, la métrica o el ciclo; el detalle
 * solo se añade cuando el mensaje es propio y no lo repite. En la ficha del
 * fichero sobra, además, el prefijo con su propia ruta.
 */
export function ruleRowDetails(
  violation: RuleViolation,
  otherThan?: string
): RuleRowDetails {
  return {
    path: targetPathOf(violation, otherThan),
    title: titleOf(violation),
    edge: edgeDetailOf(violation),
    metric: metricDetailOf(violation),
    cycle: cycleDetailOf(violation),
    message: messageOf(violation, otherThan)
  };
}

/** Al leer un fichero, la fila lleva al otro extremo de la violación. */
function targetPathOf(
  violation: RuleViolation,
  otherThan: string | undefined
): string | null {
  if (otherThan === undefined) return violationPath(violation);
  const other = violation.files.find((file) => file !== otherThan);
  return other ?? violationPath(violation);
}

function titleOf(violation: RuleViolation): string {
  const files = violation.files.join(", ");
  if (files !== "") return files;
  if (violation.cycle) {
    return violation.cycle.nodes.map((node) => node.path).join(" → ");
  }
  return "Sin ruta";
}

function edgeDetailOf(violation: RuleViolation): RuleViolation["edge"] | null {
  if (!violation.edge) return null;
  const { from, to } = violation.edge;
  const told =
    violation.message.includes(from) && violation.message.includes(to);
  return told ? null : violation.edge;
}

function metricDetailOf(
  violation: RuleViolation
): RuleViolation["metric"] | null {
  if (!violation.metric) return null;
  return violation.message.includes(violation.metric.name)
    ? null
    : violation.metric;
}

function cycleDetailOf(
  violation: RuleViolation
): RuleViolation["cycle"] | null {
  if (!violation.cycle) return null;
  const first = violation.cycle.nodes[0]?.path ?? "";
  return violation.message.includes(first) ? null : violation.cycle;
}

function messageOf(
  violation: RuleViolation,
  otherThan: string | undefined
): string {
  if (otherThan === undefined) return violation.message;
  const prefix = `${otherThan}: `;
  return violation.message.startsWith(prefix)
    ? violation.message.slice(prefix.length)
    : violation.message;
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
