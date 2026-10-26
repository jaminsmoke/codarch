---
title: The debt balance
date: "2026-10-26"
category: feature
verdict: fase
---

**What it was**: the change's debt was told in three places. A **Migration** section with the figures —debt `base → head`, FFI crossings, native files— and the files that moved up or down; **Hotspots** inside **Files**, with the ones that grew most in the report's metric; and **Deuda de migración** in the map's rail, a list with bars of the files that owed most, with no diff in front. They are readings of the same weight: debt is `(maxComplexity + 1) × (1 + fanIn)` per file, so it grows where complexity grows. To answer "why did the debt go up?" you had to read one section, look for the same files in another and, on the way, walk past the rail.

**What changed**: there is a **Debt balance** section, after Files, with the change's line of figures and two groups: **Debt diffs** —the files whose debt moved, rises first and falls after, with their `before → after` and a bar for how much, scaled to the group's largest— and **Hotspots**, with the report's metric and the same bar row, scaled to its own largest. The bars come from the rail, coloured by sign: red when debt rises, green when it falls. **Deuda de migración** leaves the rail: a single mouth for debt, and with the diff in front. **Most touched** leaves the rail too and moves into **Repo history**, next to the snapshots: it counts what the repo has done, not what the tree has right now, and the rail keeps the map's tools. **Files** is the plain list of added, modified and deleted again. Folded, the section says what matters: `debt 8.8k → 9k · 8 hotspots`. Without a migration lens it keeps only the hotspots, without inventing a debt of zero.

**Numbers**: the tab gains no sections —Migration leaves, Balance enters— and **Files** loses a group; **Repo history** gains one and the rail loses two, one of them with its component and its export. The bar CSS stays as `.mini-*`, shared by the short lists. The debt cut was a `slice(0, 6)` that kept quiet about what it left out: now it is six per direction and it says `+N more`. The report is unchanged.

**And it no longer hides**: with a clean tree the tab does not change shape. It says the tree matches its last commit and the four sections stay —**Files**, **Debt balance**, **New cycles** and **History**— with their titles and one line explaining each gap. History waits to know whether there are photos, so it does not show a gap that has rows a second later.

**Verdict**: [ADR 0078](../../adr/0071-0080/0078-el-balance-de-deuda.md), done. Checked in the served app: with changes, the rail without **Deuda de migración**, Files with its 32 files and no hotspots, the balance with its two groups, the bars scaled (100%, 67%, 31%, 4%) in both groups, the red and green of the sign, the `648 → 696 (+48)` values uncut, and the history with **Most touched** and its bars next to the snapshots; and with a clean tree, the four sections with their titles and messages, no values. The tests pin the split, the delta and its scale, the hotspots' own scale, the stable order of the most touched, both cuts and the cases without a lens.
