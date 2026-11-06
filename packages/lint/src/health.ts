import {
  LintError,
  canonicalLintPath,
  type LintArtifact,
  type LintMessage,
  type LintSummary,
  type LintSystem
} from "./format";
import { withinLintFolder } from "./rollup";

/**
 * Contrato de cobertura del lint 1.3.
 *
 * La cobertura es la única verdad de la medida. `files` solo guarda hallazgos.
 * Los números que no se saben son `null`, nunca un cero inventado. `scopeHealth`
 * es pura: no lee disco ni lanza herramientas.
 */

/** Ruta relativa POSIX en NFC. La produce `canonicalLintPath`. */
export type RepoPath = string;

export type LintDomain = "code" | "docs";

export type CoverageState = "unmeasured" | "unknown" | "partial" | "complete";

export const REASON_CODES = [
  "legacy-global",
  "tool-failed",
  "tool-missing",
  "unknown-eligibility",
  "unknown-paths",
  "not-eligible",
  "not-found",
  "no-eligible",
  "freshness-unverified"
] as const;

export type ReasonCode = (typeof REASON_CODES)[number];

export interface Reason {
  code: ReasonCode;
  text?: string;
}

/**
 * Lo que una herramienta sabe de su medida.
 *
 * `eligiblePaths: null` es «no sé el universo». Un array, aunque esté vacío,
 * es una enumeración válida. `measuredPaths: []` solo sale de esa enumeración,
 * nunca de un parseo vacío o fallido.
 */
export type ToolCoverage =
  | {
      outcome: "enumerated";
      measuredPaths: RepoPath[];
      eligiblePaths: RepoPath[] | null;
    }
  | {
      outcome: "unknown";
      eligiblePaths: null;
      reasons: Reason[];
    }
  | {
      outcome: "failed" | "missing";
      eligiblePaths: null;
      reasons: Reason[];
    };

/** Lo que devuelve un adaptador antes de entrar en el artefacto. */
export type AdapterEnumeration =
  | { ok: true; measuredPaths: RepoPath[] }
  | { ok: false; reason: Reason };

export interface LintCoverage {
  tools: Record<string, ToolCoverage>;
  /**
   * Lectura de un artefacto 1.0–1.2. No lo escribe `createLintArtifact`.
   * Obliga a `unknown` + `legacy-global` aunque la versión en memoria ya sea 1.3.
   */
  legacy?: true;
}

export interface HealthScope {
  kind: "file" | "folder" | "project";
  path: string;
}

export interface HealthSnapshot {
  treeHash: string | null;
  paths: readonly RepoPath[];
}

export interface LintCounts {
  errors: number;
  warnings: number;
  info: number;
  findings: number;
  filesWithFindings: number;
}

export interface AffectedFile {
  path: RepoPath;
  counts: LintCounts;
}

export interface ToolHealth {
  state: CoverageState;
  eligible: number | null;
  measured: number | null;
  reasons: Reason[];
}

export interface CoverageHealth {
  state: CoverageState;
  eligible: number | null;
  measured: number | null;
  byTool: Record<string, ToolHealth>;
  reasons: Reason[];
}

export interface ScopeHealth {
  domain: LintDomain;
  scope: HealthScope;
  coverage: CoverageHealth;
  fresh: boolean | null;
  counts: LintCounts;
  affectedFiles: AffectedFile[];
  /** Solo en un fichero. En carpeta y proyecto, siempre vacío. */
  messages: LintMessage[];
}

const ENUMERATING = new Set(["eslint", "checkstyle", "eslint-json", "checkstyle-xml"]);

const ZERO: LintCounts = {
  errors: 0,
  warnings: 0,
  info: 0,
  findings: 0,
  filesWithFindings: 0
};

/**
 * Un adaptador que enumera de verdad (ESLint, Checkstyle) convierte el parseo
 * en una enumeración. El resto no enumera: un `ok: true` suyo no es cobertura.
 * Un parseo fallido no se disfraza de lista vacía.
 */
