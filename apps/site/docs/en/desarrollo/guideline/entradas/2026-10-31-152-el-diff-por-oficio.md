---
title: "The diff, by trade"
date: "2026-10-31"
category: "refactor"
verdict: "arreglo"
---

**What it was**: `packages/metrics/src/diff.ts` had 883 lines and eight trades: the report contract,
the indexing of each `cc.json`, the comparison of files and their metrics, the one for edges, the cycles
by strongly connected component —iterative Kosaraju, with its explicit stack—, the migration report, the
hotspots and the translation to the rules engine. `diffSnapshots` called twenty-three private helpers
spread across the file, and it had been the fourth file by debt since the map's first day.

**What changes**: the file is down to 122 lines and only wires; each trade lives in its sibling module:

| Module | What it is |
|---|---|
| `diff-types.ts` | the contract: summary, file, metric change, edge, cycle, migration, hotspot, report, options |
| `diff-index.ts` | an indexed `cc.json`: paths by id, nodes in order and edges aggregated per pair |
| `diff-files.ts` | additions, removals and metric changes, plus each side's summary |
| `diff-edges.ts` | edges that appear and disappear, and which ones close a cycle (ADR 0037) |
| `diff-cycles.ts` | each side's cycles and the difference between the two |
| `diff-migration.ts` | migration debt with its before and after |
| `diff-hotspots.ts` | the files where the chosen metric went up |
| `diff-rules.ts` | the index translated into what the rules engine asks for |
| `diff-shared.ts` | the stable order and number reading all of them share |

Dependencies go one way: `diff.ts` wires; the rest read `diff-types` and `diff-shared`; nobody looks up.
`diff.ts` still re-exports the contract —`IndexedSnapshot` included, used by `symbol-diff` and `report`—,
so the package index, the browser entry and old reports do not change a single line.

**Why this way**: the diff is the piece that decides what gets commented on a PR, and it was written as
one function with twenty-three helpers calling each other across the file. Splitting changes no logic: the
comments that explain each rule travel with their function, and any part can now be read —or tested—
without the other seven. Kosaraju and migration were the two heaviest and the least touched; they live
apart with the same code.

**Verified**: the whole suite green —**173 files and 1497 tests**— with `diff.test.ts` pinning determinism,
cycles and null deltas, and the CLI's server/desktop parity comparing both reports character by character.
Typecheck and lint clean.

**Verdict**: fix.
