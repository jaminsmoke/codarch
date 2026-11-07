import type { CcJson } from "@codarch/schema/browser";
import { walkFiles } from "@codarch/schema/browser";
import {
  isCurrentClean,
  lintScopePath,
  scopeHealth,
  withinLintFolder,
  type HealthScope,
  type HealthSnapshot,
  type LintArtifact,
  type LintRule,
  type LintSeverity,
  type LintSystem,
  type ScopeHealth
} from "@codarch/lint/browser";

/**
 * Adaptador de la ficha y del catálogo hasta que el paquete de lint exporte
 * `scopeHealthMerged` y `meta.systems.activeRules`.
 *
 * La cobertura de cada origen sale de `scopeHealth` y no se suma con la otra.
 * Los mensajes se listan por ruta canónica, con el dominio del artefacto que
 * los escribió. Cuando el helper llegue, se sustituye el cuerpo de
 * `readSelection` y `readActiveRules` por esa llamada: el tipo de aquí es el
 * que la UI ya pinta.
 */

export type LintOrigin = "code" | "docs";

export type ActiveRuleCountState = "known-complete" | "partial" | "unknown";

export type MapId = "code" | "rest";

/** Lo que el helper va a declarar en cada sistema. `count` solo si el recuento está cerrado. */
export interface ActiveRulesDeclaration {
  countState: ActiveRuleCountState;
  count: number | null;
  rules: readonly LintRule[];
}

export interface SelectionOrigin {
  domain: LintOrigin;
  /** Las herramientas del artefacto, sin asignar un mensaje a una de varias. */
  tools: readonly string[];
  /**
   * El origen cuenta para este ámbito. Un fichero que el otro árbol no mide
   * no lo es: no se inventa una cobertura para él.
   */
  applicable: boolean;
  legacy: boolean;
  /** La salud de este origen solo. `null` si no hay artefacto. */
  health: ScopeHealth | null;
}

export interface TaggedFinding {
  path: string;
  domain: LintOrigin;
  /**
   * La herramienta cuando el artefacto declara exactamente una.
   * `null` si declara varias: el mensaje no dice cuál lo emitió.
   */
  tool: string | null;
  tools: readonly string[];
  rule: string;
  severity: LintSeverity;
  message: string;
  line?: number;
  column?: number;
}

export interface TaggedFile {
  path: string;
  domain: LintOrigin;
  tool: string | null;
  tools: readonly string[];
  errors: number;
  warnings: number;
  info: number;
}

export interface SelectionCounts {
  errors: number;
  warnings: number;
  info: number;
  findings: number;
  files: number;
}

/**
 * La forma que va a devolver `scopeHealthMerged`.
 *
 * `clean` es la puerta de la ficha: falso si cualquier origen aplicable es
 * heredado o `unknown`, o si no cumple `isCurrentClean`. No es una cobertura
 * fusionada.
 */
export interface ScopeHealthMerged {
  origins: readonly SelectionOrigin[];
  findings: readonly TaggedFinding[];
  affectedFiles: readonly TaggedFile[];
  counts: SelectionCounts;
  clean: boolean;
}

const EMPTY_COUNTS: SelectionCounts = {
  errors: 0,
  warnings: 0,
  info: 0,
  findings: 0,
  files: 0
};

const NOT_APPLICABLE = new Set(["not-found", "not-eligible", "no-eligible"]);

function artifactIsLegacy(artifact: LintArtifact): boolean {
  return (
    artifact.coverage?.legacy === true ||
    artifact.schemaVersion === "1.0" ||
    artifact.schemaVersion === "1.1" ||
    artifact.schemaVersion === "1.2"
  );
}

function inScope(scope: HealthScope, path: string): boolean {
  if (scope.kind === "project") return true;
  if (scope.kind === "file") return lintScopePath(path) === lintScopePath(scope.path);
  return withinLintFolder(scope.path, path);
}

function toolOf(tools: readonly string[]): string | null {
  return tools.length === 1 ? tools[0] ?? null : null;
}