export function adoptEnumeration(
  tool: string,
  parsed: { ok: true; paths: readonly string[] } | { ok: false; reason: Reason }
): AdapterEnumeration | "unsupported" {
  if (!ENUMERATING.has(tool)) return "unsupported";
  if (!parsed.ok) return { ok: false, reason: parsed.reason };
  return { ok: true, measuredPaths: [...parsed.paths] };
}

/** Cobertura de una herramienta a partir de su enumeración. `eligiblePaths` null en el código. */
export function coverageFromEnumeration(
  enumeration: AdapterEnumeration | "unsupported",
  eligiblePaths: readonly string[] | null = null
): ToolCoverage {
  if (enumeration === "unsupported") {
    return {
      outcome: "unknown",
      eligiblePaths: null,
      reasons: [{ code: "unknown-eligibility" }]
    };
  }
  if (!enumeration.ok) {
    const outcome = enumeration.reason.code === "tool-missing" ? "missing" : "failed";
    return { outcome, eligiblePaths: null, reasons: [enumeration.reason] };
  }
  return {
    outcome: "enumerated",
    measuredPaths: [...enumeration.measuredPaths],
    eligiblePaths: eligiblePaths === null ? null : [...eligiblePaths]
  };
}

/** La config que ya vive en `meta`, sin copiarla a otro campo del fichero. */
export function lintConfig(artifact: LintArtifact): {
  tools: string[];
  systems: LintSystem[];
} {
  return {
    tools: [...artifact.meta.tools],
    systems: artifact.meta.systems.map((system) => ({
      ...system,
      ...(system.rules ? { rules: system.rules.map((rule) => ({ ...rule })) } : {})
    }))
  };
}

/**
 * Limpio de verdad: medida completa, árbol al día, cero hallazgos y algo que
 * medir. `complete` con frescura `null` no lo es: es «sin hallazgos, no verificado».
 */
export function isCurrentClean(health: ScopeHealth): boolean {
  return (
    health.coverage.state === "complete" &&
    health.fresh === true &&
    health.counts.findings === 0 &&
    (health.coverage.eligible ?? 0) > 0
  );
}

/**
 * Frase corta para el CLI. La UI traduce los códigos; aquí solo está el
 * texto que el contrato nombra para no dejar el estado en un número.
 */
export function scopeHealthNote(health: ScopeHealth): string | null {
  if (isCurrentClean(health)) return "limpio y al día";
  const codes = new Set(health.coverage.reasons.map((item) => item.code));
  if (
    health.coverage.state === "complete" &&
    health.fresh !== true &&
    health.counts.findings === 0 &&
    (health.coverage.eligible ?? 0) > 0
  ) {
    return "sin hallazgos, no verificado";
  }
  if (
    health.coverage.state === "unknown" &&
    health.coverage.measured !== null &&
    health.counts.findings === 0
  ) {
    return "medidos, sin hallazgos, universo no verificado";
  }
  if (codes.has("legacy-global")) return "cobertura heredada";
  if (codes.has("no-eligible")) return "nada que medir";
  if (codes.has("not-eligible")) return "fuera de lo medible";
  if (codes.has("not-found")) return "no está en el árbol";
  if (health.coverage.state === "partial") return "cobertura parcial";
  if (health.coverage.state === "unmeasured") return "sin medir";
  return null;
}

/** El `summary` heredado, el mismo que el ámbito de proyecto. */
export function summaryFromHealth(health: ScopeHealth): LintSummary {
  return {
    files: health.counts.filesWithFindings,
    errors: health.counts.errors,
    warnings: health.counts.warnings,
    messages: health.counts.findings,
    ...(health.coverage.measured === null ? {} : { measured: health.coverage.measured })
  };
}

