export function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

export function metricValue(
  metrics: Record<string, number>,
  key: string | null
): number {
  if (!key) return 0;
  return finiteNumber(metrics[key]) ?? 0;
}

export function sortRecord(
  values: Record<string, number>
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(values).sort(([left], [right]) => compareStrings(left, right))
  );
}

export function isUnder(filePath: string, prefix: string): boolean {
  return prefix === "" || filePath.startsWith(`${prefix}/`);
}

export function isUnderOrAt(filePath: string, prefix: string): boolean {
  return prefix === "" || filePath === prefix || isUnder(filePath, prefix);
}
