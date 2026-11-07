import {
  LintError,
  canonicalLintPath,
  type LintArtifact,
  type LintMessage,
  type LintSeverity,
  type LintSystem
} from "./format";
import {
  REASON_CODES,
  scopeHealth,
  type CoverageHealth,
  type CoverageState,
  type HealthScope,
  type HealthSnapshot,
  type LintCounts,
  type LintDomain,
  type Reason,
  type ReasonCode,
  type RepoPath
} from "./health";
import { withinLintFolder } from "./rollup";

/**
 * La vista combinada del lint de código y del de documentos.
 *
 * Un solo sitio suma. Los artefactos no se reescriben y cada uno conserva su
 * `meta.tree`, su frescura y su cobertura. El riesgo no lee esta función.
 */

export interface FindingAnchor {
  /** El mapa cuyo árbol tiene el nodo. Los documentos viven en el resto. */
  map: "code" | "rest";
  path: RepoPath;
}

export interface ScopedFinding {
  path: RepoPath;
  domain: LintDomain;
  /** La herramienta que lo produjo, o las candidatas unidas si no se puede separar. */
  tool: string;
  /**
   * El artefacto no decía la herramienta del mensaje (eslint y oxlint
   * comparten fichero). Se infirió por el `ruleId`.
   */
  inferred: boolean;
  ruleId: string;
  severity: LintSeverity;
  line?: number;
  column?: number;
  message: string;
  /** Dónde puede abrir la UI el nodo. */
  anchor: FindingAnchor;
}

export type PathCoverageKind = "enumerated" | "legacy" | "unknown";

export interface DomainPathCoverage {
  path: RepoPath;
  domain: LintDomain;
  kind: PathCoverageKind;
  state: CoverageState;
  fresh: boolean | null;
  reasons: Reason[];
}

export type DomainApplicability = "applicable" | "not-applicable" | "unknown";

/** El dominio de un origen frente a la selección. No se funde con otro árbol. */
export interface SelectionDomain {
  domain: LintDomain;
  applicability: DomainApplicability;
  tree: string | null;
  fresh: boolean | null;
  coverage: CoverageHealth;
}

export interface OriginHealth {
  domain: LintDomain;
  /** `meta.tree` de este origen. No se mezcla con el del otro. */
  tree: string | null;
  fresh: boolean | null;
  coverage: CoverageHealth;
  counts: LintCounts;
  /**
   * `summary.measured` de un legado. No promueve la cobertura: con
   * `measured > 0` el estado sigue siendo `unknown`.
   */
  declaredMeasured: number | null;
}

export interface MergedAffectedFile {
  path: RepoPath;
  domain: LintDomain;
  tool: string;
  inferred: boolean;
  anchor: FindingAnchor;
  counts: LintCounts;
}

export interface MergedScopeHealth {
  scope: HealthScope;
  origins: OriginHealth[];
  /** Qué dominios entran en esta selección. Uno por origen, con su árbol. */
  domains: SelectionDomain[];
  /** Cobertura por dominio y por ruta canónica, dentro del ámbito. */
  paths: DomainPathCoverage[];
  counts: LintCounts;
  findings: ScopedFinding[];
  affectedFiles: MergedAffectedFile[];
  /**
   * Limpio solo si cada dominio aplicable está en `complete`, con `fresh`
   * true y cero hallazgos. Un legado o un `unknown` aplicable no lo es.
   */
  clean: boolean;
  /** No sube un legado ni un `unknown` a `complete`. */
  coverage: CoverageHealth;
  fresh: boolean | null;
}

const ZERO: LintCounts = {
  errors: 0,
  warnings: 0,
  info: 0,
  findings: 0,
  filesWithFindings: 0
};

/**
 * Salud de varios artefactos para un fichero, una carpeta o el proyecto.
 *
 * En la raíz no se recortan los documentos con las rutas del snapshot de
 * código: ese listado es otro árbol. En carpeta y fichero manda la ruta
 * canónica.
 */