export function scopeHealth(
  artifact: LintArtifact | null,
  scope: HealthScope,
  snapshot?: HealthSnapshot
): ScopeHealth {
  const resolved = resolveScope(scope);
  const counts = countScope(artifact, resolved);
  const fresh = freshness(artifact, snapshot);
  const baseReasons = fresh === null ? [reason("freshness-unverified")] : [];

  if (!artifact) {
    return {
      domain: "code",
      scope: resolved,
      coverage: {
        state: "unmeasured",
        eligible: null,
        measured: null,
        byTool: {},
        reasons: baseReasons
      },
      fresh,
      counts: counts.counts,
      affectedFiles: counts.affected,
      messages: counts.messages
    };
  }

  const domain = artifact.domain ?? "code";
  if (isLegacy(artifact)) {
    return {
      domain,
      scope: resolved,
      coverage: {
        state: "unknown",
        eligible: null,
        measured: null,
        byTool: legacyTools(artifact),
        reasons: mergeReasons([reason("legacy-global"), ...baseReasons])
      },
      fresh,
      counts: counts.counts,
      affectedFiles: counts.affected,
      messages: counts.messages
    };
  }

  const special = specialScope(artifact, resolved, snapshot);
  if (special) {
    return {
      domain,
      scope: resolved,
      coverage: {
        ...special,
        reasons: mergeReasons([...special.reasons, ...baseReasons])
      },
      fresh,
      counts: counts.counts,
      affectedFiles: counts.affected,
      messages: counts.messages
    };
  }

  const coverage = aggregate(artifact, resolved);
  return {
    domain,
    scope: resolved,
    coverage: {
      ...coverage,
      reasons: mergeReasons([...coverage.reasons, ...baseReasons])
    },
    fresh,
    counts: counts.counts,
    affectedFiles: counts.affected,
    messages: counts.messages
  };
}

function resolveScope(scope: HealthScope): HealthScope {
  if (scope.kind === "project") return { kind: "project", path: "" };
  try {
    return { kind: scope.kind, path: canonicalLintPath(scope.path) };
  } catch (error) {
    if (error instanceof LintError) return { kind: scope.kind, path: scope.path };
    throw error;
  }
}

function isLegacy(artifact: LintArtifact): boolean {
  return (
    artifact.coverage?.legacy === true ||
    artifact.schemaVersion === "1.0" ||
    artifact.schemaVersion === "1.1" ||
    artifact.schemaVersion === "1.2"
  );
}

function freshness(
  artifact: LintArtifact | null,
  snapshot: HealthSnapshot | undefined
): boolean | null {
  if (!artifact || !snapshot || snapshot.treeHash === null || artifact.meta.tree === undefined) {
    return null;
  }
  return artifact.meta.tree === snapshot.treeHash;
}

function countScope(
  artifact: LintArtifact | null,
  scope: HealthScope
): { counts: LintCounts; affected: AffectedFile[]; messages: LintMessage[] } {
  if (!artifact) return { counts: { ...ZERO }, affected: [], messages: [] };

  const affected: AffectedFile[] = [];
  let messages: LintMessage[] = [];
  for (const path of Object.keys(artifact.files).sort(compareStrings)) {
    if (!inScope(scope, path)) continue;
    const file = artifact.files[path];
    if (!file || file.messages.length === 0) continue;
    const counts = countsOf(file.messages, 1);
    affected.push({ path, counts });
    if (scope.kind === "file") messages = file.messages.map((message) => ({ ...message }));
  }

  return {
    counts: affected.reduce(
      (total, file) => addCounts(total, file.counts),
      { ...ZERO }
    ),
    affected,
    messages: scope.kind === "file" ? messages : []
  };
}

function countsOf(messages: readonly LintMessage[], filesWithFindings: number): LintCounts {
  let errors = 0;
  let warnings = 0;
  let info = 0;
  for (const message of messages) {
    if (message.severity === "error") errors += 1;
    else if (message.severity === "warn") warnings += 1;
    else info += 1;
  }
  return {
    errors,
    warnings,
    info,
    findings: errors + warnings + info,
    filesWithFindings
  };
}

