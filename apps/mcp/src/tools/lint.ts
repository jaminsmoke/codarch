// El informe del lint: el artefacto medido, sus totales y los hallazgos
// filtrados por ruta, regla y severidad.

import { readFileSync } from "node:fs";
import type { LintFinding, LintReportInput, LintReportResult } from "./types";
import { clampInteger, compareStrings, severityOrder } from "./helpers";
import { dirname, join, relative, sep } from "node:path";
import {
  LINT_ARTIFACT_FILE,
  LINT_ARTIFACT_FILE_LEGACY,
  lintRuleCounts,
  lintTotals,
  readLintArtifact,
  type LintArtifact,
  type LintSeverity,
  type LintSummary
} from "@codarch/lint/browser";
import { ArchitectureStore } from "../store";

export function getLintReport(
  store: ArchitectureStore,
  input: LintReportInput = {}
): LintReportResult {
  const limit = clampInteger(input.limit, 20, 1, 200);
  const target = input.path ? store.resolveTarget(input.path) : null;
  const scope = target ? target.path : "";
  // Un fichero se pide por su ruta; una carpeta, por lo que cuelga de ella.
  const isFile = target !== null && "id" in target;
  const inScope = (pathValue: string): boolean =>
    scope === "" ||
    (isFile ? pathValue === scope : pathValue.startsWith(`${scope}/`));

  const loaded = loadLintArtifact(store);
  const empty: LintSummary = { files: 0, errors: 0, warnings: 0, messages: 0 };
  if (!loaded) {
    return {
      available: false,
      file: null,
      tools: [],
      systems: [],
      summary: empty,
      scope,
      files: 0,
      total: 0,
      rules: [],
      findings: [],
      reason:
        "no hay lint medido en este repositorio; ejecuta codarch analyze para dejar .codarch/lint.cc.json"
    };
  }

  const { artifact, file } = loaded;
  const wanted = input.severity ?? "all";
  const findings: LintFinding[] = [];
  const keptMessages: Array<{ rule: string; severity: LintSeverity }> = [];
  let files = 0;

  for (const pathValue of Object.keys(artifact.files).sort(compareStrings)) {
    if (!inScope(pathValue)) continue;
    const entry = artifact.files[pathValue];
    if (!entry) continue;
    let kept = 0;
    for (const message of entry.messages) {
      if (input.rule && message.rule !== input.rule) continue;
      if (wanted !== "all" && message.severity !== wanted) continue;
      kept++;
      findings.push({
        path: pathValue,
        rule: message.rule,
        severity: message.severity,
        ...(message.line === undefined ? {} : { line: message.line }),
        ...(message.column === undefined ? {} : { column: message.column }),
        message: message.message
      });
      keptMessages.push({ rule: message.rule, severity: message.severity });
    }
    if (kept > 0) files += 1;
  }

  // La misma cuenta que la UI y el CLI: un `info` es un hallazgo, no deuda.
  const rules = lintRuleCounts(keptMessages);

  findings.sort(
    (left, right) =>
      severityOrder(left.severity) - severityOrder(right.severity) ||
      compareStrings(left.path, right.path) ||
      (left.line ?? 0) - (right.line ?? 0) ||
      (left.column ?? 0) - (right.column ?? 0) ||
      compareStrings(left.rule, right.rule) ||
      compareStrings(left.message, right.message)
  );

  return {
    available: true,
    file: projectPath(store.root, file),
    tools: [...artifact.meta.tools],
    systems: artifact.meta.systems.map((system) => ({
      ...system,
      ...(system.rules
        ? { rules: system.rules.map((rule) => ({ ...rule })) }
        : {})
    })),
    // Los totales salen de los mensajes, como en el CLI y en la app (ADR 0097);
    // la cobertura es la que declaró la pasada (ADR 0098).
    summary: lintSummaryOf(artifact),
    scope,
    files,
    total: findings.length,
    rules,
    findings: findings.slice(0, limit)
  };
}

/**
 * El resumen del artefacto, contado desde sus mensajes.
 *
 * No se copia `artifact.summary`: un artefacto de fuera puede traer cuentas que
 * no cuadren con sus mensajes, y entonces el MCP diría una cifra y la app otra.
 */
function lintSummaryOf(artifact: LintArtifact): LintSummary {
  const totals = lintTotals(artifact);
  return {
    files: totals?.files ?? 0,
    errors: totals?.errors ?? 0,
    warnings: totals?.warnings ?? 0,
    messages: totals?.findings ?? 0,
    ...(artifact.summary.measured === undefined
      ? {}
      : { measured: artifact.summary.measured })
  };
}

/** El artefacto del lint, con la ruta de la que salió: al lado del snapshot. */
function loadLintArtifact(
  store: ArchitectureStore
): { artifact: LintArtifact; file: string } | null {
  const beside = store.snapshotPath
    ? dirname(store.snapshotPath)
    : join(store.root, ".codarch");
  for (const base of [beside, join(beside, ".codarch")]) {
    for (const name of [LINT_ARTIFACT_FILE, LINT_ARTIFACT_FILE_LEGACY]) {
      const file = join(base, name);
      try {
        const artifact = readLintArtifact(
          JSON.parse(readFileSync(file, "utf8")) as unknown
        );
        if (artifact) return { artifact, file };
      } catch {
        // Se prueba el siguiente nombre; un artefacto ilegible es como no tenerlo.
      }
    }
  }
  return null;
}

/** Una ruta absoluta del lint, relativa al proyecto y con `/`. */
function projectPath(root: string, file: string): string {
  return relative(root, file).split(sep).join("/");
}
