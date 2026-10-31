---
title: "The analysis core, by trade"
date: "2026-10-31"
category: "refactor"
verdict: "arreglo"
---

**What it was**: `packages/parsers/src/analyze-core.ts` had 1059 lines and five trades: the pass contract
(options, result and progress), the state filled while walking, the walk that measures each file and its
parse cache, import resolution —four families, one per language— and the deferred resolution of C# `using`s,
plus the three passes that apply churn, graph and migration. All under the same `export`, with private
functions calling each other across a thousand lines.

**What changes**: the file is down to 203 lines and orders phases; each trade lives in `analyze/`:

| Module | What it is |
|---|---|
| `analyze/types.ts` | what goes in and what comes out: options, result, progress, warnings |
| `analyze/state.ts` | the pass state and its empty constructor |
| `analyze/measure.ts` | read, parse and record each file, with the cache (ADR 0056) |
| `analyze/links.ts` | from an import to an edge, an FFI crossing, a dependency or a break (ADR 0090) |
| `analyze/namespaces.ts` | C# `using`s, closed at the end |
| `analyze/apply.ts` | churn, graph and migration over the metrics already measured |

Dependencies go one way: `analyze-core` wires; `measure` uses `links` and `namespaces`; nobody looks up.

**Why this way**: `analyze-core.ts` is the heart of the product —the one that decides the checksum— and it
was written as a single function with branches per language. Splitting changes no line of logic: the comments
that explain each rule travel with their function, and the orchestrator reads as the list of phases it is.
The `using` rule also gains tests of its own, because it is the piece resolved late and the one that breaks
quietly most easily: its eight cases pin down the three questions (does anyone declare it? is the root the
repo's? is it platform?) without building a whole C# project.

**Verified**: the whole suite green —**173 files and 1497 tests**, were 1489— alongside the usual determinism
tests (`tree.test.ts` compares file by file against the repository itself) and the end-to-end ones for C#,
Go, Java and Python. Typecheck and lint clean, and the browser bundle builds just the same.

**Verdict**: fix.
