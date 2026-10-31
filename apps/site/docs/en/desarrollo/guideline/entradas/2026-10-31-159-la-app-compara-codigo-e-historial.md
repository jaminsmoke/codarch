---
title: "The app compares code and history"
date: "2026-10-31"
category: "fix"
verdict: "arreglo"
---

**What it was**: the snapshot checksum started depending only on code (M72), and churn stayed in its
own `historyChecksum`. But the app and the live still compared **only the former**. A new commit with
no code changes did not move the checksum, so the live did not rewrite the snapshot and the app did not
warn: the map showed the old heat even though the analysis had measured the new one. Treating the two
checksums as one left reopening the view on every commit as the only alternative.

**What changes**: `snapshotRelation` (schema) classifies two snapshots as `same`, `heat` or `tree`. The
app warns of a refresh if code **or** history changed, without touching the view; the desktop rewrites
the snapshot when either changed, and only skips it when both are equal. The project band adds
"without history" when `meta.historyChecksum` is missing. The MCP returns `checksum` and
`historyChecksum` in the summary, the map and the module card, and says what each one means.

**Why this way**: the comparison is one function, not two similar ones in the app and the desktop.
History changes without code changing, and heat is part of the data: refreshing it is not opening
another project (ADR 0103, ADR 0056). The "without history" notice tells a snapshot measured without git
apart from one measured with git; without it, the band let you believe the heat came from commits.

**Verified**: tests for `snapshotRelation` (same snapshot, new heat, another tree, no history), for the
hook (same code with another history warns; with the same history it does not), for the desktop (it
does not take the same code with another history as saved) and for the MCP (the summary carries both
hashes). Whole suite green (**176 files and 1524 tests**), typecheck and lint clean and the site's
287 pages.

**Verdict**: fix. M74 closes ADR 0103.
