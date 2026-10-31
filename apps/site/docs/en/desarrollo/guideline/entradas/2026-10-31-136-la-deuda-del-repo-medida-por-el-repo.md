---
title: "The repo's debt, counted by the repo"
date: "2026-10-31"
category: "refactor"
verdict: "arreglo"
---

**What it was**: running the analysis through CodArch itself found two things. One rule of our own
`.codarch.yml` —`complejidad-maxima`, 40— was broken by the repo that declares it: `describeSystem` in
`packages/lint/src/project.ts` measured **41**, with seven tools dispatched by hand inside one
function. And in Métricas, `inCycle`, `cycleSize`, `ffiCrossings` and `unresolvedImports` read **0** —
correctly measured, 504 of 504 files— yet the sheet said «máximo del subárbol en
`apps/cli/src/args/analyze.ts`»: it named the first file carrying a zero as if the maximum lived there.
The zero was true; the owner was made up.

**What changes**: `project.ts` has one reader per system —`describeEslint`, `describeOxlint`,
`describeBiome`, `describeRuff`, `describeCheckstyle`— behind a dispatch by name, and the shared record
—name, config and the detector's note— is built once. The repo's worst `maxComplexity` drops from **41
to 33** and the 40 rule holds again. And a maximum measured at zero no longer has an owner: the row
stays at `0` and its tooltip says «el máximo del subárbol es 0», naming no file. Same for the
complexity row when the snapshot does not carry it as a metric.

**Why this way**: a measure the repo demands of itself is not passed by raising the threshold, it is
paid by lowering the figure; and a measured zero is a datum, but lending it a file turns it into a claim
nobody checked. Each system's reader fits in one head: ESLint's has no reason to share conditions with
Checkstyle's.

**Verified**: the parser's per-symbol measurement gives 41 in `describeSystem` before and 33 in
`detectLintSystems` after; `analyze` over the repo writes the snapshot with that 33 and lint stays at
**0 files with findings out of 495 measured**, signed with the tree. New tests that a maximum of zero
names no file and that its tooltip says so. Typecheck, lint and the full suite green.

**Verdict**: fix.
