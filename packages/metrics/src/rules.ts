import { minimatch } from "minimatch";
import type {
  LayerConfig,
  RuleConfig,
  RuleConfigEntry,
  Severity
} from "./config";

export interface RuleFile {
  id: string;
  path: string;
  metrics: Record<string, number>;
}

export interface RuleEdge {
  fromId: string;
  toId: string;
  from: string;
  to: string;
}

export interface RuleCycle {
  size: number;
  nodes: Array<{ id: string; path: string }>;
}

export interface RuleInput {
  files: RuleFile[];
  edges: RuleEdge[];
  cycles: RuleCycle[];
}

export type ViolationType = "forbidden" | "threshold" | "cycles";

export interface RuleViolation {
  /** Clave estable para comparar base y head. */
  key: string;
  rule: string;
  type: ViolationType;
  severity: Severity;
  message: string;
  /** Rutas implicadas, solo para mostrar. */
  files: string[];
  edge?: {
    fromId: string;
    toId: string;
    from: string;
    to: string;
  };
  metric?: {
    name: string;
    value: number;
    min?: number;
    max?: number;
  };
  cycle?: {
    size: number;
    nodes: Array<{ id: string; path: string }>;
  };
}

export interface RuleReport {
  configured: boolean;
  summary: {
    layers: number;
    rules: number;
    introduced: number;
    existing: number;
    resolved: number;
    introducedErrors: number;
    introducedWarnings: number;
  };
  violations: {
    introduced: RuleViolation[];
    existing: RuleViolation[];
    resolved: RuleViolation[];
  };
}

export function emptyRuleReport(): RuleReport {
  return {
    configured: false,
    summary: {
      layers: 0,
      rules: 0,
      introduced: 0,
      existing: 0,
      resolved: 0,
      introducedErrors: 0,
      introducedWarnings: 0
    },
    violations: { introduced: [], existing: [], resolved: [] }
  };
}

/**
 * Evalúa las reglas contra base y head. Una violación solo es "introducida"
 * si no existía en base; una deuda técnica previa no bloquea un PR.
 */
export function evaluateRules(
  base: RuleInput,
  head: RuleInput,
  config: RuleConfig
): RuleReport {
  const baseViolations = evaluateInput(base, config);
  const headViolations = evaluateInput(head, config);
  const baseByKey = new Map(
    baseViolations.map((violation) => [violation.key, violation])
  );
  const headByKey = new Map(
    headViolations.map((violation) => [violation.key, violation])
  );

  const introduced: RuleViolation[] = [];
  const existing: RuleViolation[] = [];
  const resolved: RuleViolation[] = [];

  for (const [key, violation] of headByKey) {
    if (baseByKey.has(key)) existing.push(violation);
    else introduced.push(violation);
  }
  for (const [key, violation] of baseByKey) {
    if (!headByKey.has(key)) resolved.push(violation);
  }

  introduced.sort(compareViolations);
  existing.sort(compareViolations);
  resolved.sort(compareViolations);

  return {
    configured: true,
    summary: {
      layers: config.layers.length,
      rules: config.rules.length,
      introduced: introduced.length,
      existing: existing.length,
      resolved: resolved.length,
      introducedErrors: introduced.filter(
        (violation) => violation.severity === "error"
      ).length,
      introducedWarnings: introduced.filter(
        (violation) => violation.severity === "warn"
      ).length
    },
    violations: { introduced, existing, resolved }
  };
}

function evaluateInput(
  input: RuleInput,
  config: RuleConfig
): RuleViolation[] {
  const layers = layerIndex(input.files, config.layers);
  const violations: RuleViolation[] = [];

  for (const rule of config.rules) {
    if (rule.type === "forbidden") {
      evaluateForbidden(rule, input, layers, violations);
    } else if (rule.type === "threshold") {
      evaluateThreshold(rule, input, violations);
    } else {
      evaluateCycles(rule, input.cycles, violations);
    }
  }

  const byKey = new Map<string, RuleViolation>();
  for (const violation of violations) byKey.set(violation.key, violation);
  return [...byKey.values()].sort(compareViolations);
}

function layerIndex(
  files: readonly RuleFile[],
  layers: readonly LayerConfig[]
): Map<string, string> {
  const index = new Map<string, string>();
  for (const file of files) {
    for (const layer of layers) {
      if (
        layer.patterns.some((pattern) =>
          minimatch(file.path, pattern, { dot: true })
        )
      ) {
        index.set(file.id, layer.name);
        break;
      }
    }
  }
  return index;
}

function evaluateForbidden(
  rule: Extract<RuleConfigEntry, { type: "forbidden" }>,
  input: RuleInput,
  layers: Map<string, string>,
  violations: RuleViolation[]
): void {
  for (const edge of input.edges) {
    if (layers.get(edge.fromId) !== rule.from) continue;
    if (layers.get(edge.toId) !== rule.to) continue;

    violations.push({
      key: `forbidden:${rule.name}:${edge.fromId}->${edge.toId}`,
      rule: rule.name,
      type: "forbidden",
      severity: rule.severity,
      message:
        rule.message ?? `${edge.from} no puede depender de ${edge.to}`,
      files: [edge.from, edge.to],
      edge: {
        fromId: edge.fromId,
        toId: edge.toId,
        from: edge.from,
        to: edge.to
      }
    });
  }
}

function evaluateThreshold(
  rule: Extract<RuleConfigEntry, { type: "threshold" }>,
  input: RuleInput,
  violations: RuleViolation[]
): void {
  for (const file of input.files) {
    const value = file.metrics[rule.metric];
    if (typeof value !== "number" || !Number.isFinite(value)) continue;

    const tooHigh = rule.max !== undefined && value > rule.max;
    const tooLow = rule.min !== undefined && value < rule.min;
    if (!tooHigh && !tooLow) continue;

    const limit =
      tooHigh && rule.max !== undefined
        ? `máximo ${rule.max}`
        : `mínimo ${rule.min}`;
    violations.push({
      key: `threshold:${rule.name}:${file.id}`,
      rule: rule.name,
      type: "threshold",
      severity: rule.severity,
      message:
        rule.message ??
        `${file.path}: ${rule.metric} = ${value} (${limit})`,
      files: [file.path],
      metric: {
        name: rule.metric,
        value,
        ...(rule.min !== undefined ? { min: rule.min } : {}),
        ...(rule.max !== undefined ? { max: rule.max } : {})
      }
    });
  }
}

function evaluateCycles(
  rule: Extract<RuleConfigEntry, { type: "cycles" }>,
  cycles: readonly RuleCycle[],
  violations: RuleViolation[]
): void {
  for (const cycle of cycles) {
    const paths = cycle.nodes.map((node) => node.path);
    violations.push({
      key: `cycles:${rule.name}:${cycle.nodes
        .map((node) => node.id)
        .sort()
        .join("|")}`,
      rule: rule.name,
      type: "cycles",
      severity: rule.severity,
      message: rule.message ?? cycleMessage(paths),
      files: paths,
      cycle: {
        size: cycle.size,
        nodes: cycle.nodes.map((node) => ({ ...node }))
      }
    });
  }
}

function cycleMessage(paths: readonly string[]): string {
  const visible = paths.slice(0, 6);
  const suffix = paths.length > visible.length ? " → …" : "";
  return `Ciclo de ${paths.length} ficheros: ${visible.join(" → ")}${suffix}`;
}

function compareViolations(
  left: RuleViolation,
  right: RuleViolation
): number {
  return compareStrings(left.key, right.key);
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