export function scopeHealthMerged(
  artifacts: readonly (LintArtifact | null)[],
  scope: HealthScope,
  snapshot?: HealthSnapshot
): MergedScopeHealth {
  const resolved = resolveScope(scope);
  const present = artifacts.filter((artifact): artifact is LintArtifact => artifact !== null);
  const byOrigin = present.map((artifact) => collectFindings(artifact, resolved));
  const findings = byOrigin.flat().sort(compareFindings);
  const origins = present.map((artifact, index) =>
    originHealth(artifact, resolved, snapshot, byOrigin[index] ?? [], present)
  );
  const domains = present.map((artifact, index) =>
    selectionDomain(artifact, origins[index] as OriginHealth, resolved, snapshot)
  );
  const contributing = domains.filter((domain) => domain.applicability !== "not-applicable");
  const counts = origins.reduce((total, origin) => addCounts(total, origin.counts), {
    ...ZERO
  });

  return {
    scope: resolved,
    origins,
    domains,
    paths: present.flatMap((artifact, index) =>
      pathRows(artifact, resolved, origins[index] as OriginHealth, snapshot)
    ),
    counts,
    findings,
    affectedFiles: affectedFiles(findings),
    clean: isClean(contributing, counts.findings),
    coverage: aggregateCoverage(contributing),
    fresh: aggregateFresh(contributing)
  };
}

function originHealth(
  artifact: LintArtifact,
  scope: HealthScope,
  snapshot: HealthSnapshot | undefined,
  findings: readonly ScopedFinding[],
  others: readonly LintArtifact[]
): OriginHealth {
  const probed = scopeHealth(artifact, scope, probeSnapshot(artifact, snapshot));
  const fresh = originFreshness(artifact, snapshot, others);
  const reasons = mergeReasons([
    ...probed.coverage.reasons.filter((item) => item.code !== "freshness-unverified"),
    ...(isLegacy(artifact) ? [reason("legacy-version")] : []),
    ...(fresh === null ? [reason("freshness-unverified")] : [])
  ]);
  return {
    domain: domainOf(artifact),
    tree: artifact.meta.tree ?? null,
    fresh,
    coverage: {
      ...probed.coverage,
      // Un legado no hereda `summary.measured` como si se supiera el universo.
      ...(isLegacy(artifact) ? { state: "unknown", eligible: null, measured: null } : {}),
      reasons
    },
    counts: countsOf(findings),
    declaredMeasured: isLegacy(artifact) ? (artifact.summary.measured ?? null) : null
  };
}

function selectionDomain(
  artifact: LintArtifact,
  origin: OriginHealth,
  scope: HealthScope,
  snapshot: HealthSnapshot | undefined
): SelectionDomain {
  return {
    domain: origin.domain,
    applicability: applicabilityOf(artifact, scope, snapshot),
    tree: origin.tree,
    fresh: origin.fresh,
    coverage: origin.coverage
  };
}

/**
 * En el proyecto el origen entra entero. En carpeta o fichero, solo si alguna
 * ruta canónica suya cae en el ámbito. El listado de rutas del snapshot de
 * código no descarta documentos: solo dice si el código aplica a esa ruta.
 */
function applicabilityOf(
  artifact: LintArtifact,
  scope: HealthScope,
  snapshot: HealthSnapshot | undefined
): DomainApplicability {
  if (scope.kind === "project") return "applicable";
  if (canonicalPaths(artifact).some((path) => inScope(scope, path))) return "applicable";
  if (isLegacy(artifact) || universeUnknown(artifact)) {
    if (domainOf(artifact) === "code" && snapshot && codeSnapshotExcludes(scope, snapshot)) {
      return "not-applicable";
    }
    return "unknown";
  }
  return "not-applicable";
}

/**
 * El snapshot de código no contiene la ruta. No se usa para filtrar
 * documentos: el llamador solo llega aquí con un origen de código.
 */
function codeSnapshotExcludes(scope: HealthScope, snapshot: HealthSnapshot): boolean {
  const paths = snapshot.paths.map((path) => tryCanonical(path)).filter((path): path is string => path !== null);
  return !paths.some((path) => inScope(scope, path));
}

