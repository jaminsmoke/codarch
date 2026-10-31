---
title: "Lint says which tree it measured"
date: "2026-10-31"
category: "fix"
verdict: "arreglo"
---

**What it was**: the project sheet said `0 ficheros con hallazgos · score 0` and there was no way to tell whether the repo was clean or whether nobody had looked. The artifact kept only the files **with** findings —clean ones vanished— and its `meta.checksum` is the hash of its own content, not the tree's: a `lint.cc.json` from another session read as if it were the one on screen. In this repo the measurement *was* clean —`eslint .` over 494 files and `oxlint .` over 539, both with no message—, but the file did not prove it. The same review found more divergences: the per-file risk read the artifact's **declared** counts while the sheets counted **messages**; `--fail-on` decided with the declared summary and the report printed the messages, as did the MCP `summary`; and the map dock and Settings each had their own list of colours. The lint lens, pending since ADR 0094, did not exist either.

**What changes**: the artifact goes up to **1.2**. `summary.measured` says how many files were looked at, clean ones included, and `meta.tree` keeps the checksum of the snapshot that was measured, filled by `serve` and live —a standalone `codarch lint` does not analyse and does not make it up—. The sheet shows `N files with findings out of M measured` and warns **«Este lint es de otro árbol»** when it does not match the map. `serve` with live measures at boot, not only on save. And the **Lint** lens arrives: each file is painted with its debt (errors + ¼ warnings) over the map's maximum, with its legend and a notice when there is no artifact, chosen in **COLOUR** like the rest. There is a single colour list for the dock and Settings, and the per-file count, `--fail-on` and the MCP `summary` all come from `lintTotals` and `lintFileCounts`, the same ones the sheets use.

**Why this way**: a zero without provenance is not data. With the coverage and the tree, the same zero says "494 were looked at and there is nothing", which is what we wanted to know. And two ways of counting the same thing end up giving two figures: the count lives in one place and consumers read it.

**Verified**: `eslint .` with 494 files and 0 messages, `oxlint .` with 0 warnings and 0 errors, `eslint -c eslint.config.types.js .` clean; this repo's artifact, written by live, with `measured` and `tree`. Tests for the lens in render and in the app, for coverage and provenance in the sheet, for the queue carrying its tree, for the MCP with an artifact of inflated counts —the summary comes from the messages— and for the CLI with "of N measured". Typecheck, lint and suites green.

**Verdict**: fix.
