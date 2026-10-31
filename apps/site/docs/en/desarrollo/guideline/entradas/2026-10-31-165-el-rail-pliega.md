---
title: "The rail folds and the guard demands it"
date: "2026-10-31"
category: "refactor"
verdict: "arreglo"
---

**What it was**: the four rail blocks —**View**, **Strata**, **Legend** and **Most rewritten**— kept
their heading loose in an `.eyebrow` and could not fold: on a short screen the map lost width for
nothing. And `sections.test.ts` only tested storage, so nothing forced a new section to declare a
title, a count and a summary.

**What changes**: all four are collapsible sections with their count and a short summary figure —View,
areas and colours; Strata, `rloc`; Legend, the figure of its mode; Most rewritten, symbols— and the
legend keeps its per-mode title ("Legend · lint", "Legend · risk"…). `sectionGuard` reads
`@codarch/ui`'s `.tsx` files and fails if a section does not declare `id`, `title`, `count` and
`summary`; symbol groups —their count is the summary— and sections without data (`section-empty`) are
left out by name. The guard found a real section without a summary, **New cycles**, which now says "no
new cycles" or "N new".

**Why this way**: a section that folds and says nothing when closed is a hidden section. The guard lives
in the package shared by the web and the desktop, so the check is not written twice or forgotten in one
of them.

**Verified**: full suite green, typecheck clean and `site:build` with 287 pages. Lint reports no errors;
a pre-existing warning remains in `packages/parsers/src/duplication.ts`.

**Verdict**: fix. M49 stays open for the base→head table (M52).