function pathRows(
  artifact: LintArtifact,
  scope: HealthScope,
  origin: OriginHealth,
  snapshot: HealthSnapshot | undefined
): DomainPathCoverage[] {
  const domain = domainOf(artifact);
  const rows = new Map<string, DomainPathCoverage>();
  const put = (path: string, kind: PathCoverageKind, state: CoverageState, reasons: Reason[]) => {
    if (!inScope(scope, path)) return;
    rows.set(`${domain}\u0000${path}\u0000${kind}`, {
      path,
      domain,
      kind,
      state,
      fresh: origin.fresh,
      reasons: mergeReasons(reasons)
    });
  };

  if (isLegacy(artifact)) {
    const reasons = [reason("legacy-version"), reason("legacy-global")];
    for (const path of findingPaths(artifact)) put(path, "legacy", "unknown", reasons);
    if (
      scope.kind === "file" &&
      applicabilityOf(artifact, scope, snapshot) !== "not-applicable"
    ) {
      const path = tryCanonical(scope.path) ?? scope.path;
      put(path, "legacy", "unknown", reasons);
    }
    return [...rows.values()].sort(compareRows);
  }

  const tools = artifact.coverage?.tools ?? {};
  for (const tool of Object.values(tools)) {
    if (tool.outcome !== "enumerated") continue;
    const eligible = tool.eligiblePaths;
    for (const raw of tool.measuredPaths) {
      const path = tryCanonical(raw);
      if (!path) continue;
      const known = eligible !== null;
      put(
        path,
        known ? "enumerated" : "unknown",
        known ? "complete" : "unknown",
        known ? [] : [reason("unknown-eligibility")]
      );
    }
  }
  return [...rows.values()].sort(compareRows);
}

function collectFindings(artifact: LintArtifact, scope: HealthScope): ScopedFinding[] {
  const domain = domainOf(artifact);
  const findings: ScopedFinding[] = [];
  for (const rawPath of Object.keys(artifact.files)) {
    const path = tryCanonical(rawPath);
    if (!path || !inScope(scope, path)) continue;
    const file = artifact.files[rawPath];
    if (!file) continue;
    for (const message of file.messages) {
      const attribution = attributeTool(artifact, message.rule);
      findings.push(findingOf(path, domain, attribution, message));
    }
  }
  return findings;
}

function findingOf(
  path: string,
  domain: LintDomain,
  attribution: { tool: string; inferred: boolean },
  message: LintMessage
): ScopedFinding {
  return {
    path,
    domain,
    tool: attribution.tool,
    inferred: attribution.inferred,
    ruleId: message.rule,
    severity: message.severity,
    ...(message.line !== undefined ? { line: message.line } : {}),
    ...(message.column !== undefined ? { column: message.column } : {}),
    message: message.message,
    anchor: { map: domain === "docs" ? "rest" : "code", path }
  };
}

/**
 * Si el artefacto nombra una sola herramienta, el mensaje es suyo. Si varias
 * comparten el fichero, la regla se busca en `meta.systems`. Una sola dueña
 * se marca inferida. Si varias podrían haberla escrito, no se duplica el
 * hallazgo: la herramienta junta las candidatas y sigue siendo inferida.
 */
function attributeTool(
  artifact: LintArtifact,
  ruleId: string
): { tool: string; inferred: boolean } {
  const declared = [...artifact.meta.tools].sort(compareStrings);
  if (declared.length === 1) return { tool: declared[0] ?? "", inferred: false };
  if (declared.length === 0) return { tool: "", inferred: false };

  const owners = ruleOwners(artifact.meta.systems, ruleId).filter((name) =>
    declared.includes(name)
  );
  if (owners.length === 1) return { tool: owners[0] ?? "", inferred: true };
  if (ruleId.startsWith("doc/") && declared.includes("codarch")) {
    return { tool: "codarch", inferred: false };
  }
  const prefixed = ruleId.startsWith("@") || ruleId.includes("/");
  if (prefixed && declared.includes("eslint") && !owners.includes("oxlint")) {
    return { tool: "eslint", inferred: true };
  }
  if (owners.length > 1) return { tool: owners.join("+"), inferred: true };
  return { tool: declared.join("+"), inferred: true };
}

function ruleOwners(systems: readonly LintSystem[], ruleId: string): string[] {
  const names = new Set<string>();
  for (const system of systems) {
    if (system.rules?.some((rule) => rule.id === ruleId)) names.add(system.name);
  }
  return [...names].sort(compareStrings);
}