function addCounts(left: LintCounts, right: LintCounts): LintCounts {
  return {
    errors: left.errors + right.errors,
    warnings: left.warnings + right.warnings,
    info: left.info + right.info,
    findings: left.findings + right.findings,
    filesWithFindings: left.filesWithFindings + right.filesWithFindings
  };
}

function inScope(scope: HealthScope, path: string): boolean {
  if (scope.kind === "project") return true;
  if (scope.kind === "file") return path === scope.path;
  return withinLintFolder(scope.path, path);
}

function legacyTools(artifact: LintArtifact): Record<string, ToolHealth> {
  const byTool: Record<string, ToolHealth> = {};
  for (const name of [...artifact.meta.tools].sort(compareStrings)) {
    byTool[name] = {
      state: "unknown",
      eligible: null,
      measured: null,
      reasons: [reason("legacy-global")]
    };
  }
  return byTool;
}

/**
 * Casos que no son una agregación de herramientas: el fichero no está, no
 * entra en el universo, o el universo válido está vacío.
 */
function specialScope(
  artifact: LintArtifact,
  scope: HealthScope,
  snapshot: HealthSnapshot | undefined
): CoverageHealth | null {
  const tools = artifact.coverage?.tools ?? {};
  if (scope.kind === "file") {
    const fileReason = fileAbsence(artifact, scope.path, tools, snapshot);
    if (fileReason === "unknown-paths") {
      return {
        state: "unknown",
        eligible: null,
        measured: null,
        byTool: toolHealthMap(tools, scope),
        reasons: [reason("unknown-paths")]
      };
    }
  if (fileReason) {
      return {
        state: "unmeasured",
        eligible: fileReason === "not-eligible" ? 0 : null,
        measured: fileReason === "not-eligible" ? 0 : null,
        byTool: toolHealthMap(tools, scope),
        reasons: [reason(fileReason)]
      };
    }
  }

  if (emptyUniverse(tools, scope)) {
    return {
      state: "unmeasured",
      eligible: 0,
      measured: 0,
      byTool: toolHealthMap(tools, scope),
      reasons: [reason("no-eligible")]
    };
  }
  return null;
}

function fileAbsence(
  artifact: LintArtifact,
  path: string,
  tools: Record<string, ToolCoverage>,
  snapshot: HealthSnapshot | undefined
): "not-found" | "not-eligible" | "unknown-paths" | null {
  if (artifact.files[path] && (artifact.files[path]?.messages.length ?? 0) > 0) {
    return null;
  }
  const snap = snapshotPaths(snapshot);
  if (snap && !snap.has(path)) return "not-found";

  const names = Object.keys(tools);
  if (names.length === 0) return snap ? null : "unknown-paths";

  const proven = names.every((name) => {
    const tool = tools[name];
    return tool?.outcome === "enumerated" && tool.eligiblePaths !== null;
  });
  if (proven) {
    const eligible = new Set<string>();
    for (const tool of Object.values(tools)) {
      if (tool.outcome !== "enumerated" || tool.eligiblePaths === null) continue;
      for (const item of tool.eligiblePaths) eligible.add(item);
    }
    if (!eligible.has(path)) return "not-eligible";
    return null;
  }

  if (!snap) {
    const mentioned = pathMentioned(path, tools) || Boolean(artifact.files[path]);
    if (!mentioned) return "unknown-paths";
  }
  return null;
}

function pathMentioned(path: string, tools: Record<string, ToolCoverage>): boolean {
  for (const tool of Object.values(tools)) {
    if (tool.outcome !== "enumerated") continue;
    if (tool.measuredPaths.includes(path)) return true;
    if (tool.eligiblePaths?.includes(path)) return true;
  }
  return false;
}

