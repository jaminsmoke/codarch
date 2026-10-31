---
title: "The MCP store, by trade"
date: "2026-10-31"
category: "refactor"
verdict: "arreglo"
---

**What it was**: `apps/mcp/src/store.ts` had **869 lines**, 55 functions and nine trades: the contract —the
query types and `McpDataError`—, the metric keys and the composite risk, the snapshot files, the folders
with their totals, the edges and their two indexes, the cycles by strongly connected component —iterative
Kosaraju—, the paths with their normalization and suggestions, the indexed report with its change queries
and reading from disk with the precedence of the two reports (ADR 0101). A single class did all of it, with
twenty-four private fields and methods calling each other across the file. It was the **first in the repo
by debt**: 336.

**What changes**: `store.ts` is down to **212 lines** with the class and the wiring; each trade lives in
its sibling module, prefixed with the store's name so it is clear what they belong to:

| Module | What it is |
|---|---|
| `store-types.ts` | the contract: error, file, folder, edge, violation, report state, options and summary |
| `store-shared.ts` | the stable order, number reading and path prefixes all of them share |
| `store-files.ts` | the snapshot's metric keys, the files with their risk and their rank by risk |
| `store-folders.ts` | the folders with their totals, their maximum and their children |
| `store-edges.ts` | the edges deduplicated per pair and the incoming and outgoing indexes |
| `store-cycles.ts` | the execution cycles and Kosaraju with its explicit stack (ADR 0037) |
| `store-paths.ts` | normalizing a path, resolving a file or folder and suggesting when there is none |
| `store-report.ts` | the indexed report and the queries: state, counts, hotspots and violations |
| `store-load.ts` | reading the snapshot and an explicit report, with the error that says what is missing |

Dependencies go one way: `store.ts` wires the phases; the rest read `store-types` and `store-shared`, and
nobody looks up. `store.ts` still re-exports the contract and `loadArchitectureStore`, so `index.ts`,
`server.ts`, the twelve queries in `tools/` and the fixtures do not change a single line.

**Why this way**: the store is the read-only door the MCP opens onto a snapshot and a report; everything an
agent asks goes through it, and it was written as a class with nine jobs and mutable state spread across
private maps. Splitting changes no logic: the comments that explain each rule travel with their function —
the type-only edge that does not close a cycle, the self-loop, the HEAD report's precedence—, and each piece
can be read without the other eight in front of it. The class keeps what is truly its own: the indexes, the
public surface and the four loading decisions.

**Verified**: the whole suite green —**173 files and 1497 tests**, the 52 MCP ones among them—, with
`store.test.ts` pinning the default load, the HEAD report precedence, the two roots and type-only cycles,
and `mcp.test.ts` walking the twelve queries. Typecheck and lint clean. The file's debt drops from **336 to
256** and it stops being the repo's first; its worst `maxComplexity` drops from 20 to 15. There are no new
tests because there is no new behavior: the split moves code, not rules.

**Verdict**: fix.
