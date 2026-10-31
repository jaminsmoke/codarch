import type { LintArtifact, LintFile, LintSeverity } from "./format";

/**
 * La deuda de lint de una carpeta, contada una sola vez (ADR 0094, ADR 0096).
 *
 * La UI, el CLI y el MCP leen el mismo artefacto y tienen que decir los mismos
 * números. Vivir aquí, junto al formato, evita que cada consumidor cuente a su
 * manera: un `info` es un hallazgo en los tres sitios, aunque no sea ni error
 * ni aviso, y un fichero cuenta como afectado en cuanto tiene un mensaje.
 */

export interface LintTotals {
  errors: number;
  warnings: number;
  /** Mensajes `info`: hallazgos que no pesan como deuda. */
  info: number;
  /** Todos los mensajes del ámbito: errores, avisos e info. */
  findings: number;
  /** Ficheros con al menos un mensaje de cualquier severidad. */
  files: number;
}

/** La cuenta de un fichero, para una señal que pesa por fichero. */
export interface LintFileCount {
  errors: number;
  warnings: number;
}

/**
 * Las cuentas por fichero, tomadas de los mensajes.
 *
 * Es la misma fuente que `lintTotals` y `lintRules`: el riesgo de un fichero y
 * los totales de la hoja no pueden leer cifras distintas. Los campos `errors`
 * y `warnings` del artefacto son un resumen que se puede desincronizar con sus
 * mensajes —lo trae así una herramienta de fuera—, y entonces el mapa y la
 * ficha dirían números diferentes.
 */
export function lintFileCounts(
  files: Readonly<Record<string, LintFile>>
): Record<string, LintFileCount> {
  const counts: Record<string, LintFileCount> = {};
  for (const [path, file] of Object.entries(files)) {
    let errors = 0;
    let warnings = 0;
    for (const message of file.messages) {
      if (message.severity === "error") errors += 1;
      else if (message.severity === "warn") warnings += 1;
    }
    counts[path] = { errors, warnings };
  }
  return counts;
}

/** Una regla con los hallazgos que tiene en el ámbito pedido. */
export interface LintRuleCount {
  rule: string;
  errors: number;
  warnings: number;
  findings: number;
}

/**
 * Si una ruta del artefacto cuelga de una carpeta.
 *
 * Con `""` cuelga todo (el proyecto entero). La barra cuenta: `packages/ui`
 * no contiene `packages/ui2`, que es el error clásico de comparar prefijos a
 * secas. Una ruta igual a la carpeta también entra: en un fichero, su ruta es
 * el ámbito.
 */
export function withinLintFolder(folder: string, path: string): boolean {
  if (folder === "") return true;
  return path === folder || path.startsWith(`${folder}/`);
}

/**
 * Los totales de lint de una carpeta, o `null` cuando no hay artefacto.
 *
 * `null` es «sin medir», no «limpio»: un proyecto sin lint no tiene 0 errores,
 * tiene la señal apagada (ADR 0094).
 *
 * Todo sale de los **mensajes**, no de las cuentas que declara cada fichero: un
 * artefacto de fuera puede traer `errors` y `messages` que no cuadren, y entonces
 * dos hojas de la misma app enseñarían cifras distintas. Contando de una fuente,
 * Métricas y Reglas leen el mismo número por construcción (ADR 0096).
 */
export function lintTotals(
  artifact: LintArtifact | null,
  folder = ""
): LintTotals | null {
  if (!artifact) return null;

  let errors = 0;
  let warnings = 0;
  let info = 0;
  let files = 0;
  for (const [path, entry] of Object.entries(artifact.files)) {
    if (!withinLintFolder(folder, path)) continue;
    if (entry.messages.length > 0) files += 1;
    for (const message of entry.messages) {
      if (message.severity === "error") errors += 1;
      else if (message.severity === "warn") warnings += 1;
      else info += 1;
    }
  }

  return { errors, warnings, info, findings: errors + warnings + info, files };
}

/**
 * Las reglas con hallazgos, contadas desde sus mensajes.
 *
 * Es la cuenta que comparten todos los consumidores: cada mensaje suma uno a
 * su regla, con su severidad, y los empates se rompen por el identificador para
 * que el orden no dependa del de entrada. Un `info` cuenta como hallazgo, pero
 * no como error ni aviso.
 */
export function lintRuleCounts(
  messages: Iterable<{ rule: string; severity: LintSeverity }>
): LintRuleCount[] {
  const byRule = new Map<string, LintRuleCount>();
  for (const message of messages) {
    const count = byRule.get(message.rule) ?? {
      rule: message.rule,
      errors: 0,
      warnings: 0,
      findings: 0
    };
    count.findings += 1;
    if (message.severity === "error") count.errors += 1;
    else if (message.severity === "warn") count.warnings += 1;
    byRule.set(message.rule, count);
  }

  return [...byRule.values()].sort(
    (left, right) =>
      right.errors - left.errors ||
      right.warnings - left.warnings ||
      right.findings - left.findings ||
      compareStrings(left.rule, right.rule)
  );
}

/** Las reglas con hallazgos en una carpeta, de lo que más pesa a lo que menos. */
export function lintRules(
  artifact: LintArtifact | null,
  folder = ""
): LintRuleCount[] {
  if (!artifact) return [];

  const messages: Array<{ rule: string; severity: LintSeverity }> = [];
  for (const [path, file] of Object.entries(artifact.files)) {
    if (!withinLintFolder(folder, path)) continue;
    for (const message of file.messages) {
      messages.push({ rule: message.rule, severity: message.severity });
    }
  }
  return lintRuleCounts(messages);
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
