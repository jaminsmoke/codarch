---
title: "The lenses, cross-checked"
date: "2026-10-31"
category: "refactor"
verdict: "arreglo"
---

**What it was**: every lens had its tests, but nobody checked that the snapshot said the same thing
through two paths. `fanOut` could count one thing and the same document's edges another; the symbols
summary could fail to add up its nodes; the checksum could depend on how the analysis was run. The
suspicion was reasonable and the only way to settle it was to measure the repo itself and cross the
figures.

**What changes**: a temporary auditor —outside the analysed tree and not committed— walks every lens
invariant on this repo: attributes only for existing nodes, a descriptor for each metric,
`dependencyLevel` equal in the metric and in the lens, `fanIn`/`fanOut` equal to the edge sum, symbols
and their summary, structure only for files, migration debt, languages and statuses, duplication sums
and copies, and the `cc.json` round trip.

Three things came out of it:

| Finding | What was done |
|---|---|
| `fanIn`/`fanOut` counted **unique neighbours** while edges count **imports**: a file with two `import`s of the same module said 9 where the lens said 10 | They now sum the edge weight; the graph test pins that two imports of the same target weigh two |
| The checksum changes with and without `git`, because the history lens is part of it | **Open**: the browser has no git, so its checksum does not match the CLI's. This needs a model decision, not a patch |
| Folder metrics do not travel in `attributes`; they are aggregated on read | Verified: the UI already does exactly that; the lens is not broken |

The copied blocks the first measurement found were also removed: the `schema` and `lint` entries now
share a surface (`shared.ts`), the web's `reader.ts` uses the parser's `DEFAULT_EXTENSIONS` instead of
its own copy, the four `InspectorBar` icons share an SVG frame, the profile catalog is projected once
in `@codarch/metrics`, and `history` and `scopes` share the argument loop.

**Why this way**: auditing is not reading the code, it is checking that two readings of the same fact
agree. The auditor lives outside the repo on purpose: it is neither product nor installed, and its only
output is the figures. What fails is fixed in the lens that lies —the graph— and what needs a model
decision is written down instead of papered over.

**Verified**: whole suite green (**174 files and 1509 tests**), typecheck and lint clean and the site
builds. The auditor is green on everything except the checksum with and without git, which is the open
finding. With the duplication removed, this repo measures **626 files**, **1,839 duplicated lines** and
**466 repeated** —3 % of `rloc`— in **2 pairs**: the two `main.tsx` files, which differ only in a
comment, and the `history` and `scopes` arguments at 43 %. The Go, Java and Python analyzers still
share a skeleton below the pair threshold: that is the next lens to improve, not a literal copy.

**Verdict**: fix, with a model decision pending on the checksum between environments.