/** El checksum y las rutas del mapa, con el mismo prefijo que el modelo. */
export function healthSnapshotFromCc(cc: CcJson | null): HealthSnapshot | undefined {
  if (!cc) return undefined;
  const single =
    cc.files.length === 1 && cc.files[0]?.type === "Folder" ? cc.files[0] : null;
  const prefix = single ? `${single.name}/` : "";
  const paths: string[] = [];
  walkFiles(cc.files, (entry) => {
    const full = entry.path;
    paths.push(prefix && full.startsWith(prefix) ? full.slice(prefix.length) : full);
  });
  const checksum = cc.meta.checksum ?? "";
  return {
    treeHash: checksum.length > 0 ? checksum : null,
    paths
  };
}

function readOrigin(
  domain: LintOrigin,
  artifact: LintArtifact | null,
  scope: HealthScope,
  snapshot: HealthSnapshot | undefined
): { origin: SelectionOrigin; files: TaggedFile[]; findings: TaggedFinding[] } {
  if (!artifact) {
    return {
      origin: { domain, tools: [], applicable: false, legacy: false, health: null },
      files: [],
      findings: []
    };
  }

  const health = scopeHealth(artifact, scope, snapshot);
  const tools = artifact.meta.tools;
  const tool = toolOf(tools);
  const files: TaggedFile[] = [];
  const findings: TaggedFinding[] = [];

  for (const path of Object.keys(artifact.files).sort((left, right) =>
    left < right ? -1 : left > right ? 1 : 0
  )) {
    if (!inScope(scope, path)) continue;
    const file = artifact.files[path];
    if (!file || file.messages.length === 0) continue;
    let errors = 0;
    let warnings = 0;
    let info = 0;
    for (const message of file.messages) {
      if (message.severity === "error") errors += 1;
      else if (message.severity === "warn") warnings += 1;
      else info += 1;
      if (scope.kind === "file") {
        findings.push({
          path,
          domain,
          tool,
          tools,
          rule: message.rule,
          severity: message.severity,
          message: message.message,
          ...(message.line === undefined ? {} : { line: message.line }),
          ...(message.column === undefined ? {} : { column: message.column })
        });
      }
    }
    files.push({ path, domain, tool, tools, errors, warnings, info });
  }

  const absent =
    files.length === 0 &&
    health.coverage.reasons.some((reason) => NOT_APPLICABLE.has(reason.code));
  const applicable = scope.kind === "project" ? true : !absent;

  return {
    origin: {
      domain,
      tools,
      applicable,
      legacy: artifactIsLegacy(artifact),
      health
    },
    files,
    findings
  };
}

function addFile(total: SelectionCounts, file: TaggedFile): void {
  total.errors += file.errors;
  total.warnings += file.warnings;
  total.info += file.info;
  total.findings += file.errors + file.warnings + file.info;
  total.files += 1;
}

/**
 * Los dos orígenes de la selección.
 *
 * No suma `eligible` ni `measured`. Un mensaje de docs entra en la raíz del
 * proyecto aunque su ruta no esté entre los ficheros del mapa de código.
 */
export function readSelection(input: {
  code: LintArtifact | null;
  docs: LintArtifact | null;
  scope: HealthScope;
  codeSnapshot?: HealthSnapshot;
  docsSnapshot?: HealthSnapshot;
}): ScopeHealthMerged {
  const code = readOrigin("code", input.code, input.scope, input.codeSnapshot);
  const docs = readOrigin("docs", input.docs, input.scope, input.docsSnapshot);
  const affectedFiles = [...code.files, ...docs.files].sort((left, right) =>
    left.path < right.path
      ? -1
      : left.path > right.path
        ? 1
        : left.domain < right.domain
          ? -1
          : left.domain > right.domain
            ? 1
            : 0
  );
  const counts = { ...EMPTY_COUNTS };
  for (const file of affectedFiles) addFile(counts, file);

  const origins = [code.origin, docs.origin];
  const applicable = origins.filter((origin) => origin.applicable);
  const blocked = applicable.some(
    (origin) =>
      origin.legacy ||
      origin.health === null ||
      origin.health.coverage.state === "unknown" ||
      !isCurrentClean(origin.health)
  );
  const clean = applicable.length > 0 && !blocked;

  return {
    origins,
    findings: [...code.findings, ...docs.findings],
    affectedFiles,
    counts,
    clean
  };
}