function affectedFiles(findings: readonly ScopedFinding[]): MergedAffectedFile[] {
  const groups = new Map<string, ScopedFinding[]>();
  for (const finding of findings) {
    const key = `${finding.domain}\u0000${finding.path}\u0000${finding.tool}`;
    const group = groups.get(key);
    if (group) group.push(finding);
    else groups.set(key, [finding]);
  }
  return [...groups.entries()]
    .sort((left, right) => compareStrings(left[0], right[0]))
    .map(([, group]) => {
      const first = group[0] as ScopedFinding;
      return {
        path: first.path,
        domain: first.domain,
        tool: first.tool,
        inferred: first.inferred,
        anchor: first.anchor,
        counts: countsOf(group)
      };
    });
}

function countsOf(findings: readonly ScopedFinding[]): LintCounts {
  let errors = 0;
  let warnings = 0;
  let info = 0;
  const files = new Set<string>();
  for (const finding of findings) {
    files.add(`${finding.domain}\u0000${finding.path}`);
    if (finding.severity === "error") errors += 1;
    else if (finding.severity === "warn") warnings += 1;
    else info += 1;
  }
  return {
    errors,
    warnings,
    info,
    findings: errors + warnings + info,
    filesWithFindings: files.size
  };
}

function isClean(domains: readonly SelectionDomain[], findings: number): boolean {
  if (domains.length === 0 || findings !== 0) return false;
  return domains.every(
    (domain) =>
      domain.applicability === "applicable" &&
      domain.coverage.state === "complete" &&
      domain.fresh === true &&
      !domain.coverage.reasons.some(
        (item) => item.code === "legacy-version" || item.code === "legacy-global"
      )
  );
}

function aggregateCoverage(domains: readonly SelectionDomain[]): CoverageHealth {
  if (domains.length === 0) {
    return { state: "unmeasured", eligible: null, measured: null, byTool: {}, reasons: [] };
  }
  const reasons = mergeReasons(domains.flatMap((domain) => domain.coverage.reasons));
  const blocked = domains.some(
    (domain) =>
      domain.applicability === "unknown" ||
      domain.coverage.state === "unknown" ||
      domain.coverage.reasons.some(
        (item) => item.code === "legacy-version" || item.code === "legacy-global"
      )
  );
  if (blocked) {
    return {
      state: "unknown",
      eligible: null,
      measured: summed(domains, "measured"),
      byTool: {},
      reasons
    };
  }
  if (domains.every((domain) => domain.coverage.state === "complete")) {
    return {
      state: "complete",
      eligible: summed(domains, "eligible"),
      measured: summed(domains, "measured"),
      byTool: {},
      reasons: []
    };
  }
  if (domains.every((domain) => domain.coverage.state === "unmeasured")) {
    return {
      state: "unmeasured",
      eligible: summed(domains, "eligible"),
      measured: summed(domains, "measured"),
      byTool: {},
      reasons
    };
  }
  return {
    state: "partial",
    eligible: summed(domains, "eligible"),
    measured: summed(domains, "measured"),
    byTool: {},
    reasons
  };
}

function summed(
  domains: readonly SelectionDomain[],
  field: "eligible" | "measured"
): number | null {
  let total = 0;
  for (const domain of domains) {
    const value = domain.coverage[field];
    if (value === null) return null;
    total += value;
  }
  return total;
}

function aggregateFresh(domains: readonly SelectionDomain[]): boolean | null {
  if (domains.length === 0) return null;
  if (domains.some((domain) => domain.fresh === false)) return false;
  if (domains.some((domain) => domain.fresh === null)) return null;
  return true;
}

/**
 * La frescura se compara con el árbol de este origen.
 *
 * Si el snapshot es el del otro origen, no se marca este como viejo ni se
 * funden los dos `meta.tree`. Queda sin verificar.
 */
function originFreshness(
  artifact: LintArtifact,
  snapshot: HealthSnapshot | undefined,
  others: readonly LintArtifact[]
): boolean | null {
  const tree = artifact.meta.tree;
  if (!tree || !snapshot || snapshot.treeHash === null) return null;
  if (tree === snapshot.treeHash) return true;
  // El snapshot es el árbol de otro origen. No se declara viejo ni se funden.
  const ownedByAnother = others.some(
    (other) => other !== artifact && other.meta.tree === snapshot.treeHash
  );
  return ownedByAnother ? null : false;
}