function snapshotPaths(snapshot: HealthSnapshot | undefined): Set<string> | null {
  if (!snapshot) return null;
  const paths = new Set<string>();
  for (const path of snapshot.paths) {
    try {
      paths.add(canonicalLintPath(path));
    } catch (error) {
      if (error instanceof LintError) continue;
      throw error;
    }
  }
  return paths;
}

/** Universo conocido y vacío en el ámbito: no es «medido y limpio». */
function emptyUniverse(
  tools: Record<string, ToolCoverage>,
  scope: HealthScope
): boolean {
  const list = Object.values(tools);
  if (list.length === 0) return false;
  if (!list.every((tool) => tool.outcome === "enumerated" && tool.eligiblePaths !== null)) {
    return false;
  }
  const eligible = new Set<string>();
  for (const tool of list) {
    if (tool.outcome !== "enumerated" || tool.eligiblePaths === null) continue;
    for (const path of tool.eligiblePaths) {
      if (inScope(scope, path)) eligible.add(path);
    }
  }
  return eligible.size === 0;
}

function aggregate(artifact: LintArtifact, scope: HealthScope): CoverageHealth {
  const tools = artifact.coverage?.tools ?? {};
  const names = Object.keys(tools).sort(compareStrings);
  const byTool = toolHealthMap(tools, scope);
  if (names.length === 0) {
    const hasFindings = Object.values(artifact.files).some((file) => file.messages.length > 0);
    return {
      state: hasFindings ? "unknown" : "unmeasured",
      eligible: null,
      measured: null,
      byTool,
      reasons: hasFindings ? [reason("unknown-eligibility")] : []
    };
  }

  const enumerated = names.filter((name) => tools[name]?.outcome === "enumerated");
  const others = names.filter((name) => tools[name]?.outcome !== "enumerated");
  const measured = unionMeasured(tools, scope);
  const eligible = unionEligible(tools, scope);

  if (enumerated.length > 0 && others.length > 0) {
    return {
      state: "partial",
      eligible,
      measured,
      byTool,
      reasons: collectReasons(names.map((name) => byTool[name]))
    };
  }

  if (enumerated.length === 0) {
    const onlyHardFailures = names.every((name) => {
      const outcome = tools[name]?.outcome;
      return outcome === "failed" || outcome === "missing";
    });
    return {
      state: onlyHardFailures ? "unmeasured" : "unknown",
      eligible: null,
      measured: null,
      byTool,
      reasons: collectReasons(names.map((name) => byTool[name]))
    };
  }

  const universeKnown = names.every((name) => {
    const tool = tools[name];
    return tool?.outcome === "enumerated" && tool.eligiblePaths !== null;
  });
  if (!universeKnown) {
    return {
      state: "unknown",
      eligible: null,
      measured,
      byTool,
      reasons: mergeReasons([
        reason("unknown-eligibility"),
        ...collectReasons(names.map((name) => byTool[name]))
      ])
    };
  }

  const eligiblePaths = new Set<string>();
  const measuredPaths = new Set<string>();
  for (const tool of Object.values(tools)) {
    if (tool.outcome !== "enumerated" || tool.eligiblePaths === null) continue;
    for (const path of tool.eligiblePaths) {
      if (inScope(scope, path)) eligiblePaths.add(path);
    }
    for (const path of tool.measuredPaths) {
      if (inScope(scope, path)) measuredPaths.add(path);
    }
  }
  const covered = [...eligiblePaths].every((path) => measuredPaths.has(path));
  return {
    state: covered ? "complete" : "partial",
    eligible: eligiblePaths.size,
    measured: measuredPaths.size,
    byTool,
    reasons: covered ? [] : collectReasons(names.map((name) => byTool[name]))
  };
}

function unionMeasured(
  tools: Record<string, ToolCoverage>,
  scope: HealthScope
): number | null {
  const paths = new Set<string>();
  let any = false;
  for (const tool of Object.values(tools)) {
    if (tool.outcome !== "enumerated") continue;
    any = true;
    for (const path of tool.measuredPaths) {
      if (inScope(scope, path)) paths.add(path);
    }
  }
  return any ? paths.size : null;
}