/** Texto del distintivo. Varias herramientas se nombran todas: no se elige una. */
export function originBadge(
  domain: LintOrigin,
  tool: string | null,
  tools: readonly string[]
): string {
  const name = domain === "code" ? "código" : "docs";
  if (tool) return `${name} · ${tool}`;
  if (tools.length === 0) return name;
  return `${name} · ${tools.join(" · ")}`;
}

/**
 * A qué mapa pertenece una ruta pulsada.
 *
 * Se queda en el mapa que ya la contiene. Si no, cambia al otro. Si ninguno
 * la tiene, no hay navegación.
 */
export function planFindingOpen(input: {
  path: string;
  map: MapId;
  inCode: boolean;
  inRest: boolean;
}): { map: MapId } | null {
  const here = input.map === "code" ? input.inCode : input.inRest;
  if (here) return { map: input.map };
  const other: MapId = input.map === "code" ? "rest" : "code";
  const there = other === "code" ? input.inCode : input.inRest;
  if (there) return { map: other };
  return null;
}

function isCountState(value: unknown): value is ActiveRuleCountState {
  return value === "known-complete" || value === "partial" || value === "unknown";
}

function isRule(value: unknown): value is LintRule {
  if (!value || typeof value !== "object") return false;
  const rule = value as { id?: unknown; severity?: unknown };
  return (
    typeof rule.id === "string" &&
    (rule.severity === "error" || rule.severity === "warn" || rule.severity === "info")
  );
}

/**
 * El recuento de reglas activas que declara el sistema.
 *
 * Sin `activeRules`, el estado es `unknown`. No se cuenta `rules.length` y
 * no se escribe un cero.
 */
export function readActiveRules(system: LintSystem): ActiveRulesDeclaration {
  const extra = system as LintSystem & { activeRules?: unknown };
  const raw = extra.activeRules;
  if (!raw || typeof raw !== "object") {
    return {
      countState: "unknown",
      count: null,
      rules: system.rules ?? []
    };
  }
  const record = raw as { countState?: unknown; count?: unknown; rules?: unknown };
  if (!isCountState(record.countState)) {
    return { countState: "unknown", count: null, rules: system.rules ?? [] };
  }
  const declared = Array.isArray(record.rules)
    ? record.rules.filter(isRule)
    : [];
  if (record.countState !== "known-complete" || typeof record.count !== "number") {
    const countState = record.countState === "known-complete" ? "unknown" : record.countState;
    return { countState, count: null, rules: declared };
  }
  return { countState: "known-complete", count: record.count, rules: declared };
}

/** La insignia del catálogo: el número solo cuando todos los sistemas lo tienen cerrado. */
export function catalogBadge(systems: readonly { activeRules: ActiveRulesDeclaration }[]): {
  count: number | undefined;
  state: ActiveRuleCountState;
} {
  if (systems.length === 0) return { count: undefined, state: "unknown" };
  if (
    systems.every(
      (system) =>
        system.activeRules.countState === "known-complete" && system.activeRules.count !== null
    )
  ) {
    return {
      count: systems.reduce((total, system) => total + (system.activeRules.count ?? 0), 0),
      state: "known-complete"
    };
  }
  if (systems.some((system) => system.activeRules.countState === "unknown")) {
    return { count: undefined, state: "unknown" };
  }
  return { count: undefined, state: "partial" };
}

export function countStateText(state: ActiveRuleCountState, count: number | null): string {
  switch (state) {
    case "known-complete":
      return `${count ?? 0} ${count === 1 ? "regla activa" : "reglas activas"}`;
    case "partial":
      return "Recuento parcial.";
    case "unknown":
      return "Recuento desconocido.";
    default: {
      const unexpected: never = state;
      return unexpected;
    }
  }
}
