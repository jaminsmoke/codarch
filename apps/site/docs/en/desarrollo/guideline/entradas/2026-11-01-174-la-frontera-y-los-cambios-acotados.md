---
title: "The boundary and scoped Changes"
date: "2026-11-01"
category: "feature"
verdict: "fase"
---

**What it was**: M63 still had the folder's boundary and cycles open, and the
link that scopes Changes. The folder sheet already counted its metrics, its
duplication and its lint, but it did not say whether the folder is a module or a
mess: its edges were not split into inside and outside, and cycles were not
separated into those that close inside and those that cross it.

**What changes**: `boundary.ts` reads the map's graph and returns the boundary
—internal, incoming from outside and outgoing to outside, with the external
files and their edges— and the cycles —closing inside and crossing—. Two new
sections on the sheet, **Boundary** and **Cycles**, with their counts and a row
per outside file that opens its ficha. `scopeChangeFiles` filters the report by
folder, and the ficha gains a line with the touched files that opens **Changes**
scoped, with «See all» to clear it. M63 closes.

**Why this way**: cycles are counted by **closing edge**, which is all the
snapshot stores; the full cycle size is only known to the diff, and saying it
here would invent it, so the section writes that. The changes filter does not
duplicate the list or touch the report: it is the same section with another
selection, and the tab says what it is scoped to.

**Verified**: tests for `folderBoundary`, `folderCycles`, their sums and the
changes filter; typecheck, lint and vitest for `packages/ui`.

**Verdict**: done. M63 closes. M64 (the rest) stays open.