function unionEligible(
  tools: Record<string, ToolCoverage>,
  scope: HealthScope
): number | null {
  for (const tool of Object.values(tools)) {
    if (tool.outcome !== "enumerated" || tool.eligiblePaths === null) return null;
  }
  const paths = new Set<string>();
  for (const tool of Object.values(tools)) {
    if (tool.outcome !== "enumerated" || tool.eligiblePaths === null) continue;
    for (const path of tool.eligiblePaths) {
      if (inScope(scope, path)) paths.add(path);
    }
  }
  return paths.size;
}

function toolHealthMap(
  tools: Record<string, ToolCoverage>,
  scope: HealthScope
): Record<string, ToolHealth> {
  const byTool: Record<string, ToolHealth> = {};
  for (const name of Object.keys(tools).sort(compareStrings)) {
    const tool = tools[name];
    if (tool) byTool[name] = toolHealth(tool, scope);
  }
  return byTool;
}

function toolHealth(tool: ToolCoverage, scope: HealthScope): ToolHealth {
  switch (tool.outcome) {
    case "failed":
      return {
        state: "unmeasured",
        eligible: null,
        measured: null,
        reasons: tool.reasons.length > 0 ? tool.reasons : [reason("tool-failed")]
      };
    case "missing":
      return {
        state: "unmeasured",
        eligible: null,
        measured: null,
        reasons: tool.reasons.length > 0 ? tool.reasons : [reason("tool-missing")]
      };
    case "unknown":
      return {
        state: "unknown",
        eligible: null,
        measured: null,
        reasons: tool.reasons.length > 0 ? tool.reasons : [reason("unknown-eligibility")]
      };
    case "enumerated":
      return enumeratedHealth(tool, scope);
    default: {
      const unreachable: never = tool;
      return unreachable;
    }
  }
}

function enumeratedHealth(
  tool: Extract<ToolCoverage, { outcome: "enumerated" }>,
  scope: HealthScope
): ToolHealth {
  const measuredSet = new Set<string>();
  for (const path of tool.measuredPaths) {
    if (inScope(scope, path)) measuredSet.add(path);
  }
  const measured = measuredSet.size;
  if (tool.eligiblePaths === null) {
    return {
      state: "unknown",
      eligible: null,
      measured,
      reasons: [reason("unknown-eligibility")]
    };
  }
  const eligibleIn = new Set<string>();
  for (const path of tool.eligiblePaths) {
    if (inScope(scope, path)) eligibleIn.add(path);
  }
  const eligible = eligibleIn.size;
  if (eligible === 0) {
    return {
      state: "unmeasured",
      eligible: 0,
      measured,
      reasons: [reason("no-eligible")]
    };
  }
  const measuredPaths = new Set(tool.measuredPaths);
  const covered = [...eligibleIn].every((path) => measuredPaths.has(path));
  return {
    state: covered ? "complete" : "partial",
    eligible,
    measured,
    reasons: []
  };
}

function collectReasons(tools: Array<ToolHealth | undefined>): Reason[] {
  const reasons: Reason[] = [];
  for (const tool of tools) {
    if (!tool) continue;
    reasons.push(...tool.reasons);
  }
  return mergeReasons(reasons);
}

function reason(code: ReasonCode, text?: string): Reason {
  return text ? { code, text } : { code };
}

function mergeReasons(reasons: readonly Reason[]): Reason[] {
  const byCode = new Map<ReasonCode, Reason>();
  for (const item of reasons) {
    const existing = byCode.get(item.code);
    if (!existing) byCode.set(item.code, item);
    else if (!existing.text && item.text) byCode.set(item.code, item);
  }
  return REASON_CODES.flatMap((code) => {
    const item = byCode.get(code);
    return item ? [item] : [];
  });
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
