import type { DiffReport, RuleViolation } from "@codarch/metrics/browser";
import type { CcMigrationLens, CcSymbol } from "@codarch/schema/browser";

/**
 * La ficha de un fichero, cruzada con las lentes (ADR 0057).
 *
 * El mapa ya dice cuánto pesa un fichero; esto dice **por qué**. Las reglas de
 * dominio no viajan en `cc.json`: viven en el reporte del diff, así que sin
 * reporte cargado no hay lente de dominio que enseñar. La migración y los
 * símbolos sí vienen en el snapshot.
 *
 * Todo son funciones puras: las dos apps pintan lo mismo y se prueban sin
 * Electron ni navegador.
 */

/** De dónde viene una violación: la introduce el cambio o ya estaba. */
export type ViolationStatus = "introduced" | "existing";

export interface FileViolation {
  status: ViolationStatus;
  violation: RuleViolation;
}

/** El orden en que se enseñan: primero lo que trae el cambio. */
const STATUS_ORDER: Record<ViolationStatus, number> = {
  introduced: 0,
  existing: 1
};

const SEVERITY_ORDER: Record<RuleViolation["severity"], number> = {
  error: 0,
  warn: 1,
  info: 2
};

/** `src\app\main.ts` y `./src/app/main.ts` son la misma ruta. */
function normalizedPath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\//, "");
}

/**
 * Las violaciones del reporte que tocan un fichero.
 *
 * Una regla de dependencia prohibida implica a los dos extremos de la arista,
 * así que el fichero aparece tanto si es el origen como si es el destino: el
 * riesgo es suyo en los dos sentidos.
 */
export function violationsForPath(
  report: DiffReport | null,
  path: string
): FileViolation[] {
  if (!report) return [];
  const target = normalizedPath(path);
  const rows: FileViolation[] = [];

  for (const status of ["introduced", "existing"] as const) {
    for (const violation of report.rules.violations[status]) {
      const touches = violation.files.some(
        (file) => normalizedPath(file) === target
      );
      if (touches) rows.push({ status, violation });
    }
  }

  return rows.sort(
    (left, right) =>
      STATUS_ORDER[left.status] - STATUS_ORDER[right.status] ||
      SEVERITY_ORDER[left.violation.severity] -
        SEVERITY_ORDER[right.violation.severity] ||
      left.violation.rule.localeCompare(right.violation.rule)
  );
}

/** Cuántas violaciones hay de cada tipo, para el resumen de la ficha. */
export function countViolations(rows: readonly FileViolation[]): {
  introduced: number;
  existing: number;
} {
  let introduced = 0;
  let existing = 0;
  for (const row of rows) {
    if (row.status === "introduced") introduced += 1;
    else existing += 1;
  }
  return { introduced, existing };
}

/** Una arista FFI vista desde el fichero seleccionado. */
export interface FfiEdgeView {
  kind: "wasm" | "native";
  /** `out`: el fichero llama; `in`: otro fichero lo llama. */
  direction: "out" | "in";
  /** La ruta del fichero del otro extremo. */
  path: string;
}

/**
 * Las aristas FFI que tocan el fichero.
 *
 * La lente de migración guarda los extremos por `nodeId`; aquí se traducen a
 * rutas con la lista de ficheros del modelo, que es lo que se puede enseñar.
 */
export function ffiEdgesForFile(
  migration: CcMigrationLens | null,
  nodeId: string | null,
  files: ReadonlyArray<{ nodeId: string; path: string }>
): FfiEdgeView[] {
  if (!migration || !nodeId) return [];
  const paths = new Map(files.map((file) => [file.nodeId, file.path]));
  const edges: FfiEdgeView[] = [];

  for (const edge of migration.edges) {
    if (edge.fromId === nodeId) {
      const path = paths.get(edge.toId);
      if (path) edges.push({ kind: edge.kind, direction: "out", path });
    } else if (edge.toId === nodeId) {
      const path = paths.get(edge.fromId);
      if (path) edges.push({ kind: edge.kind, direction: "in", path });
    }
  }

  return edges.sort(
    (left, right) =>
      left.path.localeCompare(right.path) ||
      left.direction.localeCompare(right.direction)
  );
}

/**
 * De dónde sale una regla, en una palabra.
 *
 * Las de un addon llevan su nombre en el `source` (`addon:vista-3d`): la ficha
 * lo enseña tal cual para que se sepa a quién pedirle cuentas.
 */
export function sourceLabel(source: RuleViolation["source"]): string {
  if (source === "config") return "equipo";
  if (source === "profile") return "perfil";
  return source.slice("addon:".length);
}

/** Lo que la lente de símbolos aporta a la ficha, sin repetir la lista entera. */
export interface SymbolSummary {
  count: number;
  functions: number;
  mostComplex: CcSymbol | null;
}

export function symbolSummary(symbols: readonly CcSymbol[]): SymbolSummary {
  let functions = 0;
  let mostComplex: CcSymbol | null = null;

  for (const symbol of symbols) {
    if (symbol.kind === "function") functions += 1;
    const complexity = symbol.complexity ?? 0;
    if (
      mostComplex === null ||
      complexity > (mostComplex.complexity ?? 0)
    ) {
      mostComplex = symbol;
    }
  }

  return { count: symbols.length, functions, mostComplex };
}
