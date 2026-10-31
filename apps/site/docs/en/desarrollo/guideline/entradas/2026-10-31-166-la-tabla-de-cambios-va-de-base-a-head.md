---
title: "The Changes table goes from base to head"
date: "2026-10-31"
category: "feature"
verdict: "fase"
---

**What it was**: the report carried per-file deltas and counts, but not each metric's total in the base
and the head. Without them, Changes could not answer "what moved" without re-reading both snapshots in
the browser, and the table ADR 0071 asked for had been waiting since M49.

**What changes**: the diff computes `totals.metrics`: it sums additive metrics and takes the maximum of
those that already are a maximum —`MAX_METRICS`, which now lives in `@codarch/metrics` and is shared by
the sheets and the report—. Each entry carries base, head and delta; a metric one side does not declare
comes out `null` and invents no delta. The report goes up to **1.6** and a `1.5` is reconstructed with
`totals: null`. The Changes tab gains **Totals** between the summary and the files: one row per metric,
with the delta coloured by its direction; without the section, it is not painted.

**Why this way**: recalculating in the UI meant loading both full snapshots to read a summary; summing
complexities would state a figure that does not exist. The metric decides the aggregate, not the table.
And a section that was not measured stays quiet instead of showing zeros.

**Verified**: tests for the totals (sum, maximum, one-sided metric and determinism), for the delta and
for the `1.5` report; the table with and without totals; full suite green, clean typecheck, lint with no
errors and `site:build` with 287 pages.

**Verdict**: done. M52 closes and takes M49 with it.
