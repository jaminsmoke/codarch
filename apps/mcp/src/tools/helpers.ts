// Las piezas pequeñas que comparten las herramientas: recortar una ruta,
// ordenar dos cadenas, acotar un límite que llega de fuera.

import type { LintSeverity } from "@codarch/lint/browser";

export function parentPath(pathValue: string): string {
  const index = pathValue.lastIndexOf("/");
  return index === -1 ? "" : pathValue.slice(0, index);
}

export function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}

export function clampInteger(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

export function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function severityOrder(severity: LintSeverity): number {
  return severity === "error" ? 0 : severity === "warn" ? 1 : 2;
}