/**
 * El probe solo recibe rutas cuando el snapshot es el árbol de este origen.
 * Una lista ajena —las del código, frente a un documento— no puede volver
 * `not-found` un fichero que ese origen sí midió.
 */
function probeSnapshot(
  artifact: LintArtifact,
  snapshot: HealthSnapshot | undefined
): HealthSnapshot | undefined {
  if (!snapshot || snapshot.treeHash === null || artifact.meta.tree !== snapshot.treeHash) {
    return undefined;
  }
  return { treeHash: snapshot.treeHash, paths: [...snapshot.paths] };
}

function canonicalPaths(artifact: LintArtifact): string[] {
  const paths = new Set<string>();
  for (const path of findingPaths(artifact)) paths.add(path);
  for (const tool of Object.values(artifact.coverage?.tools ?? {})) {
    if (tool.outcome !== "enumerated") continue;
    for (const path of tool.measuredPaths) {
      const canonical = tryCanonical(path);
      if (canonical) paths.add(canonical);
    }
    for (const path of tool.eligiblePaths ?? []) {
      const canonical = tryCanonical(path);
      if (canonical) paths.add(canonical);
    }
  }
  return [...paths];
}

function findingPaths(artifact: LintArtifact): string[] {
  const paths: string[] = [];
  for (const raw of Object.keys(artifact.files)) {
    const path = tryCanonical(raw);
    if (path) paths.push(path);
  }
  return paths;
}

function universeUnknown(artifact: LintArtifact): boolean {
  const tools = Object.values(artifact.coverage?.tools ?? {});
  if (tools.length === 0) return true;
  return tools.some((tool) => tool.outcome !== "enumerated" || tool.eligiblePaths === null);
}

function domainOf(artifact: LintArtifact): LintDomain {
  return artifact.domain ?? "code";
}

function isLegacy(artifact: LintArtifact): boolean {
  return (
    artifact.coverage?.legacy === true ||
    artifact.schemaVersion === "1.0" ||
    artifact.schemaVersion === "1.1" ||
    artifact.schemaVersion === "1.2"
  );
}

function resolveScope(scope: HealthScope): HealthScope {
  if (scope.kind === "project") return { kind: "project", path: "" };
  const path = tryCanonical(scope.path);
  return path ? { kind: scope.kind, path } : { kind: scope.kind, path: scope.path };
}

function inScope(scope: HealthScope, path: string): boolean {
  if (scope.kind === "project") return true;
  if (scope.kind === "file") return path === scope.path;
  return withinLintFolder(scope.path, path);
}

function tryCanonical(path: string): string | null {
  try {
    return canonicalLintPath(path);
  } catch (error) {
    if (error instanceof LintError) return null;
    throw error;
  }
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

function reason(code: ReasonCode): Reason {
  return { code };
}

function mergeReasons(reasons: readonly Reason[]): Reason[] {
  const byCode = new Map<ReasonCode, Reason>();
  for (const item of reasons) {
    if (!byCode.has(item.code)) byCode.set(item.code, item);
  }
  return REASON_CODES.flatMap((code) => {
    const item = byCode.get(code);
    return item ? [item] : [];
  });
}

function compareFindings(left: ScopedFinding, right: ScopedFinding): number {
  return (
    compareStrings(left.path, right.path) ||
    compareStrings(left.domain, right.domain) ||
    compareStrings(left.tool, right.tool) ||
    compareStrings(left.ruleId, right.ruleId) ||
    (left.line ?? Number.MAX_SAFE_INTEGER) - (right.line ?? Number.MAX_SAFE_INTEGER) ||
    (left.column ?? Number.MAX_SAFE_INTEGER) - (right.column ?? Number.MAX_SAFE_INTEGER) ||
    compareStrings(left.message, right.message)
  );
}

function compareRows(left: DomainPathCoverage, right: DomainPathCoverage): number {
  return (
    compareStrings(left.path, right.path) ||
    compareStrings(left.domain, right.domain) ||
    compareStrings(left.kind, right.kind)
  );
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
