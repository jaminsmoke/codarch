/** Las métricas que se enseñan primero, en este orden ✓. */
const PREFERRED_METRICS = [
  "rloc",
  "loc",
  "migrationDebt",
  "ffiCrossings",
  "maxComplexity",
  "maxFunctionLength",
  "functions",
  "fanIn",
  "fanOut",
  "number_of_commits",
  "number_of_authors"
];

/** Ordena las métricas del snapshot: primero las preferidas ✓. */
export function orderedMetrics(names: Iterable<string>): string[] {
  const coverage = new Set(names);
  const preferred = PREFERRED_METRICS.filter((key) => coverage.has(key));
  const rest = [...coverage]
    .filter((key) => !preferred.includes(key))
    .sort((left, right) => left.localeCompare(right));
  return [...preferred, ...rest];
}
