import fs from "node:fs";
import path from "node:path";
import type { RecommendedRule } from "./recommended";
import { recommendedRules } from "./recommended";
import { listLintRules } from "./rule-catalog";

/**
 * Recomendaciones generales más las que tienen sentido para este proyecto
 * (ADR 0112). No se adivinan reglas: si el catálogo de la herramienta está
 * disponible, las extra se filtran contra él.
 */
export interface ProjectSignals {
  react: boolean;
  vue: boolean;
  svelte: boolean;
  vitest: boolean;
  jest: boolean;
  typescript: boolean;
}

export async function recommendationsForProject(
  root: string,
  systems: readonly string[]
): Promise<Record<string, RecommendedRule[]>> {
  const signals = detectProjectSignals(root);
  const result: Record<string, RecommendedRule[]> = {};
  for (const system of systems) {
    const base = [...recommendedRules(system)];
    const extra = extraFor(system, signals);
    const filtered =
      extra.length === 0
        ? []
        : await filterKnown(root, system, extra);
    const byId = new Map<string, RecommendedRule>();
    for (const rule of [...base, ...filtered]) {
      if (!byId.has(rule.id)) byId.set(rule.id, rule);
    }
    result[system] = [...byId.values()];
  }
  return result;
}

export function detectProjectSignals(root: string): ProjectSignals {
  const dependencies = packageDependencies(root);
  const has = (name: string): boolean => name in dependencies;
  return {
    react: has("react") || has("next"),
    vue: has("vue") || has("nuxt"),
    svelte: has("svelte") || has("@sveltejs/kit"),
    vitest: has("vitest"),
    jest: has("jest"),
    typescript: has("typescript")
  };
}

function packageDependencies(root: string): Record<string, unknown> {
  try {
    const raw: unknown = JSON.parse(
      fs.readFileSync(path.join(root, "package.json"), "utf8")
    );
    if (typeof raw !== "object" || raw === null) return {};
    const pkg = raw as {
      dependencies?: unknown;
      devDependencies?: unknown;
    };
    return {
      ...(isRecord(pkg.dependencies) ? pkg.dependencies : {}),
      ...(isRecord(pkg.devDependencies) ? pkg.devDependencies : {})
    };
  } catch {
    return {};
  }
}

function extraFor(
  system: string,
  signals: ProjectSignals
): RecommendedRule[] {
  const extra: RecommendedRule[] = [];
  if (signals.react && system === "eslint") {
    extra.push(
      { id: "react/jsx-key", severity: "error" },
      { id: "react-hooks/rules-of-hooks", severity: "error" },
      { id: "react-hooks/exhaustive-deps", severity: "warn" }
    );
  }
  if (signals.react && system === "oxlint") {
    extra.push(
      { id: "react/jsx-key", severity: "error" },
      { id: "react/rules-of-hooks", severity: "error" }
    );
  }
  if (signals.typescript && system === "eslint") {
    extra.push({ id: "@typescript-eslint/no-explicit-any", severity: "warn" });
  }
  if (signals.vitest && system === "eslint") {
    extra.push({ id: "vitest/expect-expect", severity: "warn" });
  }
  if (signals.jest && system === "eslint") {
    extra.push({ id: "jest/expect-expect", severity: "warn" });
  }
  return extra;
}

async function filterKnown(
  root: string,
  system: string,
  rules: readonly RecommendedRule[]
): Promise<RecommendedRule[]> {
  try {
    const catalog = await listLintRules(root, system);
    const known = new Set(catalog.groups.flatMap((group) => group.rules));
    if (known.size === 0) return [];
    return rules.filter((rule) => known.has(rule.id));
  } catch {
    return [];
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
