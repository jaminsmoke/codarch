---
title: "Risk has an owner and the rest has strata"
date: "2026-10-31"
category: "feature"
verdict: "fase"
---

**What it was**: the folder and project table named the owner of the maximum complexity, but not of
risk, so a risk maximum could not be acted on. And in the rest rail the kinds only showed in the legend
when the colour was `kind`: to know how much documentation, configuration and assets there was, you had
to change the map's colour.

**What changes**: **Metrics** in folder and project gains **Risk max.**, with the file that has it and a
note with its path; the row can be pressed and paints the map by risk, like the file's row. The rest rail
gains **Strata** by kind: the bar, its legend and the file count, without touching the colour.

**Why this way**: a maximum without an owner does not say what to fix, and the kinds were already
measured: they just were not always shown. The risk row uses the same 0–100 scale as the file sheet, and
the rest's aggregate invents no kind that has no files.

**Verified**: full suite green with the tests for the risk owner and the kind strata, clean typecheck,
lint with no errors and `site:build` with 287 pages.

**Verdict**: done. M63 still has frontier and cycles, grouped rules, scoped changes and the MCP; M64 has
the rest's rules.
